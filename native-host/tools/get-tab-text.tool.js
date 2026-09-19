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
    tab_id: z.number().int()
      .describe('The numeric ID of the tab whose body text to extract.'),
  },

  execute: async ({ tab_id }) => {
    const res = await callExtension('get_tab_text', { tab_id });
    if (!res.text) {
      return `Tab ${tab_id} returned no text content (it might be empty, loading, or restricted).`;
    }
    return res.text;
  },
};
