const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function others(peers) {
  return peers.browsers.filter((b) => b.id !== peers.self).map((b) => b.name);
}

function connectedLabel(peers) {
  if (!peers) return 'Connected';
  const rest = others(peers);
  return `Connected · ${plural(peers.agents, 'agent')}` + (rest.length ? ` · also ${rest.join(', ')}` : '');
}

function connectedDetail(peers) {
  const rest = others(peers);
  return [
    `${plural(peers.agents, 'AI agent')} using this MCP`,
    rest.length ? `Also connected: ${rest.join(', ')}` : 'No other browsers connected',
  ].join('\n');
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
    text.textContent = connected ? connectedLabel(storage.peers) : 'Disconnected';
  }
  pill.title = connected && storage.peers ? connectedDetail(storage.peers) : '';
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
