import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { matchesQuery } from './tabs.js';

// A record of open tabs, written before anything closes. Records live only in the per-user
// app-data folder; callers never choose the path, so text from a web page cannot redirect a write.

const NAME_RE = /^tabs-\d{8}-\d{6}(-\d+)?\.json$/;
const REOPENABLE = /^(https?|file):/i;

export function snapshotDir(env = process.env, platform = process.platform, home = os.homedir()) {
  if (env.MANYTABS_SNAPSHOT_DIR) return env.MANYTABS_SNAPSHOT_DIR;
  if (platform === 'darwin') return path.join(home, 'Library', 'Application Support', '2manytabs', 'snapshots');
  if (platform === 'win32') return path.join(env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), '2manytabs', 'snapshots');
  return path.join(env.XDG_STATE_HOME || path.join(home, '.local', 'state'), '2manytabs', 'snapshots');
}

export function buildRecord(tabs, groups = [], now = new Date()) {
  const groupTitle = new Map(groups.map((g) => [`${g.browser}:${g.id}`, g.title || `Group ${g.id}`]));
  const windows = new Map();
  for (const t of [...tabs].sort((a, b) => (a.index ?? 0) - (b.index ?? 0))) {
    const key = `${t.browser ?? ''}:${t.windowId}`;
    if (!windows.has(key)) windows.set(key, { browser: t.browser ?? null, window: t.windowId, tabs: [] });
    const hasGroup = t.groupId !== undefined && t.groupId !== -1;
    windows.get(key).tabs.push({
      title: t.title ?? '',
      url: t.url ?? '',
      pinned: !!t.pinned,
      group: hasGroup ? (groupTitle.get(`${t.browser}:${t.groupId}`) ?? `Group ${t.groupId}`) : null,
      lastAccessed: typeof t.lastAccessed === 'number' ? new Date(t.lastAccessed).toISOString() : null,
    });
  }
  return { taken_at: now.toISOString(), tab_count: tabs.length, windows: [...windows.values()] };
}

function stamp(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export function writeRecord(record, dir, now = new Date()) {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const base = `tabs-${stamp(now)}`;
  for (let i = 0; ; i++) {
    const name = i ? `${base}-${i}.json` : `${base}.json`;
    const file = path.join(dir, name);
    try {
      // 'wx' never overwrites an earlier record; 0600 because this is browsing history.
      fs.writeFileSync(file, JSON.stringify(record, null, 1), { flag: 'wx', mode: 0o600 });
      return { name, path: file };
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
  }
}

// Oldest first. Same-second records carry -1, -2…, which plain string order would put first.
export function listRecords(dir) {
  const order = (n) => {
    const [, stampPart, suffix] = n.match(/^(tabs-\d{8}-\d{6})(?:-(\d+))?\.json$/);
    return [stampPart, Number(suffix ?? 0)];
  };
  try {
    return fs.readdirSync(dir).filter((n) => NAME_RE.test(n)).sort((a, b) => {
      const [sa, na] = order(a), [sb, nb] = order(b);
      return sa < sb ? -1 : sa > sb ? 1 : na - nb;
    });
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

export function readRecord(dir, name) {
  const names = listRecords(dir);
  if (!names.length) throw new Error('No tab record has been saved yet. Call snapshot_tabs first.');
  const pick = name ?? names[names.length - 1];
  if (!NAME_RE.test(pick)) throw new Error(`"${pick}" is not a record name. Use a name like ${names[names.length - 1]}.`);
  if (!names.includes(pick)) throw new Error(`No record named ${pick}. Newest: ${names[names.length - 1]}.`);
  return { name: pick, record: JSON.parse(fs.readFileSync(path.join(dir, pick), 'utf8')) };
}

// Tabs in the record that are no longer open, optionally narrowed by a title/URL substring.
// One entry per URL, keeping the browser the tab came from.
export function reopenCandidates(record, liveTabs, match) {
  const open = new Set(liveTabs.map((t) => t.url));
  const seen = new Set();
  const out = [];
  for (const w of record.windows ?? []) {
    for (const t of w.tabs ?? []) {
      if (!REOPENABLE.test(t.url) || open.has(t.url) || seen.has(t.url)) continue;
      if (match && !matchesQuery(t, match)) continue;
      seen.add(t.url);
      out.push({ browser: w.browser, title: t.title, url: t.url });
    }
  }
  return out;
}
