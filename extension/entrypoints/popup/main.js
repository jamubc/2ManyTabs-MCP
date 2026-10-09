const SVG = 'http://www.w3.org/2000/svg';
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

const ACTION_NAMES = {
  query_tabs: 'list tabs',
  query_groups: 'list groups',
  close_tabs: 'close tabs',
  open_tabs: 'open tabs',
  group_tabs: 'group tabs',
  ungroup_tabs: 'ungroup tabs',
  update_group: 'edit a group',
  activate_tab: 'switch tab',
  update_tab: 'edit a tab',
  get_tab_text: 'read a page',
  execute_script: 'run a script',
};

const state = { peers: null, live: false, drawn: '', activity: null, agentLinks: [], browserLinks: new Map(), eye: null };

function el(tag, attrs, parent) {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.append(node);
  return node;
}

function rows(n, cy, gap) {
  return Array.from({ length: n }, (_, i) => cy + (i - (n - 1) / 2) * gap);
}

function renderMap() {
  const { peers, live } = state;
  const key = JSON.stringify({ live, peers });
  if (key === state.drawn) return;
  state.drawn = key;

  const map = document.getElementById('linkMap');
  map.classList.toggle('live', live);

  const agents = live && peers ? Math.max(peers.agents, 1) : 1;
  const shown = Math.min(agents, 4);
  const browsers = live && peers ? peers.browsers : [{ id: null, name: 'browser' }];
  const gap = 16;
  const height = Math.max(shown, browsers.length, 2) * gap + 6;
  const cy = height / 2;
  const eye = 110;

  const svg = el('svg', { viewBox: `0 0 220 ${height}`, height });

  el('text', { x: 46, y: cy + 4, 'text-anchor': 'end', class: 'node-label' }, svg).textContent =
    live ? plural(agents, 'agent') : 'no agent';

  state.agentLinks = rows(shown, cy, gap).map((y) => {
    const link = el('path', { d: `M 56 ${y} C 78 ${y}, 80 ${cy}, ${eye - 15} ${cy}`, class: 'link agent' }, svg);
    el('circle', { cx: 54, cy: y, r: 3.5, class: 'node-dot agent' }, svg);
    return link;
  });

  state.browserLinks = new Map();
  rows(browsers.length, cy, gap).forEach((y, i) => {
    const b = browsers[i];
    const here = Boolean(peers && b.id === peers.self);
    const link = el('path', { d: `M ${eye + 15} ${cy} C 140 ${cy}, 142 ${y}, 160 ${y}`, class: `link browser${here ? ' here' : ''}` }, svg);
    if (b.id) state.browserLinks.set(b.id, link);
    const node = el('g', { class: 'node browser' }, svg);
    if (here) el('circle', { cx: 163, cy: y, r: 6.5, class: 'halo' }, node);
    el('circle', { cx: 163, cy: y, r: 3.5, class: `node-dot browser${here ? ' here' : ''}` }, node);
    el('text', { x: 172, y: y + 4, class: `node-label${here ? ' here' : ''}` }, node).textContent = b.name;
    el('title', {}, node).textContent = here ? `${b.name}: this browser` : b.name;
    node.addEventListener('mouseenter', () => link.classList.add('hot'));
    node.addEventListener('mouseleave', () => link.classList.remove('hot'));
  });

  state.eye = el('g', { class: 'eye' }, svg);
  el('rect', { x: eye - 14, y: cy - 9, width: 28, height: 18, rx: 5, class: 'eye-frame' }, state.eye);
  el('circle', { cx: eye, cy, r: 4.5, class: 'eye-pupil' }, state.eye);

  const names = browsers.map((b) => b.name).join(', ');
  map.setAttribute('aria-label', live ? `${plural(agents, 'agent')} connected to ${names}` : 'Not connected');
  map.replaceChildren(svg);
}

function flash(node) {
  if (!node) return;
  node.classList.add('firing');
  setTimeout(() => node.classList.remove('firing'), 650);
}

function travel(link, kind, delay) {
  if (calm || !link) return;
  const dot = el('circle', { r: 2.2, class: `pulse ${kind}`, visibility: 'hidden' }, link.parentNode);
  const motion = el('animateMotion', { dur: '0.32s', begin: 'indefinite', fill: 'freeze', path: link.getAttribute('d') }, dot);
  setTimeout(() => {
    dot.setAttribute('visibility', 'visible');
    motion.beginElement();
    setTimeout(() => dot.remove(), 340);
  }, delay);
}

function fire(activity) {
  if (!state.live) return;
  const agentLink = state.agentLinks[Math.min(activity.agent ?? 0, state.agentLinks.length - 1)];
  const browserLink = state.browserLinks.get(activity.target);
  flash(agentLink);
  travel(agentLink, 'agent', 0);
  setTimeout(() => flash(state.eye), calm ? 0 : 300);
  setTimeout(() => flash(browserLink), calm ? 0 : 320);
  travel(browserLink, 'browser', 320);
}

function ago(at) {
  const s = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (s < 60) return `${s} s ago`;
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`;
}

function renderLastCall() {
  const box = document.getElementById('lastCall');
  const a = state.activity;
  if (!state.live) {
    box.textContent = 'Start an agent with this MCP to connect';
    return;
  }
  if (!a) {
    box.textContent = 'Waiting for the first call';
    return;
  }
  const where = state.peers?.browsers.find((b) => b.id === a.target)?.name;
  box.replaceChildren();
  const what = document.createElement('strong');
  what.textContent = ACTION_NAMES[a.action] ?? a.action.replace(/_/g, ' ');
  box.append(what, `${where ? ` in ${where}` : ''}, ${ago(a.at)}`);
}

async function renderTabs() {
  const tabs = await browser.tabs.query({});
  document.getElementById('tabCount').textContent = tabs.length;
  document.getElementById('tabWord').textContent = tabs.length === 1 ? 'Tab' : 'Tabs';
}

function renderStatus(enabled, connected) {
  const pill = document.getElementById('statusPill');
  const text = document.getElementById('statusText');
  const toggle = document.getElementById('powerToggle');
  if (toggle.checked !== enabled) toggle.checked = enabled;
  pill.className = 'pill ' + (enabled && connected ? 'connected' : 'disconnected');
  text.textContent = !enabled ? 'Off' : connected ? 'Connected' : 'Disconnected';
}

async function load() {
  const s = await browser.storage.local.get(['connected', 'enabled', 'peers', 'activity']);
  const enabled = s.enabled !== false;
  state.live = enabled && s.connected === true;
  state.peers = s.peers ?? null;
  state.activity = s.activity ?? null;
  renderStatus(enabled, s.connected === true);
  renderMap();
  renderLastCall();
}

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.connected || changes.enabled || changes.peers) {
    load();
    return;
  }
  if (changes.activity?.newValue) {
    state.activity = changes.activity.newValue;
    renderLastCall();
    fire(state.activity);
  }
});

for (const ev of ['onCreated', 'onRemoved', 'onAttached', 'onDetached']) {
  browser.tabs[ev]?.addListener(() => renderTabs());
}

document.getElementById('powerToggle').addEventListener('change', (e) => {
  browser.storage.local.set({ enabled: e.target.checked });
});

load();
renderTabs();
setInterval(renderLastCall, 1000);
