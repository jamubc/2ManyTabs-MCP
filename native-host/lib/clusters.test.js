import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  hostOf, normUrl, annotate, buildClusters, matchSelection,
  renderSummary, renderOneCluster, renderIds, renderSignal,
} from './clusters.js';

const NOW = Date.UTC(2026, 9, 12, 12);
const DAY = 86_400_000;
let nextId = 1;
const tab = (url, title, extra = {}) =>
  ({ id: nextId++, browser: 'firefox', windowId: 1, url, title, lastAccessed: NOW - DAY, ...extra });

describe('hostOf / normUrl', () => {
  it('drops www and lowercases the host', () => {
    assert.equal(hostOf('https://WWW.Example.com/a'), 'example.com');
  });
  it('uses the protocol for host-less URLs and survives junk', () => {
    assert.equal(hostOf('about:blank'), 'about:');
    assert.equal(hostOf(''), '(no url)');
  });
  it('ignores tracking parameters and a trailing slash', () => {
    assert.equal(normUrl('https://a.test/x/?utm_source=z&id=3'), normUrl('https://www.a.test/x?id=3'));
  });
});

describe('annotate', () => {
  it('flags second copies, errors, searches, private and editing pages', () => {
    const tabs = annotate([
      tab('https://a.test/page', 'Page'),
      tab('https://a.test/page/?utm_source=x', 'Page again'),
      tab('about:neterror?e=dns', 'Problem loading page'),
      tab('https://www.google.com/search?q=x', 'x - Google Search'),
      tab('https://onlinebanking.example/accounts', 'My accounts'),
      tab('https://docs.google.com/document/d/1/edit', 'Draft'),
    ], NOW);
    assert.deepEqual(tabs.map((t) => t.dup), [false, true, false, false, false, false]);
    assert.equal(tabs[2].error, true);
    assert.equal(tabs[3].search, true);
    assert.equal(tabs[4].sensitive, true);
    assert.equal(tabs[5].editing, true);
    assert.equal(tabs[0].age, 1);
  });

  it('leaves age unknown when the browser did not send lastAccessed', () => {
    const [t] = annotate([tab('https://a.test/', 'A', { lastAccessed: undefined })], NOW);
    assert.equal(t.age, null);
  });

  it('splits a busy host by its first path segment', () => {
    const many = Array.from({ length: 9 }, (_, i) => tab(`https://github.com/acme/r${i}`, `r${i}`));
    const tabs = annotate([...many, tab('https://github.com/other/x', 'x')], NOW);
    assert.equal(tabs[0].key, 'github.com/acme');
    assert.equal(tabs[9].key, 'github.com/other');
  });
});

describe('buildClusters / matchSelection', () => {
  it('orders by size and counts what the match string would select', () => {
    const tabs = annotate([
      tab('https://youtube.com/watch?v=1', 'One'),
      tab('https://youtube.com/watch?v=2', 'Two'),
      tab('https://news.test/a', 'Why youtube.com changed'),
    ], NOW);
    const [first, second] = buildClusters(tabs);
    assert.equal(first.key, 'youtube.com');
    assert.equal(first.tabs.length, 2);
    assert.equal(first.selects, 3, 'the title mention is caught too');
    assert.equal(second.key, 'news.test');
  });

  it('leaves pinned tabs out of a match selection, as close_tabs does', () => {
    const tabs = annotate([tab('https://a.test/1', 'x', { pinned: true }), tab('https://a.test/2', 'y')], NOW);
    assert.equal(matchSelection(tabs, 'a.test').length, 1);
  });
});

describe('rendering', () => {
  const tabs = annotate([
    tab('https://youtube.com/watch?v=1', 'One'),
    tab('https://youtube.com/watch?v=2', 'Two'),
    tab('https://news.test/a', 'Why youtube.com changed'),
    tab('https://mychart.example/visit', 'Results: blood test'),
  ], NOW);
  const clusters = buildClusters(tabs);

  it('summarises counts, match strings and mismatches', () => {
    const out = renderSummary(tabs, clusters);
    assert.match(out, /^4 tab\(s\) in 1 window\(s\) \(firefox\)/);
    assert.match(out, /match: "youtube.com" selects 3 {2}\(selects 3, not 2/);
    assert.match(out, /private sites 1/);
  });

  it('never shows a private site\'s title or link', () => {
    const all = renderSummary(tabs, clusters) + renderSignal(tabs, 'sensitive') +
      renderOneCluster(clusters, clusters.find((c) => c.sensitive).id);
    assert.doesNotMatch(all, /blood test|mychart\.example\/visit/);
    assert.match(all, /private site: mychart\.example/);
  });

  it('pages long summaries and rejects unknown cluster ids', () => {
    assert.match(renderSummary(tabs, clusters, { top: 1 }), /2 more cluster\(s\).*offset 1/);
    assert.throws(() => renderOneCluster(clusters, 'c99'), /No cluster "c99"/);
  });

  it('lists every cluster with its ids only, flagging pinned and editing tabs', () => {
    const t = annotate([
      tab('https://a.test/1', 'A1', { id: 1, pinned: true }),
      tab('https://a.test/2', 'A2', { id: 2 }),
      tab('https://docs.google.com/document/d/9/edit', 'Draft', { id: 3 }),
    ], NOW);
    const out = renderIds(t, buildClusters(t));
    assert.match(out, /^3 tab\(s\) in 2 cluster\(s\); tab ids per cluster/);
    assert.match(out, /c01 {2}a\.test {2}· {2}2 {2}· {2}firefox:1\(pinned\) firefox:2/);
    assert.match(out, /c02 {2}docs\.google\.com {2}· {2}1 {2}· {2}firefox:3\(editing\)/);
    assert.doesNotMatch(out, /Draft|A1/);
  });

  it('counts a quick win once per tab, leaving out pinned, unsaved and private tabs', () => {
    const qw = annotate([
      tab('https://www.google.com/search?q=a', 'a - Google Search'),
      tab('https://www.google.com/search?q=a', 'a - Google Search'),
      tab('about:neterror?e=x', 'Problem loading page'),
      tab('https://www.google.com/search?q=b', 'b - Google Search', { pinned: true }),
      tab('https://docs.google.com/document/d/1/edit', 'Draft'),
      tab('https://docs.google.com/document/d/1/edit', 'Draft'),
    ], NOW);
    assert.match(renderSummary(qw, buildClusters(qw)), /quick win: 3 \(1 searches, 1 copies, 1 broken pages\)/);
    assert.match(renderSignal(qw, 'quickwin'), /^3 tab\(s\): quickwin/);
  });

  it('says when ages are unknown', () => {
    const noAge = annotate([tab('https://a.test/', 'A', { lastAccessed: undefined })], NOW);
    assert.match(renderSummary(noAge, buildClusters(noAge)), /ages are unknown/);
  });
});
