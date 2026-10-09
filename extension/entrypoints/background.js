import {
  queryTabs, closeTabs, openTabs, groupTabs, ungroupTabs,
  queryGroups, updateGroup, activateTab, updateTab, getTabText,
  executeScript,
} from '../lib/tab-ops.js';

const WS_URL = 'ws://127.0.0.1:9876';
const ALARM_NAME = '2manytabs-mcp-reconnect';
const BROWSER_TYPE = (typeof import.meta !== 'undefined' && import.meta.env?.BROWSER) ? import.meta.env.BROWSER : 'chrome';
const INSTANCE_ID = `${BROWSER_TYPE}_${Math.random().toString(36).slice(2, 8)}`;

export default defineBackground(() => {
  let ws = null;

  function isAlive() {
    return ws !== null && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING);
  }

  async function connect() {
    const { enabled = true } = await browser.storage.local.get('enabled');
    if (!enabled) return;

    if (isAlive()) return;

    try {
      const wsUrl = `${WS_URL}?browser=${encodeURIComponent(BROWSER_TYPE)}&instance=${encodeURIComponent(INSTANCE_ID)}`;
      ws = new WebSocket(wsUrl);
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
      setTimeout(() => { if (!isAlive()) connect(); }, 2000);
    };

    ws.onerror = () => {
    };

    ws.onmessage = async (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }

      if (msg.type === 'status') {
        browser.storage.local.set({ peers: { self: msg.self, agents: msg.agents, browsers: msg.browsers } });
        return;
      }
      if (msg.type === 'activity') {
        browser.storage.local.set({ activity: { target: msg.target, action: msg.action, agent: msg.agent, at: msg.at } });
        return;
      }

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
    browser.storage.local.set({ connected, lastUpdate: Date.now(), ...(connected ? {} : { peers: null }) });
  }

  browser.alarms.create(ALARM_NAME, { periodInMinutes: 0.5 });

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME && !isAlive()) connect();
  });

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
          ws.onclose = null;
          ws.close();
          ws = null;
        }
        setStatus(false);
      }
    }
  });

  async function dispatch(msg) {
    switch (msg.action) {
      case 'query_tabs':    return queryTabs();
      case 'close_tabs':    return closeTabs(msg.tab_ids);
      case 'open_tabs':     return openTabs(msg.urls);
      case 'group_tabs':    return groupTabs(msg.tab_ids, msg.group_id, msg.title, msg.color);
      case 'ungroup_tabs':  return ungroupTabs(msg.tab_ids);
      case 'query_groups':  return queryGroups();
      case 'update_group':  return updateGroup(msg.group_id, msg.title, msg.color, msg.collapsed);
      case 'activate_tab':    return activateTab(msg.tab_id);
      case 'update_tab':      return updateTab(msg.tab_id, msg.url, msg.pinned, msg.muted);
      case 'get_tab_text':    return getTabText(msg.tab_id);
      case 'execute_script':  return executeScript(msg.tab_id, msg.script, msg.world);
      case 'ping':            return { pong: true };
      default:
        throw new Error(`Unknown action: ${msg.action}`);
    }
  }

  connect();
});
