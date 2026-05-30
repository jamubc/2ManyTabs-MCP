// Pure tab-selection helpers — shared by the list_tabs and close_tabs tools.
// Keeping these side-effect-free makes the tools easy to reason about and test.

/** Extract a display domain from a tab URL, tolerating chrome://, file://, blank. */
export function domainOf(tab) {
  try {
    const u = new URL(tab.url);
    if (u.protocol === 'chrome:' || u.protocol === 'chrome-extension:') {
      return `${u.protocol}//${u.hostname || u.pathname.split('/')[0] || ''}`.replace(/\/$/, '');
    }
    return u.hostname || '(local)';
  } catch {
    return '(unknown)';
  }
}

/** Case-insensitive substring match against title OR url. */
export function matchesQuery(tab, q) {
  const needle = q.toLowerCase();
  return (tab.title ?? '').toLowerCase().includes(needle) ||
         (tab.url ?? '').toLowerCase().includes(needle);
}

/**
 * Return the ids of duplicate tabs — every tab sharing a URL with an earlier
 * tab. The first occurrence of each URL is kept; the rest are returned.
 */
export function findDuplicateIds(tabs) {
  const seen = new Set();
  const dupes = [];
  for (const t of tabs) {
    if (seen.has(t.url)) dupes.push(t.id);
    else seen.add(t.url);
  }
  return dupes;
}

/** Build a { domain -> count } histogram, sorted by count descending. */
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

/** Group tabs by domain → { domain: { count, tab_ids, sample_titles } }, sorted by count. */
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

/** Group tabs by windowId → { windowId: { count, tab_ids } }. */
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

/** Trim a tab to a compact shape for listing (keeps token cost sane at 1000 tabs). */
export function compact(tab) {
  const title = tab.title ?? '';
  return {
    id: tab.id,
    window: tab.windowId,
    title: title.length > 80 ? title.slice(0, 77) + '…' : title,
    url: tab.url ?? '',
    pinned: tab.pinned || undefined,
    audible: tab.audible || undefined,
  };
}
