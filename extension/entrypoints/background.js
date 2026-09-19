// 2ManyTabs MCP – Background entrypoint (Chrome MV3 service worker /
// Firefox MV2 background script — WXT picks the right shape per target).
//
// MV3 service workers go idle and kill setTimeout callbacks, so we use
// browser.alarms to reliably wake the worker and reconnect the WebSocket.

import {
  queryTabs, closeTabs, openTabs, groupTabs, ungroupTabs,
  queryGroups, updateGroup, activateTab, updateTab, getTabText,
} from '../lib/tab-ops.js';

const WS_URL = 'ws://127.0.0.1:9876';
const ALARM_NAME = '2manytabs-mcp-reconnect';

export default defineBackground(() => {
  let ws = null;

  // -------------------------------------------------------------------------
  // Connection management
  // -------------------------------------------------------------------------

  function isAlive() {
    return ws !== null && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING);
  }

  async function connect() {
    const { enabled = true } = await browser.storage.local.get('enabled');
    if (!enabled) return;

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
    browser.storage.local.set({ connected, lastUpdate: Date.now() });
  }

  // -------------------------------------------------------------------------
  // Alarm – wakes the service worker every 30 s to reconnect if needed.
  // browser.alarms is the only reliable wakeup mechanism for MV3 workers.
  // -------------------------------------------------------------------------

  browser.alarms.create(ALARM_NAME, { periodInMinutes: 0.5 }); // 30 seconds

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME && !isAlive()) connect();
  });

  // -------------------------------------------------------------------------
  // Startup / install wakeups & state listening
  // -------------------------------------------------------------------------

  browser.runtime.onInstalled.addListener(() => {
    browser.alarms.create(ALARM_NAME, { periodInMinutes: 0.5 });
    browser.storage.local.get('enabled', (res) => {
      if (res.enabled === undefined) browser.storage.local.set({ enabled: true });
      connect();
    });
  });

  browser.runtime.onStartup.addListener(() => {
    connect();
  });

  browser.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.enabled !== undefined) {
      if (changes.enabled.newValue) {
        connect();
      } else {
        if (ws) {
          ws.onclose = null; // Prevent reconnect loop
          ws.close();
          ws = null;
        }
        setStatus(false);
      }
    }
  });

  // -------------------------------------------------------------------------
  // Message dispatcher
  //
  // The extension proxies a fixed set of chrome.tabs, chrome.tabGroups, and
  // chrome.scripting operations (via lib/tab-ops.js, using the browser.*
  // WebExtension API). All selection, filtering, and reshaping logic lives
  // in the MCP host (native-host/).
  //
  // Tools that only filter or reshape data from an existing action here can
  // ship as host-only changes — no extension reload needed. Adding a
  // genuinely new browser operation requires a new case in this switch
  // (and sometimes a new manifest permission in wxt.config.ts) plus an
  // extension reload.
  // -------------------------------------------------------------------------

  async function dispatch(msg) {
    switch (msg.action) {
      case 'query_tabs':    return queryTabs();
      case 'close_tabs':    return closeTabs(msg.tab_ids);
      case 'open_tabs':     return openTabs(msg.urls);
      case 'group_tabs':    return groupTabs(msg.tab_ids, msg.group_id, msg.title, msg.color);
      case 'ungroup_tabs':  return ungroupTabs(msg.tab_ids);
      case 'query_groups':  return queryGroups();
      case 'update_group':  return updateGroup(msg.group_id, msg.title, msg.color, msg.collapsed);
      case 'activate_tab':  return activateTab(msg.tab_id);
      case 'update_tab':    return updateTab(msg.tab_id, msg.url, msg.pinned, msg.muted);
      case 'get_tab_text':  return getTabText(msg.tab_id);
      case 'ping':          return { pong: true };
      default:
        throw new Error(`Unknown action: ${msg.action}`);
    }
  }

  connect();
});
