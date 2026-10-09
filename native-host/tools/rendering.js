/** Rendering adapters for tab display - delegates to dedicated formatters. */

/** Build emoji flags for tab metadata attributes. */
export function buildFlags(tab) {
  const flags = [];
  if (tab.pinned) flags.push('📌');
  if (tab.audible) flags.push('🔊');
  return flags;
}

/** Format emoji flags as display string. */
export function formatFlags(flags) {
  return flags.length ? ' ' + flags.join('') : '';
}

/** Draw ASCII histogram bar for a domain count. */
export function drawBar(count, maxCount, maxWidth) {
  return '▇'.repeat(Math.max(1, Math.round((count / maxCount) * maxWidth)));
}

/** Draw a single histogram line. */
export function formatHistogramLine(domain, count, bar) {
  return `  ${bar}  ${domain.padEnd(28)} ${count} tab(s)`;
}

/** Draw domain header. */
export function formatDomainHeader(domain, count) {
  return `📁 ${domain} — ${count} tab(s)`;
}

/** Draw window header with optional browser label. */
export function formatWindowHeader(winId, count, browser) {
  const browserPrefix = browser ? `[${browser.charAt(0).toUpperCase() + browser.slice(1)}] ` : '';
  return `🪟 ${browserPrefix}Window ${winId} — ${count} tab(s)`;
}

/** Draw group prefix. */
export function formatGroupPrefix(groupMap, tab) {
  if (tab.groupId === undefined || tab.groupId === -1) return '';
  const g = groupMap.get(tab.browser ? `${tab.browser}:${tab.groupId}` : tab.groupId);
  return g ? `[Group: ${g.title || 'Group ' + g.id}] ` : '';
}

/** Draw the tab's numeric or composite id - every id-based tool needs one. */
export function formatIdPrefix(tab) {
  if (tab.browser) {
    return `[id:${tab.browser}:${tab.id}] `;
  }
  return `[id:${tab.id}] `;
}
