// fallow-ignore-file unused-file
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  domainOf,
  matchesQuery,
  findDuplicateIds,
  domainHistogram,
  groupByDomain,
  groupByWindow,
  compact,
  getGroupPrefix,
} from './tabs.js';

// ---------------------------------------------------------------------------
// domainOf
// ---------------------------------------------------------------------------
describe('domainOf', () => {
  it('extracts hostname from https URL', () => {
    assert.equal(domainOf({ url: 'https://www.example.com/path' }), 'www.example.com');
  });

  it('extracts hostname from http URL', () => {
    assert.equal(domainOf({ url: 'http://github.com/repo' }), 'github.com');
  });

  it('returns (local) for file:// URL', () => {
    assert.equal(domainOf({ url: 'file:///Users/me/index.html' }), '(local)');
  });

  it('returns chrome:// prefix for chrome: protocol with hostname', () => {
    assert.equal(domainOf({ url: 'chrome://extensions' }), 'chrome://extensions');
  });

  it('returns chrome:// prefix for chrome: protocol with no hostname', () => {
    assert.equal(domainOf({ url: 'chrome://newtab/' }), 'chrome://newtab');
  });

  it('handles chrome-extension:// URLs', () => {
    const result = domainOf({ url: 'chrome-extension://abcdefg/popup.html' });
    assert.equal(result, 'chrome-extension://abcdefg');
  });

  it('throws on invalid URL', () => {
    assert.throws(() => domainOf({ url: 'not-a-url' }), Error);
  });

  it('throws on missing url', () => {
    assert.throws(() => domainOf({}), Error);
  });

  it('throws on null url', () => {
    assert.throws(() => domainOf({ url: null }), Error);
  });

  it('does not strip www from domain', () => {
    assert.equal(domainOf({ url: 'https://www.google.com/' }), 'www.google.com');
  });
});

// ---------------------------------------------------------------------------
// matchesQuery
// ---------------------------------------------------------------------------
describe('matchesQuery', () => {
  it('matches substring in title (case-insensitive)', () => {
    assert.equal(matchesQuery({ title: 'GitHub Issues', url: 'https://github.com' }, 'issues'), true);
  });

  it('matches substring in url (case-insensitive)', () => {
    assert.equal(matchesQuery({ title: 'Some Page', url: 'https://EXAMPLE.COM/page' }, 'example'), true);
  });

  it('returns false when no match', () => {
    assert.equal(matchesQuery({ title: 'Hello', url: 'https://hello.com' }, 'github'), false);
  });

  it('matches empty string (always true)', () => {
    assert.equal(matchesQuery({ title: 'Anything', url: 'https://example.com' }, ''), true);
  });

  it('returns true for empty string against missing title and url', () => {
    assert.equal(matchesQuery({}, ''), true);
  });

  it('handles missing title gracefully', () => {
    assert.equal(matchesQuery({ url: 'https://example.com/test' }, 'test'), true);
    assert.equal(matchesQuery({ url: 'https://example.com' }, 'zzzz'), false);
  });

  it('handles missing url gracefully', () => {
    assert.equal(matchesQuery({ title: 'Hello World' }, 'world'), true);
    assert.equal(matchesQuery({ title: 'Hello' }, 'zzzz'), false);
  });

  it('handles null title and url', () => {
    assert.equal(matchesQuery({ title: null, url: null }, 'test'), false);
    assert.equal(matchesQuery({ title: null, url: null }, ''), true);
  });
});

// ---------------------------------------------------------------------------
// findDuplicateIds
// ---------------------------------------------------------------------------
describe('findDuplicateIds', () => {
  it('returns empty array for empty input', () => {
    assert.deepEqual(findDuplicateIds([]), []);
  });

  it('returns empty array when no duplicates', () => {
    const tabs = [
      { id: 1, url: 'https://a.com' },
      { id: 2, url: 'https://b.com' },
    ];
    assert.deepEqual(findDuplicateIds(tabs), []);
  });

  it('returns id of second occurrence, not first', () => {
    const tabs = [
      { id: 1, url: 'https://a.com' },
      { id: 2, url: 'https://a.com' },
    ];
    assert.deepEqual(findDuplicateIds(tabs), [2]);
  });

  it('returns ids of all subsequent occurrences', () => {
    const tabs = [
      { id: 1, url: 'https://a.com' },
      { id: 2, url: 'https://a.com' },
      { id: 3, url: 'https://a.com' },
    ];
    assert.deepEqual(findDuplicateIds(tabs), [2, 3]);
  });

  it('handles multiple distinct URLs with duplicates', () => {
    const tabs = [
      { id: 1, url: 'https://a.com' },
      { id: 2, url: 'https://b.com' },
      { id: 3, url: 'https://a.com' },
      { id: 4, url: 'https://b.com' },
    ];
    assert.deepEqual(findDuplicateIds(tabs), [3, 4]);
  });

  it('handles single tab', () => {
    assert.deepEqual(findDuplicateIds([{ id: 1, url: 'https://a.com' }]), []);
  });
});

