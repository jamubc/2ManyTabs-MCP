import { z } from 'zod';
import { callExtension } from '../bridge.js';
import { domainOf, selectCloseTargets, checkExpectedCount, CONFIRM_COUNT_OVER } from '../lib/tabs.js';

export const closeTabsTool = {
  name: 'close_tabs',
  title: 'Close Tabs',
  description:
    'Close browser tabs by one selection mode: `tab_ids` (explicit), `match` (substring of ' +
    'title/URL), or `duplicates` (every tab sharing a URL with an earlier one). Set `dry_run` ' +
    'to preview the exact tabs that would close without touching them. `match` and `duplicates` ' +
    'leave pinned tabs open unless `include_pinned` is true. Closing more than ' +
    `${CONFIRM_COUNT_OVER} tabs needs \`expected_count\`, the count from the preview that the ` +
    'user agreed to; if the selection no longer has exactly that many tabs, nothing closes. ' +
    'This tool cannot reopen what it closes (reopen_tabs can, from a record saved by snapshot_tabs).\n\n' +
    'Ask the user before running with dry_run=false, naming what will close and how many, ' +
    'unless they already asked for exactly this close.\n\n' +
    'Examples:\n' +
    '- {"match": "github.com", "dry_run": true}\n' +
    '- {"match": "github.com", "expected_count": 14}\n' +
    '- {"tab_ids": ["firefox:12", "firefox:13"]}\n' +
    '- {"duplicates": true, "dry_run": true}\n\n' +
    'Returns:\n' +
    '  JSON object containing:\n' +
    '  - dry_run (boolean): Whether this was a preview\n' +
    '  - reason (string): Description of selection criteria\n' +
    '  - count/closed (int): Number of tabs matched/closed\n' +
    '  - pinned_kept (int): Pinned tabs that matched but were left open\n' +
    '  - by_domain (object): Map of domain to count\n' +
    '  - sample (array): First 10 tabs with {id, title, url}',
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: {
    tab_ids: z.array(z.union([z.number().int(), z.string()])).optional()
      .describe('Explicit tab IDs to close (numbers or composite like "chrome:123" from list_tabs).'),
    match: z.string().optional()
      .describe('Close every tab whose title or URL contains this substring (case-insensitive).'),
    duplicates: z.boolean().default(false)
      .describe('Close duplicate tabs, keeping the first occurrence of each URL.'),
    dry_run: z.boolean().default(false)
      .describe('Preview the tabs that would close — does not close anything. Recommended for bulk closes.'),
    expected_count: z.number().int().min(1).optional()
      .describe(`The number of tabs the user agreed to close, from the preview. Required above ${CONFIRM_COUNT_OVER} tabs.`),
    include_pinned: z.boolean().default(false)
      .describe('Also close pinned tabs that `match` or `duplicates` selects. Explicit `tab_ids` always include them.'),
    browser: z.string().optional()
      .describe('Optional browser filter ("chrome", "firefox") to limit close actions to a single browser.'),
  },

  execute: async ({ tab_ids, match, duplicates, dry_run, expected_count, include_pinned, browser }) => {
    let all;
    try {
      all = await callExtension('query_tabs');
    } catch (err) {
      console.error('Failed to fetch tabs:', err);
      throw new Error('Failed to fetch open tabs from extension.');
    }
    if (browser) {
      all = all.filter((t) => (t.browser || '').toLowerCase() === browser.toLowerCase());
    }

    const { targets, reason, pinnedKept } = selectCloseTargets(all, { tab_ids, match, duplicates, include_pinned });

    if (targets.length === 0) {
      const pinned = pinnedKept ? ` ${pinnedKept} pinned tab(s) matched and were left open; set include_pinned to close them.` : '';
      return `No tabs matched (${reason}). Nothing to close.${pinned}`;
    }

    const preview = {
      reason,
      count: targets.length,
      ...(pinnedKept ? { pinned_kept: pinnedKept } : {}),
      by_domain: targets.reduce((acc, t) => {
        const d = t.url ? domainOf(t) : '(no url)';
        acc[d] = (acc[d] ?? 0) + 1;
        return acc;
      }, {}),
      sample: targets.slice(0, 10).map((t) => ({
        id: t.browser ? `${t.browser}:${t.id}` : t.id,
        title: t.title || '(untitled)',
        url: t.url ?? '',
      })),
    };

    if (dry_run) {
      return JSON.stringify({ dry_run: true, ...preview }, null, 2);
    }

    checkExpectedCount(targets.length, expected_count, 'close');

    const res = await callExtension('close_tabs', {
      tab_ids: targets.map((t) => t.browserInstance ? `${t.browserInstance}:${t.id}` : t.browser ? `${t.browser}:${t.id}` : t.id),
      browser,
    });
    return JSON.stringify({ dry_run: false, closed: res.closed, ...preview, count: undefined }, null, 2);
  },
};
