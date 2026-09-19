import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: '.',
  manifest: ({ browser }) => ({
    name: '2ManyTabs MCP',
    description: 'Expose Chrome tabs to AI via MCP – sort 1000 tabs with Claude.',
    // tabGroups has no Firefox equivalent yet; feature-detected in lib/tab-ops.js,
    // but we also keep it out of Firefox's permission list entirely.
    permissions: [
      'tabs',
      'storage',
      'alarms',
      'scripting',
      ...(browser === 'firefox' ? [] : ['tabGroups']),
    ],
    host_permissions: ['http://localhost/*', 'http://127.0.0.1/*'],
    // Firefox-only: a permanent add-on id (can't change after first AMO submission)
    // plus the data-collection disclosure AMO requires on new listings. Nothing the
    // extension sees ever leaves the machine - it only talks to the local MCP host
    // over loopback - so this is a straight "none" declaration.
    ...(browser === 'firefox' ? {
      browser_specific_settings: {
        gecko: {
          id: '2manytabs-mcp@jamubc.github.io',
          data_collection_permissions: { required: ['none'] },
        },
      },
    } : {}),
    icons: {
      16: 'icon16.png',
      48: 'icon48.png',
      128: 'icon128.png',
    },
    action: {
      default_popup: 'popup.html',
      default_title: '2ManyTabs MCP',
      default_icon: {
        16: 'icon16.png',
        48: 'icon48.png',
        128: 'icon128.png',
      },
    },
  }),
});
