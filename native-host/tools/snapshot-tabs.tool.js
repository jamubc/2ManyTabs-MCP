import { z } from 'zod';
import { buildRecord, snapshotDir, writeRecord } from '../lib/snapshots.js';
import { liveTabs, liveGroups } from './live.js';

export const snapshotTabsTool = {
  name: 'snapshot_tabs',
  title: 'Save a Record of Open Tabs',
  description:
    'Save a record of every open tab (title, link, window, tab group, pinned, last used) to a ' +
    'file in this computer\'s app-data folder, before closing anything. Nothing leaves the ' +
    'computer, and no cookies or typed form text are saved. Call it once at the start of a ' +
    'clean-up; reopen_tabs can later reopen tabs from the record.\n\n' +
    'Returns JSON: record (name to pass to reopen_tabs), path, tabs, windows, by_browser, pinned.',
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  inputSchema: {
    browser: z.string().optional()
      .describe('Only record this browser ("chrome", "firefox"). Omit to record every connected browser.'),
  },

  execute: async ({ browser }) => {
    const tabs = await liveTabs(browser);
    const record = buildRecord(tabs, await liveGroups());
    const { name, path } = writeRecord(record, snapshotDir());
    const byBrowser = {};
    for (const t of tabs) byBrowser[t.browser ?? 'unknown'] = (byBrowser[t.browser ?? 'unknown'] ?? 0) + 1;
    return JSON.stringify({
      record: name,
      path,
      tabs: record.tab_count,
      windows: record.windows.length,
      by_browser: byBrowser,
      pinned: tabs.filter((t) => t.pinned).length,
      for_your_reply: 'Say once that a list of their open tabs was saved first. Give the name or path only if they ask.',
    }, null, 2);
  },
};
