function hasTabGroups() {
  return typeof browser !== 'undefined' && !!browser.tabGroups;
}

function requireTabGroups() {
  if (!hasTabGroups()) {
    throw new Error('Tab groups are not supported in this browser.');
  }
}

export async function queryTabs() {
  const tabs = await browser.tabs.query({});
  return tabs.map(t => ({
    id:       t.id,
    windowId: t.windowId,
    groupId:  t.groupId,
    index:    t.index,
    title:    t.title   ?? '',
    url:      t.url     ?? '',
    active:   t.active,
    pinned:   t.pinned,
    audible:  t.audible,
    status:   t.status,
    lastAccessed: t.lastAccessed,
  }));
}

async function liveIds(tabIds) {
  const live = new Set((await browser.tabs.query({})).map(t => t.id));
  return tabIds.filter(id => live.has(id));
}

export async function closeTabs(tabIds) {
  if (!Array.isArray(tabIds) || tabIds.length === 0) return { closed: 0 };
  const ids = await liveIds(tabIds);
  if (ids.length > 0) await browser.tabs.remove(ids);
  return { closed: ids.length };
}

export async function openTabs(urls) {
  if (!Array.isArray(urls) || urls.length === 0) return { opened: 0 };

  const createPromises = urls.map(url => {
    const finalUrl = /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
    return browser.tabs.create({ url: finalUrl, active: false });
  });

  await Promise.all(createPromises);
  return { opened: urls.length };
}

async function lastFocusedWindowId() {
  try {
    return (await browser.windows.getLastFocused()).id;
  } catch {
    return null;
  }
}

// Put the person back where they were: the tab they were on in each window,
// and the window they were in.
async function restoreFocus(activeIds, focusedWindowId) {
  const live = new Map((await browser.tabs.query({})).map(t => [t.id, t]));
  for (const id of activeIds) {
    const tab = live.get(id);
    if (tab && !tab.active) await browser.tabs.update(id, { active: true });
  }
  if (focusedWindowId != null && (await lastFocusedWindowId()) !== focusedWindowId) {
    await browser.windows.update(focusedWindowId, { focused: true });
  }
}

// A tab group lives in one window, and tabs.group() moves every tab it is
// given into one window (the current one by default). Called on tabs from
// several windows, that pulls the user's whole browser into one window while
// they are using it. So group each window's tabs in that window, with the same
// title and color, and leave the user on the tab they were on.
export async function groupTabs(tabIds, groupId, title, color) {
  requireTabGroups();

  if (!Array.isArray(tabIds) || tabIds.length === 0) {
    throw new Error('Provide at least one tab ID to group.');
  }

  const all = await browser.tabs.query({});
  const byId = new Map(all.map(t => [t.id, t]));
  const ids = tabIds.filter(id => byId.has(id));
  if (ids.length === 0) {
    throw new Error('None of the provided tab IDs are valid/open.');
  }

  const focusedWindowId = await lastFocusedWindowId();
  const activeIds = all.filter(t => t.active).map(t => t.id);

  const given = {};
  if (title) given.title = title;
  if (color) given.color = color;

  // Adding to an existing group: tabs in its window join it; tabs in other
  // windows get a matching group of their own.
  let joinWindowId;
  let style = given;
  if (typeof groupId === 'number') {
    const existing = await browser.tabGroups.get(groupId);
    joinWindowId = existing.windowId;
    style = { title: existing.title, color: existing.color, ...given };
  }

  const byWindow = new Map();
  for (const id of ids) {
    const windowId = byId.get(id).windowId;
    if (!byWindow.has(windowId)) byWindow.set(windowId, []);
    byWindow.get(windowId).push(id);
  }

  const groupIds = [];
  for (const [windowId, windowTabIds] of byWindow) {
    const joining = joinWindowId !== undefined && windowId === joinWindowId;
    const options = { tabIds: windowTabIds };
    if (joining) options.groupId = groupId;
    else if (typeof windowId === 'number') options.createProperties = { windowId };
    const resultGroupId = await browser.tabs.group(options);

    const update = joining ? given : style;
    if (Object.keys(update).length > 0) {
      await browser.tabGroups.update(resultGroupId, update);
    }
    groupIds.push(resultGroupId);
  }

  await restoreFocus(activeIds, focusedWindowId);

  return { groupId: groupIds[0], groupIds, grouped: ids.length, windows: byWindow.size };
}

