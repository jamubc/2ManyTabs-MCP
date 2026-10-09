const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

const SVG = 'http://www.w3.org/2000/svg';
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
let drawn = '';

function el(tag, attrs, parent) {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.append(node);
  return node;
}

function rows(n, cy, gap) {
  return Array.from({ length: n }, (_, i) => cy + (i - (n - 1) / 2) * gap);
}

function pulse(svg, d, kind, delay) {
  if (calm) return;
  const dot = el('circle', { r: 1.8, class: `pulse ${kind}` }, svg);
  el('animateMotion', { dur: '1.8s', begin: `-${delay}s`, repeatCount: 'indefinite', path: d }, dot);
}

function renderMap(peers, live) {
  const key = JSON.stringify({ live, peers });
  if (key === drawn) return;
  drawn = key;

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

  rows(shown, cy, gap).forEach((y, i) => {
    const d = `M 56 ${y} C 78 ${y}, 80 ${cy}, ${eye - 15} ${cy}`;
    el('path', { d, class: 'link agent' }, svg);
    if (live) pulse(svg, d, 'agent', i * 0.45);
    el('circle', { cx: 54, cy: y, r: 3.5, class: 'node-dot agent', opacity: live ? 1 : 0.35 }, svg);
  });

  rows(browsers.length, cy, gap).forEach((y, i) => {
    const b = browsers[i];
    const here = Boolean(peers && b.id === peers.self);
    const d = `M ${eye + 15} ${cy} C 140 ${cy}, 142 ${y}, 160 ${y}`;
    const link = el('path', { d, class: `link browser${here ? ' here' : ''}` }, svg);
    if (live) pulse(svg, d, 'browser', 0.9 + i * 0.45);
    const node = el('g', { class: 'node browser' }, svg);
    if (here) el('circle', { cx: 163, cy: y, r: 6.5, class: 'halo' }, node);
    el('circle', { cx: 163, cy: y, r: 3.5, class: `node-dot browser${here ? ' here' : ''}` }, node);
    el('text', { x: 172, y: y + 4, class: `node-label${here ? ' here' : ''}` }, node).textContent = b.name;
    el('title', {}, node).textContent = here ? `${b.name}: this browser` : b.name;
    node.addEventListener('mouseenter', () => link.classList.add('hot'));
    node.addEventListener('mouseleave', () => link.classList.remove('hot'));
  });

  el('rect', { x: eye - 14, y: cy - 9, width: 28, height: 18, rx: 5, class: 'eye-frame' }, svg);
  el('circle', { cx: eye, cy, r: 4.5, class: 'eye-pupil' }, svg);

  const names = browsers.map((b) => b.name).join(', ');
  map.setAttribute('aria-label', live ? `${plural(agents, 'agent')} connected to ${names}` : 'Not connected');
  map.replaceChildren(svg);
}

async function refresh() {
  const [storage, tabs] = await Promise.all([
    browser.storage.local.get(['connected', 'enabled', 'peers']),
    browser.tabs.query({}),
  ]);

  const enabled = storage.enabled !== false;
  const connected = storage.connected === true;

  const pill = document.getElementById('statusPill');
  const text = document.getElementById('statusText');
  const powerToggle = document.getElementById('powerToggle');

  if (powerToggle && powerToggle.checked !== enabled) {
    powerToggle.checked = enabled;
  }

  if (!enabled) {
    pill.className = 'pill disconnected';
    text.textContent = 'Off';
  } else {
    pill.className = 'pill ' + (connected ? 'connected' : 'disconnected');
    text.textContent = connected ? 'Connected' : 'Disconnected';
  }
  renderMap(storage.peers, enabled && connected);
  document.getElementById('tabCount').textContent = tabs.length;
  document.getElementById('tabWord').textContent = tabs.length === 1 ? 'Tab' : 'Tabs';
}

document.addEventListener('DOMContentLoaded', () => {
  const powerToggle = document.getElementById('powerToggle');
  if (powerToggle) {
    powerToggle.addEventListener('change', (e) => {
      browser.storage.local.set({ enabled: e.target.checked });
      refresh();
    });
  }
});

refresh();
setInterval(refresh, 1500);
