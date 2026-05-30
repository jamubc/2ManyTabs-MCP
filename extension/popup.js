async function refresh() {
  const [storage, tabs] = await Promise.all([
    chrome.storage.local.get(['connected', 'enabled']),
    chrome.tabs.query({}),
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
  document.getElementById('tabCount').textContent = tabs.length;
}

document.addEventListener('DOMContentLoaded', () => {
  const powerToggle = document.getElementById('powerToggle');
  if (powerToggle) {
    powerToggle.addEventListener('change', (e) => {
      chrome.storage.local.set({ enabled: e.target.checked });
      refresh();
    });
  }
});

refresh();
setInterval(refresh, 1500);
