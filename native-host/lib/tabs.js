export const MAX_TAB_LIST = 1000;

export const TITLE_TRUNCATE_FULL = 80;

export const TITLE_TRUNCATE_LABEL = 90;

export const HISTOGRAM_BAR_MAX = 20;

export function domainOf(tab) {
  if (!tab || tab.url == null) {
    console.error('[domainOf] tab URL is missing or tab is null/undefined:', tab);
    throw new Error('tab.url is missing or null');
  }
  const u = new URL(tab.url);
  if (u.protocol === 'chrome:' || u.protocol === 'chrome-extension:' ||
      u.protocol === 'moz-extension:' || u.protocol === 'about:') {
    return `${u.protocol}//${u.hostname || u.pathname.split('/')[0] || ''}`.replace(/\/$/, '');
  }
  return u.hostname || '(local)';
}

export function matchesQuery(tab, q) {
  const needle = q.toLowerCase();
  return (tab.title ?? '').toLowerCase().includes(needle) ||
         (tab.url ?? '').toLowerCase().includes(needle);
}

export function findDuplicateIds(tabs) {
  const seen = new Set();
  const dupes = [];
  for (const t of tabs) {
    if (seen.has(t.url)) dupes.push(t.id);
    else seen.add(t.url);
  }
  return dupes;
}

export function domainHistogram(tabs, limit = 15) {
  const counts = {};
  for (const t of tabs) {
    const d = domainOf(t);
    counts[d] = (counts[d] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([domain, count]) => ({ domain, count }));
}

export function groupByDomain(tabs) {
  const groups = {};
  for (const t of tabs) {
    const d = domainOf(t);
    (groups[d] ??= []).push(t);
  }
  return Object.fromEntries(
    Object.entries(groups)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([domain, list]) => [domain, {
        count: list.length,
        tab_ids: list.map(t => t.id),
        sample_titles: list.slice(0, 3).map(t => t.title || '(untitled)'),
      }])
  );
}

export function groupByWindow(tabs) {
  const groups = {};
  for (const t of tabs) {
    (groups[t.windowId] ??= []).push(t);
  }
  return Object.fromEntries(
    Object.entries(groups).map(([win, list]) => [win, {
      count: list.length,
      tab_ids: list.map(t => t.id),
    }])
  );
}

export function getGroupPrefix(tab, groupMap) {
  if (tab.groupId === undefined || tab.groupId === -1) return '';
  const g = groupMap.get(tab.groupId);
  return g ? `[Group: ${g.title || 'Group ' + g.id}] ` : '';
}

export function tabLabel(tab) {
  const t = tab.title || '(untitled)';
  return t.length > TITLE_TRUNCATE_LABEL ? t.slice(0, TITLE_TRUNCATE_LABEL - 3) + '…' : t;
}

export function compact(tab) {
  const title = tab.title ?? '';
  return {
    id: tab.id,
    window: tab.windowId,
    group: (tab.groupId !== undefined && tab.groupId !== -1) ? tab.groupId : undefined,
    title: title.length > TITLE_TRUNCATE_FULL ? title.slice(0, TITLE_TRUNCATE_FULL - 3) + '…' : title,
    url: tab.url ?? '',
    pinned: tab.pinned || undefined,
    audible: tab.audible || undefined,
  };
}
