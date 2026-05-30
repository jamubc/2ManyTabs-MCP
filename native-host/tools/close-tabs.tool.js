import { z } from 'zod';
import { callExtension } from '../bridge.js';
import { matchesQuery, findDuplicateIds, domainOf } from '../lib/tabs.js';

// ACT tool. Absorbs the old close_tabs + close_tabs_matching + close_duplicate_tabs.
// Exactly one selection mode must be supplied. `dry_run` previews without closing —
// the safe way to verify a bulk close of hundreds of tabs before committing.
export const closeTabsTool = {
  name: 'close_tabs',
  title: 'Close Tabs',
  description:
    'Close Chrome tabs by one selection mode: `tab_ids` (explicit), `match` (substring of ' +
    'title/URL), or `duplicates` (every tab sharing a URL with an earlier one). Set `dry_run` ' +
    'to preview the exact tabs that would close without touching them. Destructive — closed ' +
    'tabs cannot be recovered through this tool.',
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: {
    tab_ids: z.array(z.number().int()).optional()
      .describe('Explicit tab IDs to close (from list_tabs).'),
    match: z.string().optional()
      .describe('Close every tab whose title or URL contains this substring (case-insensitive).'),
    duplicates: z.boolean().default(false)
      .describe('Close duplicate tabs, keeping the first occurrence of each URL.'),
    dry_run: z.boolean().default(false)
      .describe('Preview the tabs that would close — does not close anything. Recommended for bulk closes.'),
  },

  execute: async ({ tab_ids, match, duplicates, dry_run }) => {
    // Enforce exactly one selection mode.
    const modes = [tab_ids?.length ? 'tab_ids' : null, match ? 'match' : null, duplicates ? 'duplicates' : null]
      .filter(Boolean);
    if (modes.length === 0) {
      throw new Error('Provide one selection mode: tab_ids, match, or duplicates:true.');
    }
    if (modes.length > 1) {
      throw new Error(`Use only one selection mode at a time (got: ${modes.join(', ')}).`);
    }

    const all = await callExtension('query_tabs');
    const byId = new Map(all.map((t) => [t.id, t]));

    let targets, reason;
    if (tab_ids?.length) {
      targets = tab_ids.filter((id) => byId.has(id)).map((id) => byId.get(id));
      reason = `${targets.length} tab(s) by id`;
      const missing = tab_ids.filter((id) => !byId.has(id));
      if (missing.length) reason += ` (${missing.length} id(s) no longer exist, skipped)`;
    } else if (duplicates) {
      const dupIds = new Set(findDuplicateIds(all));
      targets = all.filter((t) => dupIds.has(t.id));
      reason = 'duplicate tabs';
    } else {
      targets = all.filter((t) => matchesQuery(t, match));
      reason = `tabs matching "${match}"`;
    }

    if (targets.length === 0) {
      return `No tabs matched (${reason}). Nothing to close.`;
    }

    const preview = {
      reason,
      count: targets.length,
      by_domain: targets.reduce((acc, t) => {
        const d = domainOf(t);
        acc[d] = (acc[d] ?? 0) + 1;
        return acc;
      }, {}),
      sample: targets.slice(0, 10).map((t) => ({ id: t.id, title: t.title || '(untitled)' })),
    };

    if (dry_run) {
      return `🔎 DRY RUN — would close ${targets.length} tab(s):\n` + JSON.stringify(preview, null, 2);
    }

    const res = await callExtension('close_tabs', { tab_ids: targets.map((t) => t.id) });
    return `✅ Closed ${res.closed} tab(s) (${reason}).\n` + JSON.stringify(preview.by_domain, null, 2);
  },
};
