import { cleanupGuide } from '../lib/guide.js';

export const startTabCleanupTool = {
  name: 'start_tab_cleanup',
  title: 'Start a Tab Clean-up',
  description:
    'Call this first when the user has too many tabs, wants to clean up, close, sort or dedupe ' +
    'lots of tabs, or feels stuck or stressed about closing them. Returns the step-by-step ' +
    'method to follow: save a record, sort tabs into clusters, close what the user confirms, ' +
    'and park the few real to-dos with a next step and a when, in the user\'s own words. ' +
    'Read-only; it does not touch any tab.',
  annotations: { readOnlyHint: true, openWorldHint: false },
  inputSchema: {},

  execute: async () => cleanupGuide(),
};
