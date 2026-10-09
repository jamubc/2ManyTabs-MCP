import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: '.',
  manifest: ({ browser }) => ({
    name: '2ManyTabs MCP',
    description: 'Expose your browser tabs to AI via MCP: sort 1000 tabs with Claude.',
    permissions: [
      'tabs',
      'storage',
      'alarms',
      'scripting',
      'tabGroups',
    ],
    host_permissions: ['http://localhost/*', 'http://127.0.0.1/*', '*://*/*'],
    ...(browser === 'firefox' ? {
      browser_specific_settings: {
        gecko: {
          id: '2manytabs-mcp@jamubc.github.io',
          strict_min_version: '139.0',
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
