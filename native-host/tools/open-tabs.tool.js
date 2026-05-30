import { z } from 'zod';
import { callExtension } from '../bridge.js';

export const openTabsTool = {
  name: 'open_tabs',
  title: 'Open Tabs',
  description:
    'Open one or more URLs in new Chrome tabs. This tool allows you to navigate the user to ' +
    'specific web pages or search queries.\n\n' +
    'Examples:\n' +
    '- {"urls": ["https://github.com", "https://youtube.com"]}\n' +
    '- {"urls": ["en.wikipedia.org/wiki/Palantir"]}\n\n' +
    'Returns:\n' +
    '  JSON object containing:\n' +
    '  - opened (int): Number of tabs successfully opened',
  annotations: {
    readOnlyHint: false,
    destructiveHint: false, // opening tabs is non-destructive
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: {
    urls: z.array(z.string()).min(1)
      .describe('An array of URLs to open. If no protocol is provided, https:// will be prepended automatically.'),
  },

  execute: async ({ urls }) => {
    if (!urls || urls.length === 0) {
      throw new Error('Provide at least one URL to open.');
    }

    const res = await callExtension('open_tabs', { urls });
    return JSON.stringify({ opened: res.opened }, null, 2);
  },
};
