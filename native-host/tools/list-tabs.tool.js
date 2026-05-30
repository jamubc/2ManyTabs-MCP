import { z } from 'zod';
import { callExtension } from '../bridge.js';
import {
  matchesQuery, findDuplicateIds, domainHistogram,
  groupByDomain, groupByWindow, compact,
} from '../lib/tabs.js';

// READ tool. Absorbs the old list_tabs + get_tab_groups.
// Always returns a domain histogram up top so the agent gets an instant map of
// 1000 tabs before deciding what to close.
export const listTabsTool = {
  name: 'list_tabs',
  title: 'List Tabs',
  description:
    'Read open Chrome tabs. Returns a domain histogram (the fastest way to understand a large ' +
    'tab set) plus a detailed view. When summarizing the results for the user, you should ' +
    'include the histogram bar graph in your response. Filter with `query`, reshape with ' +
    '`group_by`, or isolate redundant tabs with `duplicates_only`. Read-only — never closes anything.',
  annotations: { readOnlyHint: true, openWorldHint: true },
  inputSchema: {
    query: z.string().optional()
      .describe('Case-insensitive substring; keep only tabs whose title or URL contains it.'),
    group_by: z.enum(['none', 'domain', 'window']).default('domain')
      .describe("Shape of the detailed view. 'domain' (default) is best for triaging many tabs; " +
        "'window' groups by browser window; 'none' returns a flat list."),
    duplicates_only: z.boolean().default(false)
      .describe('Only include tabs that are duplicates (share a URL with an earlier tab).'),
  },

  execute: async ({ query, group_by, duplicates_only }) => {
    const all = await callExtension('query_tabs');

    let tabs = all;
    if (query) tabs = tabs.filter((t) => matchesQuery(t, query));
    if (duplicates_only) {
      const dupIds = new Set(findDuplicateIds(tabs));
      tabs = tabs.filter((t) => dupIds.has(t.id));
    }

    const windows = new Set(tabs.map((t) => t.windowId)).size;
    const dupCount = findDuplicateIds(tabs).length;

    const histogram = domainHistogram(tabs);

    // Build a human-readable grouped summary that naturally guides the agent
    // to present tabs in a logical way.
    const lines = [];

    // Header line
    lines.push(`📊 ${tabs.length} tab(s) across ${windows} window(s)` +
      (query ? ` matching "${query}"` : '') +
      (duplicates_only ? ' (duplicates only)' : '') +
      (dupCount > 0 ? ` · ${dupCount} duplicate(s) found` : '') +
      '\n');

    // Domain summary bar
    lines.push('Domains:');
    for (const d of histogram) {
      const bar = '▇'.repeat(Math.max(1, Math.round(d.count / Math.max(...histogram.map(x => x.count)) * 20)));
      lines.push(`  ${bar}  ${d.domain.padEnd(28)} ${d.count} tab(s)`);
    }
    lines.push('');

    // Detailed grouped view
    if (group_by === 'domain') {
      const groups = groupByDomain(tabs);
      for (const [domain, info] of Object.entries(groups)) {
        lines.push(`📁 ${domain} — ${info.count} tab(s)`);
        for (const id of info.tab_ids) {
          const tab = tabs.find(t => t.id === id);
          if (!tab) continue;
          const label = (tab.title || '(untitled)').length > 90
            ? (tab.title || '(untitled)').slice(0, 87) + '…'
            : (tab.title || '(untitled)');
          const flags = [];
          if (tab.pinned) flags.push('📌');
          if (tab.audible) flags.push('🔊');
          const flagStr = flags.length ? ' ' + flags.join('') : '';
          lines.push(`    · ${label}${flagStr}`);
        }
        lines.push('');
      }
    } else if (group_by === 'window') {
      const groups = groupByWindow(tabs);
      for (const [winId, info] of Object.entries(groups)) {
        lines.push(`🪟 Window ${winId} — ${info.count} tab(s)`);
        for (const id of info.tab_ids) {
          const tab = tabs.find(t => t.id === id);
          if (!tab) continue;
          const label = (tab.title || '(untitled)').length > 90
            ? (tab.title || '(untitled)').slice(0, 87) + '…'
            : (tab.title || '(untitled)');
          lines.push(`    · ${label}`);
        }
        lines.push('');
      }
    } else {
      for (const t of tabs) {
        const c = compact(t);
        const label = c.title.length > 90 ? c.title.slice(0, 87) + '…' : c.title;
        const flags = [];
        if (c.pinned) flags.push('📌');
        if (c.audible) flags.push('🔊');
        const flagStr = flags.length ? ' ' + flags.join('') : '';
        lines.push(`  · ${label}${flagStr}`);
      }
    }

    return lines.join('\n');
  },
};
