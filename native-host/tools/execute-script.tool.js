import { z } from 'zod';
import { callExtension } from '../bridge.js';

const MAX_OUTPUT_CHARS = 50_000;

export const executeScriptTool = {
  name: 'execute_script',
  title: 'Execute Script in Tab',
  description:
    'Execute a JavaScript expression or script in the context of an open browser tab and return the serialized result. ' +
    'Useful for pulling elements from pages (e.g. images, links, tables, article bodies), clicking elements, or extracting dynamic DOM state. ' +
    'Firefox only: Chrome tabs return an error, so use a firefox: tab id. ' +
    'Fails on restricted system URLs (e.g. chrome://, about:, extensions).',
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: {
    tab_id: z.union([z.number().int(), z.string()])
      .describe('The target tab ID (number or composite ID like "chrome:12" or "firefox:34").'),
    script: z.string()
      .describe('The JavaScript code or expression to run in the tab. Can return a value or a Promise (e.g. Array.from(document.images).map(i => i.src)).'),
    browser: z.string().optional()
      .describe('Optional browser hint ("chrome", "firefox") if tab_id is numeric and ambiguous.'),
    world: z.enum(['ISOLATED', 'MAIN']).default('ISOLATED')
      .describe('Execution context world. "ISOLATED" (default) has full DOM access. "MAIN" runs in the page JavaScript window context.'),
  },

  execute: async ({ tab_id, script, browser, world }) => {
    const res = await callExtension('execute_script', { tab_id, script, browser, world });
    if (!res || res.success === false) {
      throw new Error(res?.error || 'Script execution failed without error details.');
    }

    const value = res.result;
    let output;
    if (typeof value === 'string') {
      output = value;
    } else if (value === null || value === undefined) {
      output = '(null / undefined returned)';
    } else {
      output = JSON.stringify(value, null, 2);
    }

    if (output.length > MAX_OUTPUT_CHARS) {
      output = output.slice(0, MAX_OUTPUT_CHARS) +
        `\n\n... [Result truncated: exceeded ${MAX_OUTPUT_CHARS} characters]`;
    }

    return output;
  },
};
