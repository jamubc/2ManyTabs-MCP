import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  snapshotDir, buildRecord, writeRecord, listRecords, readRecord, reopenCandidates,
} from './snapshots.js';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), '2manytabs-snap-'));

describe('snapshotDir', () => {
  it('uses the per-user app-data folder for each platform', () => {
    assert.equal(snapshotDir({}, 'darwin', '/Users/u'), '/Users/u/Library/Application Support/2manytabs/snapshots');
    assert.equal(snapshotDir({ XDG_STATE_HOME: '/s' }, 'linux', '/home/u'), '/s/2manytabs/snapshots');
    assert.equal(snapshotDir({}, 'linux', '/home/u'), '/home/u/.local/state/2manytabs/snapshots');
    assert.match(snapshotDir({ LOCALAPPDATA: 'C:\\L' }, 'win32', 'C:\\u'), /2manytabs.snapshots$/);
  });
  it('honours MANYTABS_SNAPSHOT_DIR', () => {
    assert.equal(snapshotDir({ MANYTABS_SNAPSHOT_DIR: '/x' }, 'darwin', '/Users/u'), '/x');
  });
});

describe('buildRecord', () => {
  it('groups tabs by browser window in tab order with group titles', () => {
    const rec = buildRecord([
      { browser: 'firefox', windowId: 1, index: 1, title: 'B', url: 'https://b.test/', groupId: 4 },
      { browser: 'firefox', windowId: 1, index: 0, title: 'A', url: 'https://a.test/', pinned: true, lastAccessed: 0 },
      { browser: 'chrome', windowId: 1, index: 0, title: 'C', url: 'https://c.test/', groupId: -1 },
    ], [{ browser: 'firefox', id: 4, title: 'Work' }], new Date(0));
    assert.equal(rec.tab_count, 3);
    assert.equal(rec.windows.length, 2);
    assert.deepEqual(rec.windows[0].tabs.map((t) => [t.title, t.group, t.pinned]), [['A', null, true], ['B', 'Work', false]]);
    assert.equal(rec.windows[0].tabs[0].lastAccessed, '1970-01-01T00:00:00.000Z');
  });
});

describe('writeRecord / readRecord', () => {
  it('writes owner-only files and never overwrites an earlier record', () => {
    const dir = tmp();
    const when = new Date(2026, 9, 12, 14, 15, 0);
    const a = writeRecord({ windows: [] }, dir, when);
    const b = writeRecord({ windows: [] }, dir, when);
    assert.equal(a.name, 'tabs-20261012-141500.json');
    assert.equal(b.name, 'tabs-20261012-141500-1.json');
    if (process.platform !== 'win32') assert.equal(fs.statSync(a.path).mode & 0o777, 0o600);
    assert.deepEqual(listRecords(dir), [a.name, b.name]);
  });

  it('reads the newest by default and rejects names that are not records', () => {
    const dir = tmp();
    writeRecord({ windows: [], n: 1 }, dir, new Date(2026, 0, 1));
    writeRecord({ windows: [], n: 2 }, dir, new Date(2026, 0, 2));
    assert.equal(readRecord(dir).record.n, 2);
    assert.throws(() => readRecord(dir, '../../etc/passwd'), /not a record name/);
    assert.throws(() => readRecord(dir, 'tabs-20990101-000000.json'), /No record named/);
    assert.throws(() => readRecord(tmp()), /snapshot_tabs first/);
  });
});

describe('reopenCandidates', () => {
  const rec = {
    windows: [
      { browser: 'firefox', tabs: [
        { title: 'Open now', url: 'https://open.test/' },
        { title: 'Video', url: 'https://youtube.com/watch?v=1' },
        { title: 'Video copy', url: 'https://youtube.com/watch?v=1' },
        { title: 'Script', url: 'javascript:alert(1)' },
        { title: 'Settings', url: 'about:preferences' },
      ] },
      { browser: 'chrome', tabs: [{ title: 'Docs', url: 'https://docs.test/' }] },
    ],
  };

  it('returns closed web tabs once each, with their browser', () => {
    const got = reopenCandidates(rec, [{ url: 'https://open.test/' }]);
    assert.deepEqual(got.map((t) => [t.browser, t.url]), [
      ['firefox', 'https://youtube.com/watch?v=1'], ['chrome', 'https://docs.test/'],
    ]);
  });

  it('narrows by title or URL', () => {
    assert.deepEqual(reopenCandidates(rec, [], 'DOCS').map((t) => t.title), ['Docs']);
  });
});
