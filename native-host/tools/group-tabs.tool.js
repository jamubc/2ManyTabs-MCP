import { z } from 'zod';
import { callExtension } from '../bridge.js';

export const groupTabsTool = {
  name: 'group_tabs',
  title: 'Group Tabs',
  description:
    'Group open Chrome tabs into native Chrome Tab Groups. Can create a new group or ' +
    'add tabs to an existing group. Optionally set a title and a color for the group.',
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: {
    tab_ids: z.array(z.number().int()).min(1)
      .describe('Array of tab IDs to add to the group.'),
    group_id: z.number().int().optional()
      .describe('Add to an existing group ID. If omitted, a new group is created.'),
    title: z.string().optional()
      .describe('Title to set on the group (new or existing).'),
    color: z.enum(['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange']).optional()
      .describe('Color to set on the group (new or existing).'),
  },

  execute: async ({ tab_ids, group_id, title, color }) => {
    const res = await callExtension('group_tabs', { tab_ids, group_id, title, color });
    return JSON.stringify({
      message: `Successfully grouped ${tab_ids.length} tab(s).`,
      groupId: res.groupId,
    }, null, 2);
  },
};
