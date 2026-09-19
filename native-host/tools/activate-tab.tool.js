import { z } from 'zod';
import { callExtension } from '../bridge.js';

export const activateTabTool = {
  name: 'activate_tab',
  title: 'Activate Tab',
  description:
    'Bring a specific browser tab to the foreground. This activates the tab ' +
    'and focuses its containing window so the user sees it immediately.',
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: {
    tab_id: z.number().int()
      .describe('The numeric ID of the tab to activate.'),
  },

  execute: async ({ tab_id }) => {
    const res = await callExtension('activate_tab', { tab_id });
    return JSON.stringify({
      message: `Successfully activated tab ${tab_id}.`,
      tabId: res.activated,
    }, null, 2);
  },
};
