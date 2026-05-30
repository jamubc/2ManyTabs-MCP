// Tool registry — the single place that knows which tools exist.
// To add a tool: create ./my-thing.tool.js exporting a tool object, then add it here.
// host.js handles all SDK wiring (schema generation, validation, dispatch) generically.

import { listTabsTool }  from './list-tabs.tool.js';
import { closeTabsTool } from './close-tabs.tool.js';
import { openTabsTool }  from './open-tabs.tool.js';

export const toolRegistry = [
  listTabsTool,
  closeTabsTool,
  openTabsTool,
];
