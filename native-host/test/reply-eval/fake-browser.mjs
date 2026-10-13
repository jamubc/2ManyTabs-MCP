// A stand-in browser for reply evals: connects to the host's bridge like the extension does and
// serves the tabs in a snapshot_tabs record, with ages kept relative to when it was taken.
// Usage: node fake-browser.mjs PORT RECORD.json LOG.jsonl
import fs from 'node:fs';
import { WebSocket } from 'ws';

const [port, recordPath, logFile] = process.argv.slice(2);
const rec = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
const taken = Date.parse(rec.taken_at);
const now = Date.now();
let nextId = 1;
let tabs = rec.windows.flatMap((w, wi) => w.tabs.map((t, ti) => ({
  id: nextId++, windowId: wi + 1, index: ti, title: t.title, url: t.url, pinned: !!t.pinned,
  lastAccessed: t.lastAccessed ? now - (taken - Date.parse(t.lastAccessed)) : undefined,
})));

const log = (x) => fs.appendFileSync(logFile, JSON.stringify(x) + '\n');

function connect() {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/?browser=firefox&instance=ff_eval`, { origin: 'moz-extension://reply-eval' });
  ws.on('message', (raw) => {
    const msg = JSON.parse(raw);
    if (msg.type) return;
    log({ action: msg.action, n: msg.tab_ids?.length ?? msg.urls?.length });
    let result = {};
    if (msg.action === 'query_tabs') result = tabs;
    else if (msg.action === 'query_groups') result = [];
    else if (msg.action === 'close_tabs') {
      const ids = new Set(msg.tab_ids);
      result = { closed: tabs.filter((t) => ids.has(t.id)).length };
      tabs = tabs.filter((t) => !ids.has(t.id));
    } else if (msg.action === 'open_tabs') result = { opened: msg.urls.length };
    else if (msg.action === 'group_tabs') result = { groupId: 7 };
    ws.send(JSON.stringify({ id: msg.id, result }));
  });
  ws.on('error', () => {});
  ws.on('close', () => setTimeout(connect, 300));
}
connect();
