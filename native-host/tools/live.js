import { callExtension } from '../bridge.js';

export async function liveTabs(browser) {
  const all = await callExtension('query_tabs');
  if (!browser) return all;
  return all.filter((t) => (t.browser || '').toLowerCase() === browser.toLowerCase());
}

// Tab groups are optional: older Firefox has none, and a failure must not hide the tabs.
export async function liveGroups() {
  try {
    const groups = await callExtension('query_groups');
    return Array.isArray(groups) ? groups : [];
  } catch {
    return [];
  }
}
