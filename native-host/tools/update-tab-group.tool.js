import { z } from 'zod';
import { callExtension } from '../bridge.js';

export const updateTabGroupTool = {
  name: 'update_tab_group',
  title: 'Update Tab Group',
  description:
    'Update properties of an existing native Chrome Tab Group, including ' +
    'its title, color, or collapsed/expanded state.',
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: {
    group_id: z.number().int()
      .describe('The numeric ID of the tab group to update (obtained from list_tab_groups or list_tabs).'),
    title: z.string().optional()
      .describe('New title for the group.'),
    color: z.enum(['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange']).optional()
      .describe('New color for the group.'),
    collapsed: z.boolean().optional()
      .describe('Whether the group should be collapsed (true) or expanded (false).'),
  },

  execute: async ({ group_id, title, color, collapsed }) => {
    const res = await callExtension('update_group', { group_id, title, color, collapsed });
    return JSON.stringify({
      message: `Successfully updated tab group ${group_id}.`,
      groupId: res.updated,
    }, null, 2);
  },
};
