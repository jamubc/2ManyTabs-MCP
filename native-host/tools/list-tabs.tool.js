import { z } from 'zod';
import { callExtension } from '../bridge.js';
import {
  matchesQuery, findDuplicateIds, domainHistogram,
  MAX_TAB_LIST,
} from '../lib/tabs.js';
import { formatTabData } from './present.js';

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

    let groups;
    try {
      groups = await callExtension('query_groups');
    } catch (err) {
      console.error('Failed to fetch tab groups:', err);
      throw new Error('Failed to fetch tab groups from extension.');
    }

    const groupMap = new Map(groups.map(g => [g.id, g]));

    let tabs = all;
    if (query) tabs = tabs.filter((t) => matchesQuery(t, query));
    if (duplicates_only) {
      const dupIds = new Set(findDuplicateIds(tabs));
      tabs = tabs.filter((t) => dupIds.has(t.id));
    }

    // Apply MAX_TAB_LIST limit to prevent token overflow
    if (tabs.length > MAX_TAB_LIST) {
      tabs = tabs.slice(0, MAX_TAB_LIST);
    }

    const histogram = domainHistogram(tabs);
    const windows = new Set(tabs.map((t) => t.windowId)).size;
    const dupCount = findDuplicateIds(tabs).length;

    return formatTabData({
      tabs,
      histogram,
      groupMap,
      group_by,
      query,
      duplicates_only,
      windows,
      dupCount,
    });
  },
};
