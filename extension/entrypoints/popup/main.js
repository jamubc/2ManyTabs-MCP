const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function renderMap(peers, live) {
  const map = document.getElementById('linkMap');
  const dots = document.getElementById('agentDots');
  const note = document.getElementById('agentNote');
  const list = document.getElementById('browserList');

  map.classList.toggle('off', !live);
  const agents = live && peers ? peers.agents : 0;
  dots.replaceChildren(...Array.from({ length: Math.min(agents, 5) }, () => {
    const d = document.createElement('span');
    d.className = 'agent-dot';
    return d;
  }));
  note.textContent = live ? (peers ? plural(agents, 'agent') : 'agents') : 'no agent';

  const browsers = live && peers ? peers.browsers : [{ id: null, name: 'this browser' }];
  list.replaceChildren(...browsers.map((b) => {
    const li = document.createElement('li');
    li.textContent = b.name;
    if (peers && b.id === peers.self) {
      li.className = 'here';
      li.title = 'This browser';
    }
    return li;
  }));
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
