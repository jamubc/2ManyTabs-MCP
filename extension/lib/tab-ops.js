// Browser-operation helpers proxied by the background entrypoint.
//
// Uses the bare `browser` global: WXT auto-imports `browser` (backed by
// `chrome` on Chromium, native on Firefox) into every project file, and the
// native-host cross-package tests set `globalThis.browser` directly before
// importing this module under plain Node — see native-host/lib/background.test.js.
//
// All selection, filtering, and reshaping logic lives in the MCP host
// (native-host/); this file only proxies chrome.tabs/tabGroups/scripting calls.

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
  }));
}

// browser.tabs.remove / group / ungroup reject if any id is stale; filter first.
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

  // Create all tabs in parallel
  const createPromises = urls.map(url => {
    // Only bare domains/paths lack a scheme (e.g. "example.com"); anything
    // with one already - http(s), about:, chrome:, file:, etc. - passes through.
    const finalUrl = /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
    return browser.tabs.create({ url: finalUrl, active: false });
  });

  await Promise.all(createPromises);
  return { opened: urls.length };
}

export async function groupTabs(tabIds, groupId, title, color) {
  requireTabGroups();

  if (!Array.isArray(tabIds) || tabIds.length === 0) {
    throw new Error('Provide at least one tab ID to group.');
  }

  const ids = await liveIds(tabIds);
  if (ids.length === 0) {
    throw new Error('None of the provided tab IDs are valid/open.');
  }

  // Group tabs
  const resultGroupId = await browser.tabs.group({
    tabIds: ids,
    groupId: typeof groupId === 'number' ? groupId : undefined
  });

  // Apply title or color updates if requested
  if (title || color) {
    const updateObj = {};
    if (title) updateObj.title = title;
    if (color) updateObj.color = color;
    await browser.tabGroups.update(resultGroupId, updateObj);
  }

  return { groupId: resultGroupId };
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
  // Try to find the tab to get its window ID
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
    updateObj.url = (!url.startsWith('http://') && !url.startsWith('https://'))
      ? `https://${url}`
      : url;
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

  // Validate the URL is safe for scripting (e.g. not chrome://)
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