export async function ungroupTabs(tabIds) {
  requireTabGroups();

  if (!Array.isArray(tabIds) || tabIds.length === 0) {
    throw new Error('Provide at least one tab ID to ungroup.');
  }
  const ids = await liveIds(tabIds);
  if (ids.length > 0) {
    await browser.tabs.ungroup(ids);
  }
  return { ungrouped: ids.length };
}

export async function queryGroups() {
  requireTabGroups();

  const groups = await browser.tabGroups.query({});
  return groups.map(g => ({
    id:        g.id,
    windowId:  g.windowId,
    title:     g.title ?? '',
    color:     g.color,
    collapsed: g.collapsed,
  }));
}

export async function updateGroup(groupId, title, color, collapsed) {
  requireTabGroups();

  if (typeof groupId !== 'number') {
    throw new Error('Provide a numeric group ID.');
  }
  const updateObj = {};
  if (title !== undefined) updateObj.title = title;
  if (color !== undefined) updateObj.color = color;
  if (collapsed !== undefined) updateObj.collapsed = collapsed;

  await browser.tabGroups.update(groupId, updateObj);
  return { updated: groupId };
}

export async function activateTab(tabId) {
  if (typeof tabId !== 'number') {
    throw new Error('Provide a numeric tab ID.');
  }
  const tab = await browser.tabs.get(tabId);
  if (!tab) {
    throw new Error(`Tab with ID ${tabId} not found.`);
  }

  await browser.tabs.update(tabId, { active: true });
  await browser.windows.update(tab.windowId, { focused: true });

  return { activated: tabId };
}

export async function updateTab(tabId, url, pinned, muted) {
  if (typeof tabId !== 'number') {
    throw new Error('Provide a numeric tab ID.');
  }

  const updateObj = {};
  if (url !== undefined) {
    updateObj.url = /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
  }
  if (pinned !== undefined) updateObj.pinned = pinned;
  if (muted !== undefined) updateObj.muted = muted;

  await browser.tabs.update(tabId, updateObj);
  return { updated: tabId };
}

export async function getTabText(tabId) {
  if (typeof tabId !== 'number') {
    throw new Error('Provide a numeric tab ID.');
  }

  const tab = await browser.tabs.get(tabId);
  if (!tab) {
    throw new Error(`Tab with ID ${tabId} not found.`);
  }

  const url = tab.url || '';
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') ||
      url.startsWith('edge://') || url.startsWith('moz-extension://') || url.startsWith('about:')) {
    throw new Error('Scripting is not permitted on restricted system URLs.');
  }

  if (!browser.scripting) {
    throw new Error('Page text extraction is not supported in this browser.');
  }

  const results = await browser.scripting.executeScript({
    target: { tabId },
    func: () => document.body ? document.body.innerText : ''
  });

  if (!results || results.length === 0) {
    return { text: '' };
  }

  return { text: results[0].result || '' };
}

export async function executeScript(tabId, script, world = 'ISOLATED') {
  if (typeof tabId !== 'number') {
    throw new Error('Provide a numeric tab ID.');
  }

  if (typeof script !== 'string' || !script.trim()) {
    throw new Error('Provide a non-empty script string to execute.');
  }

  const tab = await browser.tabs.get(tabId);
  if (!tab) {
    throw new Error(`Tab with ID ${tabId} not found.`);
  }

  const url = tab.url || '';
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') ||
      url.startsWith('edge://') || url.startsWith('moz-extension://') || url.startsWith('about:')) {
    throw new Error('Scripting is not permitted on restricted system URLs.');
  }

  if (!browser.scripting) {
    throw new Error('Scripting is not supported in this browser.');
  }

  const targetWorld = world === 'MAIN' ? 'MAIN' : 'ISOLATED';

  const results = await browser.scripting.executeScript({
    target: { tabId },
    world: targetWorld,
    func: async (code) => {
      try {
        let fn;
        try {
          fn = new Function(`return (async () => (${code}))()`);
        } catch {
          fn = new Function(`return (async () => { ${code} })()`);
        }
        const val = await fn();
        return {
          success: true,
          result: val !== undefined ? JSON.parse(JSON.stringify(val)) : null,
        };
      } catch (err) {
        return {
          success: false,
          error: err.stack || err.message || String(err),
        };
      }
    },
    args: [script],
  });

  if (!results || results.length === 0) {
    return { success: false, error: 'No execution result returned from browser.' };
  }

  return results[0].result;
}
