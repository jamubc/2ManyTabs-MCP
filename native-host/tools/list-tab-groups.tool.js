import { z } from 'zod';
import { callExtension } from '../bridge.js';

export const listTabGroupsTool = {
  name: 'list_tab_groups',
  title: 'List Tab Groups',
  description:
    'List all existing native Chrome Tab Groups in the current browser session. ' +
    'Returns their IDs, titles, colors, collapsed states, and parent window IDs.',
  annotations: { readOnlyHint: true, openWorldHint: true },
  inputSchema: {
    title_query: z.string().optional()
      .describe('Case-insensitive substring filter for group titles.'),
  },

  // fallow-ignore-next-line complexity
  execute: async ({ title_query }) => {
    let groups;
    try {
      groups = await callExtension('query_groups');
    } catch (err) {
      console.error('Failed to fetch tab groups:', err);
      throw new Error('Failed to fetch tab groups from extension.');
    }
    let filtered = groups;
    if (title_query) {
      const q = title_query.toLowerCase();
      filtered = groups.filter((g) => (g.title || '').toLowerCase().includes(q));
    }

    if (filtered.length === 0) {
      return title_query
        ? `No tab groups matched "${title_query}".`
        : 'No tab groups found in the browser session.';
    }

    const lines = [`📁 ${filtered.length} tab group(s) found:`];
    for (const g of filtered) {
      const titleStr = g.title ? `"${g.title}"` : '(unnamed)';
      const collapsedStr = g.collapsed ? ' ⏸ (collapsed)' : ' ▶ (expanded)';
      lines.push(`  · [ID: ${g.id}] ${titleStr} [Color: ${g.color}] [Window: ${g.windowId}]${collapsedStr}`);
    }

    return lines.join('\n');
  },
};
