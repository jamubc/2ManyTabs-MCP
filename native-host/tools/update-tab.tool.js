import { z } from 'zod';
import { callExtension } from '../bridge.js';

export const updateTabTool = {
  name: 'update_tab',
  title: 'Update Tab',
  description:
    'Modify properties of an open browser tab, such as navigating it to a new URL, ' +
    'pinning/unpinning it, or muting/unmuting its audio.',
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: {
    tab_id: z.number().int()
      .describe('The numeric ID of the tab to update.'),
    url: z.string().optional()
      .describe('A new URL to navigate the tab to. If no protocol is provided, https:// will be prepended.'),
    pinned: z.boolean().optional()
      .describe('Set to true to pin the tab, or false to unpin it.'),
    muted: z.boolean().optional()
      .describe('Set to true to mute the tab, or false to unmute it.'),
  },

  execute: async ({ tab_id, url, pinned, muted }) => {
    const res = await callExtension('update_tab', { tab_id, url, pinned, muted });
    return JSON.stringify({
      message: `Successfully updated tab ${tab_id}.`,
      tabId: res.updated,
    }, null, 2);
  },
};
