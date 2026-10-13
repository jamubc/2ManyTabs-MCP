import { matchesQuery } from './tabs.js';

// Turns a large tab set into a short list of clusters, so a thousand tabs never have to be
// read one by one. Pure: callers pass live tabs (from query_tabs) and `now`.

export const STALE_DAYS = 30;
const SPLIT_OVER = 8; // a host with more tabs than this is split by its first path segment
const DAY_MS = 86_400_000;

const TRACKING = /^(utm_|fbclid$|gclid$|mc_|ref$|ref_src$)/;
const ERROR_TITLE = new RegExp(
  'problem loading page|^404\\b|page not found|^not found|access denied|403 forbidden|' +
  "can.t be reached|server not found|unable to connect|502 bad gateway|service unavailable|" +
  '^untitled$|^new tab$', 'i');
const ERROR_URL = /^(about:(neterror|blank|newtab|home)|chrome:\/\/newtab|chrome-error:)/i;
const SEARCH_URL = /google\.[^/]+\/search|bing\.com\/search|duckduckgo\.com\/\?q=|search\.yahoo\.com\/search|search\.brave\.com\/search/i;
// A floor, not a ceiling: the agent still judges anything these patterns miss.
const SENSITIVE_HOST = new RegExp(
  'bank|chase\\.com|wellsfargo|paypal|venmo|mychart|health|patient|clinic|insur|' +
  'mail\\.google|outlook\\.|proton\\.me|1password|lastpass|bitwarden|dashlane|' +
  'accounts\\.google|^login\\.|^signin\\.|\\.gov$|\\.gov\\.', 'i');
const SENSITIVE_PATH = /\/(log-?in|sign-?in|oauth|password|billing|payments?)(\/|$)/i;
// Pages that may hold typed, unsaved work. Noisy on purpose: it prompts a mention, not a refusal.
const EDITING_HOST = /^(docs\.google\.com|notion\.so|.*\.notion\.site|studio\.youtube\.com|mail\.google\.com|outlook\.(live|office)\.com)$/i;
const EDITING_PATH = /\/(edit|compose|draft|drafts|new|submit|write|reply)(\/|$)|#(compose|drafts)/i;

function parse(url) {
  try { return new URL(url); } catch { return null; }
}

export function hostOf(url) {
  const u = parse(url);
  if (!u) return '(no url)';
  return u.hostname ? u.hostname.toLowerCase().replace(/^www\./, '') : u.protocol;
}

export function normUrl(url) {
  const u = parse(url);
  if (!u) return url ?? '';
  const params = [...u.searchParams].filter(([k]) => !TRACKING.test(k));
  const q = new URLSearchParams(params).toString();
  return `${hostOf(url)}${u.pathname.replace(/\/$/, '')}${q ? '?' + q : ''}`;
}

function clusterKey(url, split) {
  const host = hostOf(url);
  if (!split) return host;
  const segs = (parse(url)?.pathname ?? '').split('/').filter(Boolean);
  if (host.endsWith('reddit.com') && segs[0] === 'r' && segs[1]) return `${host}/r/${segs[1]}`;
  return segs[0] ? `${host}/${segs[0]}` : host;
}

export function annotate(tabs, now = Date.now()) {
  const seen = new Map();
  const out = tabs.map((t) => {
    const url = t.url ?? '';
    const title = t.title ?? '';
    const host = hostOf(url);
    const path = parse(url)?.pathname ?? '';
    const norm = normUrl(url);
    seen.set(norm, (seen.get(norm) ?? 0) + 1);
    return {
      ...t,
      host,
      age: typeof t.lastAccessed === 'number' ? Math.max(0, Math.floor((now - t.lastAccessed) / DAY_MS)) : null,
      dup: seen.get(norm) > 1, // second and later copies
      error: ERROR_TITLE.test(title.trim()) || ERROR_URL.test(url),
      search: SEARCH_URL.test(url) || title.endsWith(' - Google Search'),
      sensitive: SENSITIVE_HOST.test(host) || SENSITIVE_PATH.test(path),
      editing: EDITING_HOST.test(host) || EDITING_PATH.test(path + (parse(url)?.hash ?? '')),
    };
  });
  const perHost = new Map();
  for (const t of out) perHost.set(t.host, (perHost.get(t.host) ?? 0) + 1);
  for (const t of out) t.key = clusterKey(t.url, perHost.get(t.host) > SPLIT_OVER);
  return out;
}

// What `close_tabs` with this `match` would select: title or URL substring, pinned tabs left out.
export function matchSelection(tabs, match) {
  return tabs.filter((t) => !t.pinned && matchesQuery(t, match));
}

