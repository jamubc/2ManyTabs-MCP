import { z } from 'zod';
import { callExtension } from '../bridge.js';
import { GROUP_TITLE_DESCRIBE, groupTitleNote } from '../lib/tabs.js';

export const groupTabsTool = {
  name: 'group_tabs',
  title: 'Group Tabs',
  description:
    'Group open tabs into native browser tab groups. Can create a new group or ' +
    'add tabs to an existing group. Optionally set a title and a color for the group. ' +
    'Tabs stay in their own windows: a group cannot span windows, so tabs from several ' +
    'windows become one matching group per window. Grouping does move tabs next to each ' +
    'other in the tab bar while the user may be using it, so say that before you group. ' +
    'The user is left on the tab they were on.',
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
      .describe(GROUP_TITLE_DESCRIBE),
    color: z.enum(['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange']).optional()
      .describe('Color to set on the group (new or existing).'),
    browser: z.string().optional()
      .describe('Optional browser hint ("chrome", "firefox") if ids are numeric.'),
  },

  execute: async ({ tab_ids, group_id, title, color, browser }) => {
    const res = await callExtension('group_tabs', { tab_ids, group_id, title, color, browser });
    const grouped = res.grouped ?? tab_ids.length;
    const windows = res.windows ?? 1;
    return JSON.stringify({
      message: windows > 1
        ? `Grouped ${grouped} tab(s) as ${windows} matching groups, one per window. No tab changed window.`
        : `Grouped ${grouped} tab(s).`,
      groupId: res.groupId,
      groupIds: res.groupIds ?? [res.groupId],
      title_note: groupTitleNote(title),
    }, null, 2);
  },
};
