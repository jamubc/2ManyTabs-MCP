export const MAX_TAB_LIST = 1000;

export const TITLE_TRUNCATE_FULL = 80;

export const TITLE_TRUNCATE_LABEL = 90;

export const HISTOGRAM_BAR_MAX = 20;

// A tab bar shows roughly this much of a group's name before cutting it off.
export const GROUP_TITLE_FITS = 15;

export const GROUP_TITLE_DESCRIBE =
  'Name shown on the group in the tab bar, which cuts off after about 15 characters. ' +
  'Use one to three words with the meaning first: "Watch later", "Homelab", or a verb ' +
  'for a to-do ("Buy Mac mini", "Book physio"). No numbers or counts; they go stale.';

export function groupTitleNote(title) {
  if (!title || title.length <= GROUP_TITLE_FITS) return undefined;
  return `"${title}" is ${title.length} characters, so the tab bar will show about ` +
    `"${title.slice(0, GROUP_TITLE_FITS)}…". If that start doesn't say what the group is, ` +
    'rename it shorter with update_tab_group.';
}

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

// Bulk actions above this size must name the count the user agreed to (`expected_count`),
// so a model that skips the preview, or a page that changed since it, cannot widen the action.
export const CONFIRM_COUNT_OVER = 10;

export function checkExpectedCount(count, expected, verb) {
  if (expected === undefined) {
    if (count > CONFIRM_COUNT_OVER) {
      throw new Error(
        `This would ${verb} ${count} tabs, so it needs expected_count. Preview it with dry_run: true, ` +
        `show the user what will ${verb}, and after they agree call again with expected_count: ${count}. ` +
        `Nothing was done.`);
    }
    return;
  }
  if (expected !== count) {
    throw new Error(
      `expected_count is ${expected} but the selection now has ${count} tabs, so nothing was done. ` +
      `Tabs may have changed since the preview: run it again with dry_run: true.`);
  }
}

export function selectCloseTargets(all, { tab_ids, match, duplicates, include_pinned = false }) {
  const modes = [tab_ids?.length ? 'tab_ids' : null, match ? 'match' : null, duplicates ? 'duplicates' : null]
    .filter(Boolean);
  if (modes.length === 0) throw new Error('Provide one selection mode: tab_ids, match, or duplicates:true.');
  if (modes.length > 1) throw new Error(`Use only one selection mode at a time (got: ${modes.join(', ')}).`);

  if (tab_ids?.length) {
    const byId = new Map(all.map((t) => [t.id, t]));
    const byComposite = new Map(all.map((t) => [`${t.browser}:${t.id}`, t]));
    const targets = [];
    let missing = 0;
    for (const rawId of tab_ids) {
      const found = typeof rawId === 'string' && rawId.includes(':')
        ? byComposite.get(rawId.toLowerCase())
        : byId.get(Number(rawId));
      if (found) targets.push(found);
      else missing++;
    }
    let reason = `${targets.length} tab(s) by id`;
    if (missing) reason += ` (${missing} id(s) no longer exist, skipped)`;
    return { targets, reason, pinnedKept: 0 };
  }

  let picked, reason;
  if (duplicates) {
    const dupIds = new Set(findDuplicateIds(all));
    picked = all.filter((t) => dupIds.has(t.id));
    reason = 'duplicate tabs';
  } else {
    picked = all.filter((t) => matchesQuery(t, match));
    reason = `tabs matching "${match}"`;
  }
  // Pinned tabs are usually live work; a broad selector leaves them unless asked.
  const targets = include_pinned ? picked : picked.filter((t) => !t.pinned);
  return { targets, reason, pinnedKept: picked.length - targets.length };
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
