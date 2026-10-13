import { z } from 'zod';
import { callExtension } from '../bridge.js';
import { checkExpectedCount, CONFIRM_COUNT_OVER } from '../lib/tabs.js';
import { readRecord, reopenCandidates, snapshotDir } from '../lib/snapshots.js';
import { liveTabs } from './live.js';

const MAX_REOPEN = 100; // more at once can stall a browser; ask for a narrower match

export const reopenTabsTool = {
  name: 'reopen_tabs',
  title: 'Reopen Tabs from a Record',
  description:
    'Reopen tabs saved by snapshot_tabs that are no longer open, in the browser they came ' +
    'from. Narrow with `match` (substring of title or URL). Preview with `dry_run` first. ' +
    `Reopening more than ${CONFIRM_COUNT_OVER} tabs needs \`expected_count\` from the preview, ` +
    `and at most ${MAX_REOPEN} open per call. Only web and file links are reopened.\n\n` +
    'Returns JSON: record, dry_run, count (or opened), sample of up to 10 {title, url}.',
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  inputSchema: {
    record: z.string().optional()
      .describe('Record name returned by snapshot_tabs, e.g. "tabs-20261012-141500.json". Omit for the newest.'),
    match: z.string().optional()
      .describe('Only reopen tabs whose title or URL contains this substring (case-insensitive).'),
    dry_run: z.boolean().default(false)
      .describe('Preview what would reopen without opening anything.'),
    expected_count: z.number().int().min(1).optional()
      .describe(`The number of tabs the user agreed to reopen, from the preview. Required above ${CONFIRM_COUNT_OVER}.`),
  },

  execute: async ({ record, match, dry_run, expected_count }) => {
    const { name, record: rec } = readRecord(snapshotDir(), record);
    const targets = reopenCandidates(rec, await liveTabs(), match);
    const sample = targets.slice(0, 10).map(({ title, url }) => ({ title, url }));
    if (targets.length === 0) {
      return `Nothing to reopen from ${name}${match ? ` matching "${match}"` : ''}: every such tab is already open.`;
    }
    if (dry_run) return JSON.stringify({ record: name, dry_run: true, count: targets.length, sample }, null, 2);

    checkExpectedCount(targets.length, expected_count, 'reopen');
    if (targets.length > MAX_REOPEN) {
      throw new Error(`That is ${targets.length} tabs; reopen at most ${MAX_REOPEN} at a time. Use a narrower match.`);
    }

    const byBrowser = new Map();
    for (const t of targets) {
      if (!byBrowser.has(t.browser)) byBrowser.set(t.browser, []);
      byBrowser.get(t.browser).push(t.url);
    }
    let opened = 0;
    for (const [browser, urls] of byBrowser) {
      const res = await callExtension('open_tabs', browser ? { urls, browser } : { urls });
      opened += res?.opened ?? 0;
    }
    return JSON.stringify({ record: name, dry_run: false, opened, sample }, null, 2);
  },
};