export function buildClusters(annotated) {
  const groups = new Map();
  for (const t of annotated) {
    if (!groups.has(t.key)) groups.set(t.key, []);
    groups.get(t.key).push(t);
  }
  return [...groups.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .map(([key, tabs], i) => ({
      id: `c${String(i + 1).padStart(2, '0')}`,
      key,
      tabs,
      sensitive: tabs.every((t) => t.sensitive),
      selects: matchSelection(annotated, key).length,
    }));
}

const SIGNALS = {
  errors: (t) => t.error,
  search: (t) => t.search,
  duplicates: (t) => t.dup,
  stale: (t) => (t.age ?? 0) >= STALE_DAYS,
  sensitive: (t) => t.sensitive,
  editing: (t) => t.editing,
  pinned: (t) => !!t.pinned,
};
export const SIGNAL_NAMES = Object.keys(SIGNALS);

function short(s, n = 70) {
  const v = (s || '(untitled)').replace(/\s+/g, ' ');
  return v.length <= n ? v : v.slice(0, n - 1) + '…';
}

function ageRange(tabs) {
  const ages = tabs.map((t) => t.age).filter((a) => a !== null);
  if (!ages.length) return 'last use unknown';
  const lo = Math.min(...ages), hi = Math.max(...ages);
  return lo === hi ? `used ${lo}d ago` : `used ${lo}–${hi}d ago`;
}

function samples(tabs) {
  const byAge = [...tabs].sort((a, b) => (a.age ?? Infinity) - (b.age ?? Infinity));
  return [...new Set([byAge[0], byAge[Math.floor(byAge.length / 2)], byAge[byAge.length - 1]])];
}

function idOf(t) {
  return t.browser ? `${t.browser}:${t.id}` : String(t.id);
}

function renderCluster(c) {
  const flags = ['dup', 'error', 'search', 'editing', 'pinned']
    .map((f) => [f, c.tabs.filter((t) => t[f]).length])
    .filter(([, n]) => n)
    .map(([f, n]) => `${f} ${n}`);
  const head = `${c.id}  ${c.key}  ·  ${c.tabs.length} tab(s)  ·  ${ageRange(c.tabs)}` +
    (flags.length ? `  ·  ${flags.join(', ')}` : '');
  if (c.sensitive) return `${head}\n     (private site: titles hidden)`;
  const pinned = c.tabs.filter((t) => t.pinned).length;
  const expected = c.tabs.length - pinned;
  const note = c.selects === expected ? '' :
    `  (selects ${c.selects}, not ${expected}: it also matches other tabs. Close by tab_ids instead)`;
  return [
    head,
    `     match: "${c.key}" selects ${c.selects}${note}`,
    ...samples(c.tabs).map((t) => `     · ${short(t.title)}`),
  ].join('\n');
}

export function renderSummary(annotated, clusters, { top = 25, offset = 0 } = {}) {
  const n = annotated.length;
  const count = (f) => annotated.filter(SIGNALS[f]).length;
  const browsers = [...new Set(annotated.map((t) => t.browser).filter(Boolean))];
  const windows = new Set(annotated.map((t) => `${t.browser}:${t.windowId}`)).size;
  const lines = [
    `${n} tab(s) in ${windows} window(s)${browsers.length ? ` (${browsers.join(', ')})` : ''}  ·  ${clusters.length} cluster(s)`,
    `  pinned ${count('pinned')}  ·  duplicate copies ${count('duplicates')}  ·  error/blank ${count('errors')}  ·  ` +
      `search results ${count('search')}  ·  untouched ${STALE_DAYS}d+ ${count('stale')}  ·  ` +
      `may hold unsaved work ${count('editing')}  ·  private sites ${count('sensitive')}`,
  ];
  const ages = annotated.map((t) => t.age).filter((a) => a !== null);
  if (!ages.length && n) {
    lines.push('  Last-used times are not available from this browser extension, so ages are unknown.');
  } else if (n >= 20) {
    const hours = new Map();
    for (const t of annotated) {
      const h = typeof t.lastAccessed === 'number' ? Math.floor(t.lastAccessed / 3_600_000) : null;
      if (h !== null) hours.set(h, (hours.get(h) ?? 0) + 1);
    }
    if (Math.max(...hours.values()) >= 0.6 * n) {
      lines.push('  NOTE: most tabs share one last-used hour (a restart or session restore can do this), so ignore ages.');
    }
  }
  lines.push('');
  const page = clusters.slice(offset, offset + top);
  for (const c of page) lines.push(renderCluster(c));
  const rest = clusters.slice(offset + top);
  if (rest.length) {
    const tabs = rest.reduce((s, c) => s + c.tabs.length, 0);
    lines.push('', `… ${rest.length} more cluster(s) (${tabs} tabs). Call again with offset ${offset + top}.`);
  }
  lines.push('', 'Cluster ids change when tabs change. Use the match strings, not the ids, to close.');
  return lines.join('\n');
}

export function renderOneCluster(clusters, id) {
  const c = clusters.find((x) => x.id === id);
  if (!c) throw new Error(`No cluster "${id}". Cluster ids change when tabs change; call cluster_tabs again.`);
  const lines = [`${c.id}  ${c.key}  ·  ${c.tabs.length} tab(s)`];
  const byAge = [...c.tabs].sort((a, b) => (a.age ?? Infinity) - (b.age ?? Infinity));
  for (const t of byAge) {
    const age = t.age === null ? '?d' : `${t.age}d`;
    const flags = ['pinned', 'dup', 'editing'].filter((f) => t[f]).join(' ');
    if (t.sensitive) {
      lines.push(`  [id:${idOf(t)}] ${age}  (private site: ${t.host})${flags ? '  ' + flags : ''}`);
    } else {
      lines.push(`  [id:${idOf(t)}] ${age}  ${short(t.title, 90)}${flags ? '  ' + flags : ''}\n      ${t.url}`);
    }
  }
  return lines.join('\n');
}

export function renderSignal(annotated, signal) {
  const hits = annotated.filter(SIGNALS[signal]);
  const lines = [`${hits.length} tab(s): ${signal}`];
  for (const t of hits) {
    const age = t.age === null ? '?d' : `${t.age}d`;
    lines.push(`  [id:${idOf(t)}] ${age}  ${t.sensitive ? `(private site: ${t.host})` : short(t.title, 90)}  [${t.key}]`);
  }
  return lines.join('\n');
}
