import { z } from 'zod';
import { callExtension } from '../bridge.js';

export const ungroupTabsTool = {
  name: 'ungroup_tabs',
  title: 'Ungroup Tabs',
  description: 'Remove one or more open tabs from their current native tab groups.',
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: {
    tab_ids: z.array(z.union([z.number().int(), z.string()])).min(1)
      .describe('Tab IDs to remove from any groups (numbers or composite like "chrome:12").'),
    browser: z.string().optional()
      .describe('Optional browser hint ("chrome", "firefox") if ids are numeric.'),
  },

  execute: async ({ tab_ids, browser }) => {
    const res = await callExtension('ungroup_tabs', { tab_ids, browser });
    return JSON.stringify({
      message: `Successfully ungrouped ${res.ungrouped} tab(s).`,
      ungrouped: res.ungrouped,
    }, null, 2);
  },
};
