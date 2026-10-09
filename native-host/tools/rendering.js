export function buildFlags(tab) {
  const flags = [];
  if (tab.pinned) flags.push('📌');
  if (tab.audible) flags.push('🔊');
  return flags;
}

export function formatFlags(flags) {
  return flags.length ? ' ' + flags.join('') : '';
}

export function drawBar(count, maxCount, maxWidth) {
  return '▇'.repeat(Math.max(1, Math.round((count / maxCount) * maxWidth)));
}

export function formatHistogramLine(domain, count, bar) {
  return `  ${bar}  ${domain.padEnd(28)} ${count} tab(s)`;
}

export function formatDomainHeader(domain, count) {
  return `📁 ${domain} — ${count} tab(s)`;
}

export function formatWindowHeader(winId, count, browser) {
  const browserPrefix = browser ? `[${browser.charAt(0).toUpperCase() + browser.slice(1)}] ` : '';
  return `🪟 ${browserPrefix}Window ${winId} — ${count} tab(s)`;
}

export function formatGroupPrefix(groupMap, tab) {
  if (tab.groupId === undefined || tab.groupId === -1) return '';
  const g = groupMap.get(tab.browser ? `${tab.browser}:${tab.groupId}` : tab.groupId);
  return g ? `[Group: ${g.title || 'Group ' + g.id}] ` : '';
}

export function formatIdPrefix(tab) {
  if (tab.browser) {
    return `[id:${tab.browser}:${tab.id}] `;
  }
  return `[id:${tab.id}] `;
}
