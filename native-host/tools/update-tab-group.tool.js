import { z } from 'zod';
import { callExtension } from '../bridge.js';
import { GROUP_TITLE_DESCRIBE, groupTitleNote } from '../lib/tabs.js';

export const updateTabGroupTool = {
  name: 'update_tab_group',
  title: 'Update Tab Group',
  description:
    'Update properties of an existing native browser tab group, including ' +
    'its title, color, or collapsed/expanded state.',
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: {
    group_id: z.union([z.number().int(), z.string()])
      .describe('The ID (number or composite like "chrome:5") of the tab group to update (obtained from list_tab_groups or list_tabs).'),
    title: z.string().optional()
      .describe(GROUP_TITLE_DESCRIBE),
    color: z.enum(['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange']).optional()
      .describe('New color for the group.'),
    collapsed: z.boolean().optional()
      .describe('Whether the group should be collapsed (true) or expanded (false).'),
    browser: z.string().optional()
      .describe('Optional browser hint ("chrome", "firefox") if ids are numeric.'),
  },

  execute: async ({ group_id, title, color, collapsed, browser }) => {
    const res = await callExtension('update_group', { group_id, title, color, collapsed, browser });
    return JSON.stringify({
      message: `Successfully updated tab group ${group_id}.`,
      groupId: res.updated,
      title_note: groupTitleNote(title),
    }, null, 2);
  },
};