// ---------------------------------------------------------------------------
// domainHistogram
// ---------------------------------------------------------------------------
describe('domainHistogram', () => {
  it('returns empty array for empty input', () => {
    assert.deepEqual(domainHistogram([]), []);
  });

  it('returns domain counts sorted by count descending', () => {
    const tabs = [
      { url: 'https://a.com/1' },
      { url: 'https://a.com/2' },
      { url: 'https://a.com/3' },
      { url: 'https://b.com/1' },
      { url: 'https://b.com/2' },
      { url: 'https://c.com/1' },
    ];
    const hist = domainHistogram(tabs);
    assert.equal(hist[0].domain, 'a.com');
    assert.equal(hist[0].count, 3);
    assert.equal(hist[1].domain, 'b.com');
    assert.equal(hist[1].count, 2);
    assert.equal(hist[2].domain, 'c.com');
    assert.equal(hist[2].count, 1);
  });

  it('each entry has {domain, count} shape', () => {
    const tabs = [{ url: 'https://x.com/page' }];
    const [entry] = domainHistogram(tabs);
    assert.equal(typeof entry.domain, 'string');
    assert.equal(typeof entry.count, 'number');
  });

  it('respects limit parameter', () => {
    const tabs = Array.from({ length: 20 }, (_, i) => ({
      url: `https://domain${i}.com/page`,
    }));
    const hist = domainHistogram(tabs, 5);
    assert.equal(hist.length, 5);
  });

  it('default limit of 15 is applied', () => {
    const tabs = Array.from({ length: 20 }, (_, i) => ({
      url: `https://domain${i}.com/page`,
    }));
    const hist = domainHistogram(tabs);
    assert.equal(hist.length, 15);
  });

  it('single tab returns one entry', () => {
    const hist = domainHistogram([{ url: 'https://single.com' }]);
    assert.equal(hist.length, 1);
    assert.equal(hist[0].domain, 'single.com');
    assert.equal(hist[0].count, 1);
  });
});

// ---------------------------------------------------------------------------
// groupByDomain
// ---------------------------------------------------------------------------
describe('groupByDomain', () => {
  it('returns empty object for empty input', () => {
    assert.deepEqual(groupByDomain([]), {});
  });

  it('groups tabs by domain with correct structure', () => {
    const tabs = [
      { id: 1, url: 'https://a.com/1', title: 'A1' },
      { id: 2, url: 'https://a.com/2', title: 'A2' },
      { id: 3, url: 'https://b.com/1', title: 'B1' },
    ];
    const groups = groupByDomain(tabs);
    assert.ok('a.com' in groups);
    assert.ok('b.com' in groups);
    assert.equal(groups['a.com'].count, 2);
    assert.equal(groups['b.com'].count, 1);
    assert.deepEqual(groups['a.com'].tab_ids, [1, 2]);
    assert.deepEqual(groups['b.com'].tab_ids, [3]);
  });

  it('sorts domains by count descending', () => {
    const tabs = [
      { id: 1, url: 'https://rare.com/1', title: 'R' },
      { id: 2, url: 'https://common.com/1', title: 'C1' },
      { id: 3, url: 'https://common.com/2', title: 'C2' },
      { id: 4, url: 'https://common.com/3', title: 'C3' },
    ];
    const groups = groupByDomain(tabs);
    const keys = Object.keys(groups);
    assert.equal(keys[0], 'common.com');
    assert.equal(keys[1], 'rare.com');
  });

  it('sample_titles uses (untitled) for tabs with missing title', () => {
    const tabs = [
      { id: 1, url: 'https://a.com', title: undefined },
    ];
    const groups = groupByDomain(tabs);
    assert.deepEqual(groups['a.com'].sample_titles, ['(untitled)']);
  });

  it('sample_titles uses (untitled) for tabs with empty string title', () => {
    const tabs = [
      { id: 1, url: 'https://a.com', title: '' },
    ];
    const groups = groupByDomain(tabs);
    assert.deepEqual(groups['a.com'].sample_titles, ['(untitled)']);
  });

  it('sample_titles capped at 3 entries', () => {
    const tabs = Array.from({ length: 6 }, (_, i) => ({
      id: i + 1,
      url: 'https://a.com/' + i,
      title: `Tab ${i}`,
    }));
    const groups = groupByDomain(tabs);
    assert.equal(groups['a.com'].sample_titles.length, 3);
  });
});

