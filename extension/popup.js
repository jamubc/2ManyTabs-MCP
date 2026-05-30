async function refresh() {
  const [storage, tabs] = await Promise.all([
    chrome.storage.local.get(['connected']),
    chrome.tabs.query({}),
  ]);

  const connected = storage.connected === true;
  const pill = document.getElementById('statusPill');
  const text = document.getElementById('statusText');

  pill.className = 'pill ' + (connected ? 'connected' : 'disconnected');
  text.textContent = connected ? 'Connected' : 'Disconnected';
  document.getElementById('tabCount').textContent = tabs.length;
}

refresh();
setInterval(refresh, 1500);
