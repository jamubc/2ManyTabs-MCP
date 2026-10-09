import { z } from 'zod';
import { callExtension } from '../bridge.js';

export const groupTabsTool = {
  name: 'group_tabs',
  title: 'Group Tabs',
  description:
    'Group open tabs into native browser tab groups. Can create a new group or ' +
    'add tabs to an existing group. Optionally set a title and a color for the group.',
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: {
    tab_ids: z.array(z.union([z.number().int(), z.string()])).min(1)
      .describe('Tab IDs to add to the group (numbers or composite like "chrome:12"). All must be in the same browser.'),
    group_id: z.union([z.number().int(), z.string()]).optional()
      .describe('Add to an existing group ID (number or composite like "chrome:5"). If omitted, a new group is created.'),
    title: z.string().optional()
      .describe('Title to set on the group (new or existing).'),
    color: z.enum(['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange']).optional()
      .describe('Color to set on the group (new or existing).'),
    browser: z.string().optional()
      .describe('Optional browser hint ("chrome", "firefox") if ids are numeric.'),
  },

  execute: async ({ tab_ids, group_id, title, color, browser }) => {
    const res = await callExtension('group_tabs', { tab_ids, group_id, title, color, browser });
    return JSON.stringify({
      message: `Successfully grouped ${tab_ids.length} tab(s).`,
      groupId: res.groupId,
    }, null, 2);
  },
};