// ---------------------------------------------------------------------------
// groupByWindow
// ---------------------------------------------------------------------------
describe('groupByWindow', () => {
  it('returns empty object for empty input', () => {
    assert.deepEqual(groupByWindow([]), {});
  });

  it('groups tabs by windowId', () => {
    const tabs = [
      { id: 1, windowId: 1, url: 'https://a.com' },
      { id: 2, windowId: 1, url: 'https://b.com' },
      { id: 3, windowId: 2, url: 'https://c.com' },
    ];
    const groups = groupByWindow(tabs);
    // keys are stringified windowIds
    assert.equal(groups['1'].count, 2);
    assert.deepEqual(groups['1'].tab_ids, [1, 2]);
    assert.equal(groups['2'].count, 1);
    assert.deepEqual(groups['2'].tab_ids, [3]);
  });

  it('each group has {count, tab_ids} shape', () => {
    const tabs = [{ id: 5, windowId: 10, url: 'https://a.com' }];
    const groups = groupByWindow(tabs);
    const group = groups['10'];
    assert.ok('count' in group);
    assert.ok('tab_ids' in group);
    assert.equal(group.count, 1);
    assert.deepEqual(group.tab_ids, [5]);
  });

  it('handles single-window scenario', () => {
    const tabs = [
      { id: 1, windowId: 99, url: 'https://a.com' },
      { id: 2, windowId: 99, url: 'https://b.com' },
    ];
    const groups = groupByWindow(tabs);
    assert.deepEqual(Object.keys(groups), ['99']);
    assert.equal(groups['99'].count, 2);
  });
});

// ---------------------------------------------------------------------------
// getGroupPrefix
// ---------------------------------------------------------------------------
describe('getGroupPrefix', () => {
  const groupMap = new Map([
    [10, { id: 10, title: 'Work' }],
    [11, { id: 11, title: '' }],
  ]);

  it('returns empty string when groupId is -1', () => {
    assert.equal(getGroupPrefix({ groupId: -1 }, groupMap), '');
  });

  it('returns empty string when groupId is undefined', () => {
    assert.equal(getGroupPrefix({}, groupMap), '');
  });

  it('returns titled group prefix', () => {
    assert.equal(getGroupPrefix({ groupId: 10 }, groupMap), '[Group: Work] ');
  });

  it('falls back to Group ID when title is empty', () => {
    assert.equal(getGroupPrefix({ groupId: 11 }, groupMap), '[Group: Group 11] ');
  });

  it('returns empty string for unknown group ID', () => {
    assert.equal(getGroupPrefix({ groupId: 99 }, groupMap), '');
  });
});

// ---------------------------------------------------------------------------
// compact
// ---------------------------------------------------------------------------
describe('compact', () => {
  it('produces the correct shape for a full tab', () => {
    const tab = {
      id: 42,
      windowId: 3,
      groupId: 7,
      title: 'Hello',
      url: 'https://example.com',
      pinned: true,
      audible: true,
    };
    const c = compact(tab);
    assert.equal(c.id, 42);
    assert.equal(c.window, 3);
    assert.equal(c.group, 7);
    assert.equal(c.title, 'Hello');
    assert.equal(c.url, 'https://example.com');
    assert.equal(c.pinned, true);
    assert.equal(c.audible, true);
  });

  it('group is undefined when groupId is -1 (ungrouped Chrome sentinel)', () => {
    const tab = { id: 1, windowId: 1, groupId: -1, title: 'T', url: 'https://a.com' };
    assert.equal(compact(tab).group, undefined);
  });

  it('group is undefined when groupId is absent', () => {
    const tab = { id: 1, windowId: 1, title: 'T', url: 'https://a.com' };
    assert.equal(compact(tab).group, undefined);
  });

  it('pinned is undefined (not false) when falsy', () => {
    const tab = { id: 1, windowId: 1, title: 'T', url: 'https://a.com', pinned: false };
    assert.equal(compact(tab).pinned, undefined);
  });

  it('audible is undefined (not false) when falsy', () => {
    const tab = { id: 1, windowId: 1, title: 'T', url: 'https://a.com', audible: false };
    assert.equal(compact(tab).audible, undefined);
  });

  it('missing title becomes empty string', () => {
    const tab = { id: 1, windowId: 1, url: 'https://a.com' };
    assert.equal(compact(tab).title, '');
  });

  it('missing url becomes empty string', () => {
    const tab = { id: 1, windowId: 1, title: 'T' };
    assert.equal(compact(tab).url, '');
  });

  it('title exactly 80 chars is NOT truncated', () => {
    const title = 'x'.repeat(80);
    const tab = { id: 1, windowId: 1, title, url: 'https://a.com' };
    assert.equal(compact(tab).title, title);
  });

  it('title of 81 chars IS truncated to 77 + ellipsis', () => {
    const title = 'x'.repeat(81);
    const tab = { id: 1, windowId: 1, title, url: 'https://a.com' };
    const c = compact(tab);
    assert.equal(c.title, 'x'.repeat(77) + '…');
    assert.equal([...c.title].length, 78); // 77 chars + 1 ellipsis code point
  });
});
