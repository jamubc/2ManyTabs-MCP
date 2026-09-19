import { z } from 'zod';
import { callExtension } from '../bridge.js';

export const ungroupTabsTool = {
  name: 'ungroup_tabs',
  title: 'Ungroup Tabs',
  description: 'Remove one or more open Chrome tabs from their current native Tab Groups.',
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: {
    tab_ids: z.array(z.number().int()).min(1)
      .describe('Array of tab IDs to remove from any groups.'),
  },

  execute: async ({ tab_ids }) => {
    const res = await callExtension('ungroup_tabs', { tab_ids });
    return JSON.stringify({
      message: `Successfully ungrouped ${res.ungrouped} tab(s).`,
      ungrouped: res.ungrouped,
    }, null, 2);
  },
};
