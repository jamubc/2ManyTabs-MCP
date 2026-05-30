// 2ManyTabs MCP – Chrome Extension Service Worker
//
// MV3 service workers go idle and kill setTimeout callbacks, so we use
// chrome.alarms to reliably wake the worker and reconnect the WebSocket.

const WS_URL = 'ws://127.0.0.1:9876';
const ALARM_NAME = '2manytabs-mcp-reconnect';

let ws = null;

// ---------------------------------------------------------------------------
// Connection management
// ---------------------------------------------------------------------------

function isAlive() {
  return ws !== null && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING);
}

function connect() {
  if (isAlive()) return;

  try {
    ws = new WebSocket(WS_URL);
  } catch (e) {
    ws = null;
    setStatus(false);
    return;
  }

  ws.onopen = () => {
    setStatus(true);
  };

  ws.onclose = () => {
    ws = null;
    setStatus(false);
    // Fast retry while the service worker is still alive.
    // The alarm is the fallback for when it goes idle.
    setTimeout(() => { if (!isAlive()) connect(); }, 2000);
  };

  ws.onerror = () => {
    // onclose fires immediately after; let it handle cleanup.
  };

  ws.onmessage = async (event) => {
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }

    let result, error;
    try {
      result = await dispatch(msg);
    } catch (err) {
      error = err.message;
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ id: msg.id, result, error }));
    }
  };
}

function setStatus(connected) {
  chrome.storage.local.set({ connected, lastUpdate: Date.now() });
}

// ---------------------------------------------------------------------------
// Alarm – wakes the service worker every 30 s to reconnect if needed.
// chrome.alarms is the only reliable wakeup mechanism for MV3 workers.
// ---------------------------------------------------------------------------

chrome.alarms.create(ALARM_NAME, { periodInMinutes: 0.5 }); // 30 seconds

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME && !isAlive()) connect();
});

// ---------------------------------------------------------------------------
// Startup / install wakeups
// ---------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 0.5 });
  connect();
});

chrome.runtime.onStartup.addListener(() => {
  connect();
});

// ---------------------------------------------------------------------------
// Message dispatcher
//
// The extension is a thin Chrome proxy: it only fetches and removes tabs.
// All selection / grouping / dedup logic lives in the MCP host (native-host/),
// so new capabilities can ship without reloading the extension.
// ---------------------------------------------------------------------------

async function dispatch(msg) {
  switch (msg.action) {
    case 'query_tabs': return queryTabs();
    case 'close_tabs': return closeTabs(msg.tab_ids);
    case 'ping':       return { pong: true };
    default:
      throw new Error(`Unknown action: ${msg.action}`);
  }
}

// ---------------------------------------------------------------------------
// Tab operations
// ---------------------------------------------------------------------------

async function queryTabs() {
  const tabs = await chrome.tabs.query({});
  return tabs.map(t => ({
    id:       t.id,
    windowId: t.windowId,
    index:    t.index,
    title:    t.title   ?? '',
    url:      t.url     ?? '',
    active:   t.active,
    pinned:   t.pinned,
    audible:  t.audible,
    status:   t.status,
  }));
}

async function closeTabs(tabIds) {
  if (!Array.isArray(tabIds) || tabIds.length === 0) return { closed: 0 };
  // chrome.tabs.remove rejects the whole batch if any id is stale; filter to live ids first.
  const live = new Set((await chrome.tabs.query({})).map(t => t.id));
  const ids = tabIds.filter(id => live.has(id));
  if (ids.length > 0) await chrome.tabs.remove(ids);
  return { closed: ids.length };
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

connect();
