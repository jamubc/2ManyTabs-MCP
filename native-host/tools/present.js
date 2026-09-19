import {
  compact,
  tabLabel,
  TITLE_TRUNCATE_FULL,
  HISTOGRAM_BAR_MAX,
} from '../lib/tabs.js';
import {
  buildFlags,
  formatFlags,
  drawBar,
  formatHistogramLine,
  formatDomainHeader,
  formatWindowHeader,
  formatGroupPrefix,
} from './rendering.js';

function renderHistogram(histogram) {
  const maxCount = Math.max(...histogram.map((x) => x.count));
  const lines = ['Domains:'];

  for (const { domain, count } of histogram) {
    const bar = drawBar(count, maxCount, HISTOGRAM_BAR_MAX);
    lines.push(formatHistogramLine(domain, count, bar));
  }

  return lines;
}

function renderByDomain(tabs, groupMap) {
  const grouped = {};
  for (const t of tabs) {
    const domain = t.url ? new URL(t.url).hostname : '(local)';
    (grouped[domain] ??= []).push(t);
  }

  const lines = [];
  for (const [domain, tabsInDomain] of Object.entries(grouped)) {
    lines.push(formatDomainHeader(domain, tabsInDomain.length));
    for (const t of tabsInDomain) {
      const label = tabLabel(t);
      const flags = buildFlags(t);
      const flagStr = formatFlags(flags);
      lines.push(`    · ${formatGroupPrefix(groupMap, t)}${label}${flagStr}`);
    }
    lines.push('');
  }

  return lines;
}

function renderByWindow(tabs, groupMap) {
  const grouped = {};
  for (const t of tabs) {
    (grouped[t.windowId] ??= []).push(t);
  }

  const lines = [];
  for (const [winId, tabsInWin] of Object.entries(grouped)) {
    lines.push(formatWindowHeader(winId, tabsInWin.length));
    for (const t of tabsInWin) {
      const label = tabLabel(t);
      const flags = buildFlags(t);
      const flagStr = formatFlags(flags);
      lines.push(`    · ${formatGroupPrefix(groupMap, t)}${label}${flagStr}`);
    }
    lines.push('');
  }

  return lines;
}

function renderFlat(tabs, groupMap) {
  const lines = [];
  for (const t of tabs) {
    const c = compact(t);
    const label =
      c.title.length > TITLE_TRUNCATE_FULL
        ? c.title.slice(0, TITLE_TRUNCATE_FULL - 3) + '…'
        : c.title;
    const flags = buildFlags(c);
    const flagStr = formatFlags(flags);
    lines.push(`  · ${formatGroupPrefix(groupMap, t)}${label}${flagStr}`);
  }

  return lines;
}

export function formatTabData(data) {
  const {
    tabs,
    histogram,
    groupMap,
    group_by,
    query,
    duplicates_only,
    windows,
    dupCount,
  } = data;

  const lines = [];

  lines.push(
    `📊 ${tabs.length} tab(s) across ${windows} window(s)` +
      (query ? ` matching "${query}"` : '') +
      (duplicates_only ? ' (duplicates only)' : '') +
      (dupCount > 0 ? ` · ${dupCount} duplicate(s) found` : '') +
      '\n',
  );

  lines.push(...renderHistogram(histogram));
  lines.push('');

  if (group_by === 'domain') {
    lines.push(...renderByDomain(tabs, groupMap));
  } else if (group_by === 'window') {
    lines.push(...renderByWindow(tabs, groupMap));
  } else {
    lines.push(...renderFlat(tabs, groupMap));
  }

  return lines.join('\n');
}
