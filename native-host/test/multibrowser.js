// Multi-browser test: multiple browser extensions (Chrome, Firefox) connect
// simultaneously, aggregate tabs, and route actions without collision.
// Run on a scratch port:
//   MANYTABS_BRIDGE_PORT=19878 node test/multibrowser.js

import { WebSocket } from 'ws';
import { startBridge, callExtension, isExtensionConnected, bridgeStatus } from '../bridge.js';

const PORT = Number(process.env.MANYTABS_BRIDGE_PORT) || 9876;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const assert = (cond, msg) => { console.error(cond ? '  ✓' : '  ✗', msg); if (!cond) failures++; };

startBridge();
await sleep(300);
assert(bridgeStatus().role === 'owner', 'lone host became OWNER');

const chromeTabsExtra = [];

// 1. Connect Chrome extension
const chromeExt = new WebSocket(`ws://127.0.0.1:${PORT}/?browser=chrome&name=Chrome&instance=chrome_inst`, {
  origin: 'chrome-extension://mock-chrome-id',
});

chromeExt.on('message', (raw) => {
  const msg = JSON.parse(raw);
  if (msg.action === 'query_tabs') {
    chromeExt.send(JSON.stringify({
      id: msg.id,
      result: [
        { id: 10, title: 'Google', url: 'https://google.com', windowId: 1 },
        { id: 11, title: 'CNN', url: 'https://cnn.com', windowId: 1 },
        ...chromeTabsExtra,
      ],
    }));
  } else if (msg.action === 'execute_script') {
    chromeExt.send(JSON.stringify({
      id: msg.id,
      result: { success: true, result: `Executed in Chrome tab ${msg.tab_id}` },
    }));
  } else {
    chromeExt.send(JSON.stringify({ id: msg.id, result: msg.action === 'ungroup_tabs' ? { ungrouped: msg.tab_ids.length } : { success: true } }));
  }
});

await new Promise((r) => chromeExt.on('open', r));
await sleep(100);
assert(isExtensionConnected(), 'Bridge connected with Chrome');

// 2. Connect Firefox extension simultaneously
const firefoxExt = new WebSocket(`ws://127.0.0.1:${PORT}/?browser=firefox&name=Firefox&instance=firefox_inst`, {
  origin: 'moz-extension://mock-firefox-id',
});

firefoxExt.on('message', (raw) => {
  const msg = JSON.parse(raw);
  if (msg.action === 'query_tabs') {
    firefoxExt.send(JSON.stringify({
      id: msg.id,
      result: [
        { id: 20, title: 'Mozilla', url: 'https://mozilla.org', windowId: 1 },
        { id: 21, title: 'MDN', url: 'https://developer.mozilla.org', windowId: 1 },
      ],
    }));
  } else if (msg.action === 'execute_script') {
    firefoxExt.send(JSON.stringify({
      id: msg.id,
      result: { success: true, result: `Executed in Firefox tab ${msg.tab_id}` },
    }));
  } else {
    firefoxExt.send(JSON.stringify({ id: msg.id, result: msg.action === 'ungroup_tabs' ? { ungrouped: msg.tab_ids.length } : { success: true } }));
  }
});

await new Promise((r) => firefoxExt.on('open', r));
await sleep(100);

const status = bridgeStatus();
assert(status.clients.length === 2, 'Both Chrome and Firefox are registered as active clients');

// 3. Query tabs across all browsers
const allTabs = await callExtension('query_tabs');
assert(Array.isArray(allTabs), 'query_tabs returns array');
assert(allTabs.length === 4, 'query_tabs aggregates tabs from both browsers (2 + 2 = 4)');

const chromeTabs = allTabs.filter((t) => t.browser === 'chrome');
const firefoxTabs = allTabs.filter((t) => t.browser === 'firefox');
assert(chromeTabs.length === 2, 'Chrome tabs tagged with browser: chrome');
assert(firefoxTabs.length === 2, 'Firefox tabs tagged with browser: firefox');

// 4. Targeted execution using composite ID
const resFirefox = await callExtension('execute_script', { tab_id: 'firefox:20', script: 'return 1;' });
assert(resFirefox?.result === 'Executed in Firefox tab 20', 'Targeted call routed to Firefox tab 20 via composite ID');

const resChrome = await callExtension('execute_script', { tab_id: 11, script: 'return 2;' });
assert(resChrome?.result === 'Executed in Chrome tab 11', 'Targeted call auto-routed to Chrome tab 11 via tab cache');

// 4b. Safety: never guess the browser
let err = null;
try { await callExtension('execute_script', { tab_id: 999, script: '1' }); } catch (e) { err = e; }
assert(/Unknown tab id 999/.test(err?.message), 'Unknown bare id with two browsers is refused, not guessed');

// Chrome reuses id 20 (Firefox already owns 20) -> bare 20 is now ambiguous
await callExtension('query_tabs');
chromeTabsExtra.push({ id: 20, title: 'Dup', url: 'https://dup.example', windowId: 1 });
await callExtension('query_tabs');
err = null;
try { await callExtension('activate_tab', { tab_id: 20 }); } catch (e) { err = e; }
assert(/more than one browser/.test(err?.message), 'Bare id owned by two browsers is refused');

err = null;
try { await callExtension('group_tabs', { tab_ids: ['chrome:10', 'firefox:21'] }); } catch (e) { err = e; }
assert(/different browsers/.test(err?.message), 'Grouping tabs across browsers is refused');

const ug = await callExtension('ungroup_tabs', { tab_ids: ['chrome:10', 'firefox:21'] });
assert(ug?.ungrouped === 2, 'ungroup_tabs batches per browser and sums results');

// 5. Disconnect Firefox; Chrome should remain active
firefoxExt.close();
await sleep(100);

assert(isExtensionConnected(), 'Bridge remains connected to Chrome after Firefox disconnects');
assert(bridgeStatus().clients.length === 1, 'Active clients updated to 1');

chromeExt.close();
await sleep(100);
assert(!isExtensionConnected(), 'Bridge reports disconnected when all browsers leave');

console.error(failures === 0 ? '\nMULTI-BROWSER TEST: ALL PASS' : `\nMULTI-BROWSER TEST: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
