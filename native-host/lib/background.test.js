// fallow-ignore-file unused-file
// Tests for extension/lib/tab-ops.js tab operation helpers.
// Runs from native-host/: node --test lib/background.test.js
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// browser + WebSocket stubs — must be set before tab-ops.js is imported.
// tab-ops.js references the bare `browser` global: WXT auto-imports it
// (backed by `chrome` on Chromium, native on Firefox) in the real extension
// build; here we stand in for that global directly.
// ---------------------------------------------------------------------------

function makeBrowser() {
  return {
    alarms: {
      create: () => {},
      onAlarm: { addListener: () => {} },
    },
    runtime: {
      onInstalled: { addListener: () => {} },
      onStartup: { addListener: () => {} },
    },
    storage: {
      local: {
        get: (_k, cb) => { if (cb) cb({}); return Promise.resolve({}); },
        set: () => Promise.resolve(),
      },
      onChanged: { addListener: () => {} },
    },
    tabs: {
      query: async () => [],
      get: async () => null,
      remove: async () => {},
      group: async () => 0,
      ungroup: async () => {},
      update: async () => {},
      create: async () => {},
    },
    tabGroups: {
      query: async () => [],
      update: async () => {},
    },
    scripting: {
      executeScript: async () => [{ result: '' }],
    },
    windows: {
      update: async () => {},
    },
  };
}

globalThis.browser = makeBrowser();

globalThis.WebSocket = class {
  static OPEN = 1;
  static CONNECTING = 0;
  constructor() { this.readyState = 3; }
  close() {}
};

// ---------------------------------------------------------------------------
// Import after globals are set
// ---------------------------------------------------------------------------

let groupTabs, updateGroup, updateTab, getTabText;

before(async () => {
  const bg = await import('../../extension/lib/tab-ops.js');
  groupTabs = bg.groupTabs;
  updateGroup = bg.updateGroup;
  updateTab = bg.updateTab;
  getTabText = bg.getTabText;
});

// ---------------------------------------------------------------------------
// groupTabs
// ---------------------------------------------------------------------------

describe('groupTabs', () => {
  it('throws when tabIds is empty', async () => {
    await assert.rejects(() => groupTabs([], undefined, undefined, undefined), /at least one/);
  });

  it('throws when no tab IDs are live', async () => {
    browser.tabs.query = async () => [{ id: 99 }];
    await assert.rejects(() => groupTabs([1, 2], undefined, undefined, undefined), /valid\/open/);
  });

  it('groups live tabs and returns groupId', async () => {
    browser.tabs.query = async () => [{ id: 1 }, { id: 2 }];
    browser.tabs.group = async ({ tabIds }) => { assert.deepEqual(tabIds, [1, 2]); return 42; };
    browser.tabGroups.update = async () => {};
    const result = await groupTabs([1, 2, 999], undefined, undefined, undefined);
    assert.equal(result.groupId, 42);
  });

  it('applies title and color when provided', async () => {
    browser.tabs.query = async () => [{ id: 5 }];
    browser.tabs.group = async () => 7;
    let updateArgs;
    browser.tabGroups.update = async (id, obj) => { updateArgs = { id, obj }; };
    await groupTabs([5], undefined, 'Work', 'blue');
    assert.deepEqual(updateArgs, { id: 7, obj: { title: 'Work', color: 'blue' } });
  });

  it('skips tabGroups.update when no title or color', async () => {
    browser.tabs.query = async () => [{ id: 3 }];
    browser.tabs.group = async () => 8;
    let called = false;
    browser.tabGroups.update = async () => { called = true; };
    await groupTabs([3], undefined, undefined, undefined);
    assert.equal(called, false);
  });
});

// ---------------------------------------------------------------------------
// updateGroup
// ---------------------------------------------------------------------------

describe('updateGroup', () => {
  it('throws for non-numeric groupId', async () => {
    await assert.rejects(() => updateGroup('bad', undefined, undefined, undefined), /numeric group ID/);
  });

  it('calls tabGroups.update with provided fields only', async () => {
    let called;
    browser.tabGroups.update = async (id, obj) => { called = { id, obj }; };
    await updateGroup(5, 'Docs', undefined, true);
    assert.deepEqual(called, { id: 5, obj: { title: 'Docs', collapsed: true } });
  });

  it('returns updated groupId', async () => {
    browser.tabGroups.update = async () => {};
    const result = await updateGroup(3, 'x', undefined, undefined);
    assert.equal(result.updated, 3);
  });
});

// ---------------------------------------------------------------------------
// updateTab
// ---------------------------------------------------------------------------

describe('updateTab', () => {
  it('throws for non-numeric tabId', async () => {
    await assert.rejects(() => updateTab('bad', undefined, undefined, undefined), /numeric tab ID/);
  });

  it('prepends https:// when url has no protocol', async () => {
    let updateArgs;
    browser.tabs.update = async (id, obj) => { updateArgs = { id, obj }; };
    await updateTab(1, 'example.com', undefined, undefined);
    assert.equal(updateArgs.obj.url, 'https://example.com');
  });

  it('leaves https:// url unchanged', async () => {
    let updateArgs;
    browser.tabs.update = async (id, obj) => { updateArgs = { id, obj }; };
    await updateTab(1, 'https://example.com', undefined, undefined);
    assert.equal(updateArgs.obj.url, 'https://example.com');
  });

  it('passes pinned and muted through', async () => {
    let updateArgs;
    browser.tabs.update = async (id, obj) => { updateArgs = { id, obj }; };
    await updateTab(2, undefined, true, false);
    assert.equal(updateArgs.obj.pinned, true);
    assert.equal(updateArgs.obj.muted, false);
  });

  it('returns updated tabId', async () => {
    browser.tabs.update = async () => {};
    const result = await updateTab(9, undefined, undefined, undefined);
    assert.equal(result.updated, 9);
  });
});

// ---------------------------------------------------------------------------
// getTabText
// ---------------------------------------------------------------------------

describe('getTabText', () => {
  it('throws for non-numeric tabId', async () => {
    await assert.rejects(() => getTabText('bad'), /numeric tab ID/);
  });

  it('throws when tab not found', async () => {
    browser.tabs.get = async () => null;
    await assert.rejects(() => getTabText(1), /not found/);
  });

  it('throws for restricted chrome:// URLs', async () => {
    browser.tabs.get = async () => ({ url: 'chrome://extensions' });
    await assert.rejects(() => getTabText(1), /restricted/);
  });

  it('throws for chrome-extension:// URLs', async () => {
    browser.tabs.get = async () => ({ url: 'chrome-extension://abc/popup.html' });
    await assert.rejects(() => getTabText(1), /restricted/);
  });

  it('throws for edge:// URLs', async () => {
    browser.tabs.get = async () => ({ url: 'edge://settings' });
    await assert.rejects(() => getTabText(1), /restricted/);
  });

  it('returns text from scripting result', async () => {
    browser.tabs.get = async () => ({ url: 'https://example.com' });
    browser.scripting.executeScript = async () => [{ result: 'Hello world' }];
    const result = await getTabText(1);
    assert.equal(result.text, 'Hello world');
  });

  it('returns empty text when scripting result is empty', async () => {
    browser.tabs.get = async () => ({ url: 'https://example.com' });
    browser.scripting.executeScript = async () => [];
    const result = await getTabText(1);
    assert.equal(result.text, '');
  });
});
