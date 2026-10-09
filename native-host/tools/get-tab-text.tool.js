import { z } from 'zod';
import { callExtension } from '../bridge.js';

export const getTabTextTool = {
  name: 'get_tab_text',
  title: 'Get Tab Text',
  description:
    'Extract the plain body text content of a loaded browser tab using scripting. ' +
    'This allows reading and analyzing tab contents (e.g. for summarization or classification). ' +
    'Note: Fails on restricted internal browser pages (e.g., chrome://, edge://, or extensions) or if the tab is not loaded.',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: {
    tab_id: z.union([z.number().int(), z.string()])
      .describe('The numeric ID (or composite like "chrome:123") of the tab whose body text to extract.'),
    browser: z.string().optional()
      .describe('Optional browser hint ("chrome", "firefox") if tab_id is numeric.'),
  },

  execute: async ({ tab_id, browser }) => {
    const res = await callExtension('get_tab_text', { tab_id, browser });
    if (!res.text) {
      return `Tab ${tab_id} returned no text content (it might be empty, loading, or restricted).`;
    }
    return res.text;
  },
};
