import { listTabsTool }  from './list-tabs.tool.js';
import { closeTabsTool } from './close-tabs.tool.js';
import { openTabsTool }  from './open-tabs.tool.js';
import { listTabGroupsTool } from './list-tab-groups.tool.js';
import { groupTabsTool } from './group-tabs.tool.js';
import { ungroupTabsTool } from './ungroup-tabs.tool.js';
import { updateTabGroupTool } from './update-tab-group.tool.js';
import { activateTabTool } from './activate-tab.tool.js';
import { updateTabTool } from './update-tab.tool.js';
import { getTabTextTool } from './get-tab-text.tool.js';
import { executeScriptTool } from './execute-script.tool.js';
import { startTabCleanupTool } from './start-tab-cleanup.tool.js';
import { snapshotTabsTool } from './snapshot-tabs.tool.js';
import { clusterTabsTool } from './cluster-tabs.tool.js';
import { reopenTabsTool } from './reopen-tabs.tool.js';

export const toolRegistry = [
  startTabCleanupTool,
  listTabsTool,
  clusterTabsTool,
  snapshotTabsTool,
  closeTabsTool,
  reopenTabsTool,
  openTabsTool,
  listTabGroupsTool,
  groupTabsTool,
  ungroupTabsTool,
  updateTabGroupTool,
  activateTabTool,
  updateTabTool,
  getTabTextTool,
  executeScriptTool,
];
