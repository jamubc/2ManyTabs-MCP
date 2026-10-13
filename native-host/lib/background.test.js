import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

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

let queryTabs, groupTabs, updateGroup, updateTab, getTabText, executeScript;

before(async () => {
  const bg = await import('../../extension/lib/tab-ops.js');
  queryTabs = bg.queryTabs;
  groupTabs = bg.groupTabs;
  updateGroup = bg.updateGroup;
  updateTab = bg.updateTab;
  getTabText = bg.getTabText;
  executeScript = bg.executeScript;
});

describe('queryTabs', () => {
  it('passes lastAccessed through, and leaves it undefined when the browser omits it', async () => {
    browser.tabs.query = async () => [
      { id: 1, windowId: 1, title: 'A', url: 'https://a.test/', lastAccessed: 1760000000000 },
      { id: 2, windowId: 1, title: 'B', url: 'https://b.test/' },
    ];
    const tabs = await queryTabs();
    assert.equal(tabs[0].lastAccessed, 1760000000000);
    assert.equal(tabs[1].lastAccessed, undefined);
  });
});

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

  it('keeps tabs in their own windows: one matching group per window', async () => {
    browser.tabs.query = async () => [
      { id: 1, windowId: 10 }, { id: 2, windowId: 20 }, { id: 3, windowId: 10 },
    ];
    const groupCalls = [];
    browser.tabs.group = async (opts) => { groupCalls.push(opts); return 100 + groupCalls.length; };
    const updates = [];
    browser.tabGroups.update = async (id, obj) => { updates.push({ id, obj }); };
    const result = await groupTabs([1, 2, 3], undefined, 'Read later', 'purple');
    assert.deepEqual(groupCalls, [
      { tabIds: [1, 3], createProperties: { windowId: 10 } },
      { tabIds: [2], createProperties: { windowId: 20 } },
    ]);
    assert.deepEqual(updates.map(u => u.obj), [
      { title: 'Read later', color: 'purple' },
      { title: 'Read later', color: 'purple' },
    ]);
    assert.deepEqual(result, { groupId: 101, groupIds: [101, 102], grouped: 3, windows: 2 });
  });

  it('adds to an existing group only in its window, and copies its look elsewhere', async () => {
    browser.tabs.query = async () => [{ id: 1, windowId: 10 }, { id: 2, windowId: 20 }];
    browser.tabGroups.get = async () => ({ windowId: 10, title: 'Work', color: 'blue' });
    const groupCalls = [];
    browser.tabs.group = async (opts) => { groupCalls.push(opts); return opts.groupId ?? 55; };
    const updates = [];
    browser.tabGroups.update = async (id, obj) => { updates.push({ id, obj }); };
    await groupTabs([1, 2], 7, undefined, undefined);
    assert.deepEqual(groupCalls, [
      { tabIds: [1], groupId: 7 },
      { tabIds: [2], createProperties: { windowId: 20 } },
    ]);
    assert.deepEqual(updates, [{ id: 55, obj: { title: 'Work', color: 'blue' } }]);
  });

  it('puts the user back on the tab and window they were on', async () => {
    let state = [
      { id: 1, windowId: 10, active: true }, { id: 2, windowId: 10, active: false },
    ];
    browser.tabs.query = async () => state;
    browser.tabs.group = async () => {
      // Simulate a browser that switched the active tab while grouping.
      state = [{ id: 1, windowId: 10, active: false }, { id: 2, windowId: 10, active: true }];
      return 9;
    };
    browser.tabGroups.update = async () => {};
    const focused = [10, 20];
    browser.windows.getLastFocused = async () => ({ id: focused.shift() });
    const activated = [];
    browser.tabs.update = async (id, props) => { activated.push({ id, props }); };
    const focusedWindows = [];
    browser.windows.update = async (id, props) => { focusedWindows.push({ id, props }); };
    await groupTabs([2], undefined, undefined, undefined);
    assert.deepEqual(activated, [{ id: 1, props: { active: true } }]);
    assert.deepEqual(focusedWindows, [{ id: 10, props: { focused: true } }]);
    delete browser.windows.getLastFocused;
  });
});

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

describe('executeScript', () => {
  it('throws when tabId is not a number', async () => {
    await assert.rejects(() => executeScript('1', 'return 1;'), /numeric tab ID/);
  });

  it('throws when script is not a non-empty string', async () => {
    await assert.rejects(() => executeScript(1, ''), /non-empty script string/);
  });

  it('throws when tab is not found', async () => {
    browser.tabs.get = async () => null;
    await assert.rejects(() => executeScript(999, 'return 1;'), /not found/);
  });

  it('throws for restricted chrome:// URLs', async () => {
    browser.tabs.get = async () => ({ url: 'chrome://extensions' });
    await assert.rejects(() => executeScript(1, 'return 1;'), /restricted/);
  });

  it('throws for restricted about: URLs', async () => {
    browser.tabs.get = async () => ({ url: 'about:config' });
    await assert.rejects(() => executeScript(1, 'return 1;'), /restricted/);
  });

  it('executes and returns serialized result', async () => {
    browser.tabs.get = async () => ({ url: 'https://example.com' });
    browser.scripting.executeScript = async () => [{ result: { success: true, result: ['img1.png', 'img2.png'] } }];
    const res = await executeScript(1, 'Array.from(document.images).map(i => i.src)');
    assert.equal(res.success, true);
    assert.deepEqual(res.result, ['img1.png', 'img2.png']);
  });

  it('propagates execution errors returned from func', async () => {
    browser.tabs.get = async () => ({ url: 'https://example.com' });
    browser.scripting.executeScript = async () => [{ result: { success: false, error: 'ReferenceError: foo is not defined' } }];
    const res = await executeScript(1, 'foo.bar()');
    assert.equal(res.success, false);
    assert.match(res.error, /ReferenceError/);
  });
});

