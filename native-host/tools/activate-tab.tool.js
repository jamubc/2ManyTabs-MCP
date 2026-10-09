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
    tab_id: z.union([z.number().int(), z.string()])
      .describe('The numeric ID of the tab (or composite like "chrome:123") to activate.'),
    browser: z.string().optional()
      .describe('Optional browser hint ("chrome", "firefox") if tab_id is numeric.'),
  },

  execute: async ({ tab_id, browser }) => {
    const res = await callExtension('activate_tab', { tab_id, browser });
    return JSON.stringify({
      message: `Successfully activated tab ${tab_id}.`,
      tabId: res.activated,
    }, null, 2);
  },
};
