// 2ManyTabs MCP – Extension Bridge (self-organizing, multi-host)
//
// Why this exists
// ----------------
// MCP-over-stdio is 1:1 by design: every client (each Hermes instance, the
// mcpjam inspector) spawns its OWN host.js and owns that process's stdio pipes.
// That part is correct. The catch is one layer down — all those independent
// hosts reach for a SINGLE shared resource: there is one browser, one extension,
// one port (9876), one set of tabs. N MCP servers, a rank-1 resource.
//
// Previously the first host to start bound 9876 and every other host's tab tools
// failed with "extension not connected". Worse, the winner was often a stale
// session's host, so the session you were actually using couldn't see the tabs.
//
// Fix: the hosts self-organize onto the shared resource instead of fighting over it.
//   • Exactly one host binds 9876 and owns the extension socket  → the OWNER.
//   • Every other host connects to the owner and proxies its calls → a FOLLOWER.
//   • If the owner dies, followers race to re-bind; one becomes the new owner and
//     the extension reconnects to it. No external daemon, no config, and the
//     extension never knows the difference.
//
//   Hermes A ─stdio▶ host(OWNER)    ─ws:9876──────▶ extension ─▶ browser tabs
//   Hermes B ─stdio▶ host(FOLLOWER) ─ws:9876/peer─▶ OWNER ─────┘
//
// Public API is unchanged: startBridge(), callExtension(), isExtensionConnected().

import http                         from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const WS_PORT         = Number(process.env.MANYTABS_BRIDGE_PORT) || 9876; // env override is a test seam; the extension uses 9876
const PEER_PATH       = '/peer';        // followers connect here; the extension connects to '/'
const CALL_TIMEOUT_MS = 10_000;
const ROUTE_GRACE_MS  = 3_500;          // absorb brief owner↔follower failover before erroring

// chrome-extension:// for Chromium builds, moz-extension:// for Firefox.
const ALLOWED_EXTENSION_ORIGIN_PREFIXES = ['chrome-extension://', 'moz-extension://'];

const EXT_NOT_CONNECTED_MSG =
  'Chrome extension is not connected. Load the 2ManyTabs MCP extension in your browser ' +
  'and confirm its popup shows "Connected".';

const PNA_HEADERS = {
  'Access-Control-Allow-Origin':          '*',
  'Access-Control-Allow-Private-Network': 'true',
  'Access-Control-Allow-Headers':         'content-type',
  'Access-Control-Allow-Methods':         'GET, OPTIONS',
};

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let role            = 'starting';   // 'starting' | 'owner' | 'follower'
let bindInProgress  = false;

// OWNER state -------------------------------------------------------
// Map of clientId -> { id, socket, browser, name, origin, connectedAt }
const extensionClients = new Map();
const peerClients      = new Set();    // connected follower sockets
let wireId             = 0;            // id for requests we send to extensions
const inflight         = new Map();    // wireId -> { socket, resolve, reject, timer }
const tabClientIndex   = new Map();    // numeric tabId -> Set<clientId>
const groupClientIndex = new Map();    // numeric groupId -> Set<clientId>

// FOLLOWER state ----------------------------------------------------
let peerSocket      = null;         // our client connection to the owner
let proxyId         = 0;            // id for requests we send to the owner
const proxyPending  = new Map();    // proxyId → { resolve, reject, timer }

// Calls parked until a usable route appears (covers cold start / failover).
const readyWaiters  = [];

function log(msg) {
  // stderr only — stdout is reserved for the MCP stdio transport.
  process.stderr.write(`[internet-mcp] ${msg}\n`);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function startBridge() {
  attemptBind();
}

// ---------------------------------------------------------------------------
// OWNER: try to bind 9876. Win → own the extension. Lose (EADDRINUSE) → follow.
// ---------------------------------------------------------------------------

function attemptBind() {
  if (bindInProgress || role === 'owner') return;
  bindInProgress = true;

  const httpServer = http.createServer((req, res) => {
    if (req.method === 'OPTIONS') {            // PNA preflight before the WS upgrade
      res.writeHead(204, PNA_HEADERS);
      res.end();
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Internet MCP host running\n');
  });

  httpServer.on('error', (err) => {
    bindInProgress = false;
    if (err.code === 'EADDRINUSE') {
      // Another host already owns the bridge — expected with multiple sessions. Follow it.
      log(`Port ${WS_PORT} already owned by another host — joining as a follower.`);
      becomeFollower();
    } else {
      log(`HTTP server error: ${err.message}`);
    }
  });

  const wss = new WebSocketServer({ server: httpServer });

  wss.on('headers', (headers) => {
    headers.push('Access-Control-Allow-Origin: *');
    headers.push('Access-Control-Allow-Private-Network: true');
  });
  wss.on('error', (err) => { if (err.code !== 'EADDRINUSE') log(`WebSocket error: ${err.message}`); });

  wss.on('connection', (socket, req) => {
    const origin = req.headers.origin || '';

    if (req.url === PEER_PATH) {
      // Follower connections must be node-to-node and should not have a browser origin.
      // Standard browsers will always send an Origin header for web-based requests.
      if (origin) {
        log(`Rejected peer connection from non-node origin: ${origin}`);
        socket.close(4003, 'Forbidden origin');
        return;
      }
      handlePeerConnection(socket);
    } else {
      // Extension connections must originate from a browser-extension URI.
      if (!ALLOWED_EXTENSION_ORIGIN_PREFIXES.some(prefix => origin.startsWith(prefix))) {
        log(`Rejected extension connection from unauthorized origin: ${origin}`);
        socket.close(4003, 'Unauthorized origin');
        return;
      }
      handleExtensionConnection(socket, req);
    }
  });

  httpServer.listen(WS_PORT, '127.0.0.1', () => {
    bindInProgress = false;
    role = 'owner';
    peerSocket = null;        // shed any stale follower state from a prior life
    log(`Bridge OWNER listening on ws://127.0.0.1:${WS_PORT}`);
    log('Waiting for browser extension...');
  });
}

function handleExtensionConnection(socket, req) {
  const origin = req.headers.origin || '';
  let browser = origin.startsWith('moz-extension://') ? 'firefox' : 'chrome';
  let name = browser === 'firefox' ? 'Firefox' : 'Chrome';
  let clientId = `${browser}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  try {
    const parsedUrl = new URL(req.url, 'http://127.0.0.1');
    const browserQuery = parsedUrl.searchParams.get('browser');
    const nameQuery = parsedUrl.searchParams.get('name');
    const instanceQuery = parsedUrl.searchParams.get('instance');

    if (browserQuery) browser = browserQuery.toLowerCase();
    if (nameQuery) name = nameQuery;
    else if (browser === 'firefox') name = 'Firefox';
    else if (browser === 'chrome') name = 'Chrome';

    if (instanceQuery) clientId = instanceQuery;
  } catch {
    // fallback to defaults
  }

  const client = {
    id: clientId,
    socket,
    browser,
    name,
    origin,
    connectedAt: Date.now(),
  };

  extensionClients.set(clientId, client);
  log(`Extension connected: ${name} (${browser}) [${clientId}]. Total active: ${extensionClients.size}`);
  flushReady();

  socket.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    const d = inflight.get(msg.id);
    if (!d) return;
    clearTimeout(d.timer);
    inflight.delete(msg.id);
    if (msg.error) d.reject(new Error(msg.error));
    else           d.resolve(msg.result);
  });

  socket.on('close', () => {
    extensionClients.delete(clientId);
    // Reject any in-flight requests that were waiting on this socket
    for (const [id, d] of inflight.entries()) {
      if (d.socket === socket) {
        clearTimeout(d.timer);
        inflight.delete(id);
        d.reject(new Error(`Extension connection lost: ${name}`));
      }
    }
    // Clean up indexed tab ownership for this client
    for (const index of [tabClientIndex, groupClientIndex]) {
      for (const [key, owners] of index) {
        owners.delete(clientId);
        if (owners.size === 0) index.delete(key);
      }
    }
    log(`Extension disconnected: ${name} [${clientId}]. Remaining: ${extensionClients.size}`);
  });

  socket.on('error', () => { /* close handles cleanup */ });
}

function handlePeerConnection(socket) {
  peerClients.add(socket);
  log(`Follower host connected (${peerClients.size} active)`);

  socket.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (msg.type !== 'call') return;
    try {
      const result = await routeCall(msg.action, msg.params);
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'reply', peerReqId: msg.peerReqId, result }));
      }
    } catch (err) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'reply', peerReqId: msg.peerReqId, error: err.message }));
      }
    }
  });

  socket.on('close', () => { peerClients.delete(socket); });
  socket.on('error', () => { /* close handles cleanup */ });
}

function sendToClient(client, action, params = {}) {
  return new Promise((resolve, reject) => {
    if (!client?.socket || client.socket.readyState !== WebSocket.OPEN) {
      return reject(new Error(EXT_NOT_CONNECTED_MSG));
    }
    const id = ++wireId;
    const timer = setTimeout(() => {
      inflight.delete(id);
      reject(new Error('Timed out waiting for browser extension response (10s).'));
    }, CALL_TIMEOUT_MS);
    inflight.set(id, { socket: client.socket, resolve, reject, timer });
    client.socket.send(JSON.stringify({ id, action, ...params }));
  });
}

function getActiveClients() {
  return Array.from(extensionClients.values()).filter(c => c.socket.readyState === WebSocket.OPEN);
}

// Which client(s) last reported owning a numeric tab / group id. A Set,
// because two browsers can hand out the same number.
function noteOwner(index, id, clientId) {
  if (!index.has(id)) index.set(id, new Set());
  index.get(id).add(clientId);
}

// Turn a tab or group id (12, "12", "firefox:12", "<instanceId>:12") into
// { client, cleanId }. With several browsers connected a bare number is only
// accepted when exactly one browser owns it; otherwise we refuse rather than
// guess, so a close or script never lands in the wrong browser.
function resolveTarget(rawId, browserHint, index, kind = 'tab') {
  const clients = getActiveClients();
  if (clients.length === 0) throw new Error(EXT_NOT_CONNECTED_MSG);

  let prefix = null;
  let idPart = rawId;
  if (typeof rawId === 'string' && rawId.includes(':')) {
    const at = rawId.lastIndexOf(':');
    prefix = rawId.slice(0, at);
    idPart = rawId.slice(at + 1);
  }
  const cleanId = Number(idPart);
  if (!Number.isInteger(cleanId)) throw new Error(`Invalid ${kind} id: ${rawId}`);

  const want = prefix ?? browserHint;
  if (want) {
    const w = want.toLowerCase();
    const matches = clients.filter((c) => c.id === want || c.browser === w);
    if (matches.length === 1) return { client: matches[0], cleanId };
    if (matches.length === 0) {
      throw new Error(`No connected browser matches "${want}" for ${kind} ${rawId}. Connected: ${clients.map((c) => c.browser).join(', ')}.`);
    }
    // Two windows/profiles of the same browser: fall through to the owner index.
    const owners = [...(index.get(cleanId) ?? [])].filter((id) => matches.some((c) => c.id === id));
    if (owners.length === 1) return { client: extensionClients.get(owners[0]), cleanId };
    throw new Error(`${kind} ${rawId} is ambiguous across ${matches.length} ${w} instances; use "<instance>:${cleanId}".`);
  }

  if (clients.length === 1) return { client: clients[0], cleanId };

  const owners = [...(index.get(cleanId) ?? [])].filter((id) => extensionClients.get(id)?.socket.readyState === WebSocket.OPEN);
  if (owners.length === 1) return { client: extensionClients.get(owners[0]), cleanId };
  const hint = clients.map((c) => `"${c.browser}:${cleanId}"`).join(' or ');
  throw new Error(owners.length > 1
    ? `${kind} id ${cleanId} exists in more than one browser; use ${hint}.`
    : `Unknown ${kind} id ${cleanId} with several browsers connected; run list_tabs first or use ${hint}.`);
}

// Split a list of ids into per-client batches.
function batchByClient(rawIds, browserHint) {
  const batches = new Map();
  for (const rawId of rawIds) {
    const { client, cleanId } = resolveTarget(rawId, browserHint, tabClientIndex);
    if (!batches.has(client)) batches.set(client, []);
    batches.get(client).push(cleanId);
  }
  return batches;
}

async function fanOut(action, params, clients, onItem) {
  const results = await Promise.allSettled(clients.map((c) => sendToClient(c, action, params)));
  // Support single mock client echo in integration tests
  if (clients.length === 1 && results[0].status === 'fulfilled' && !Array.isArray(results[0].value)) {
    return results[0].value;
  }
  const all = [];
  results.forEach((res, i) => {
    if (res.status !== 'fulfilled' || !Array.isArray(res.value)) return;
    for (const item of res.value) {
      onItem(item, clients[i]);
      all.push(item);
    }
  });
  return all;
}

function withoutBrowser(params, extra) {
  const out = { ...params, ...extra };
  delete out.browser;
  return out;
}

async function routeCall(action, params = {}) {
  const clients = getActiveClients();
  if (clients.length === 0) {
    throw new Error(EXT_NOT_CONNECTED_MSG);
  }

  if (action === 'query_tabs') {
    return fanOut(action, params, clients, (tab, client) => {
      tab.browser = client.browser;
      tab.browserInstance = client.id;
      tab.browserName = client.name;
      noteOwner(tabClientIndex, tab.id, client.id);
    });
  }

  if (action === 'query_groups') {
    return fanOut(action, params, clients, (grp, client) => {
      grp.browser = client.browser;
      grp.browserInstance = client.id;
      noteOwner(groupClientIndex, grp.id, client.id);
    });
  }

  // Tab groups can't span browsers: every tab (and the target group) must
  // resolve to one client.
  if (action === 'group_tabs') {
    const batches = batchByClient(params.tab_ids, params.browser);
    let groupTarget = null;
    if (params.group_id !== undefined) {
      groupTarget = resolveTarget(params.group_id, params.browser, groupClientIndex, 'group');
      batches.set(groupTarget.client, batches.get(groupTarget.client) ?? []);
    }
    if (batches.size > 1) throw new Error('Cannot group tabs from different browsers into one group.');
    const [[client, ids]] = batches;
    const res = await sendToClient(client, action, withoutBrowser(params, { tab_ids: ids, group_id: groupTarget?.cleanId }));
    if (res && typeof res.groupId === 'number') noteOwner(groupClientIndex, res.groupId, client.id);
    return res;
  }

  if (action === 'update_group') {
    const { client, cleanId } = resolveTarget(params.group_id, params.browser, groupClientIndex, 'group');
    return sendToClient(client, action, withoutBrowser(params, { group_id: cleanId }));
  }

  // Batched across browsers, results summed (close_tabs, ungroup_tabs).
  if (Array.isArray(params.tab_ids)) {
    const sumKey = action === 'close_tabs' ? 'closed' : action === 'ungroup_tabs' ? 'ungrouped' : null;
    const batches = batchByClient(params.tab_ids, params.browser);
    if (!sumKey && batches.size > 1) throw new Error(`${action} cannot span browsers.`);
    let total = 0;
    let last;
    for (const [client, ids] of batches) {
      last = await sendToClient(client, action, withoutBrowser(params, { tab_ids: ids }));
      if (sumKey && typeof last?.[sumKey] === 'number') total += last[sumKey];
    }
    return sumKey ? { ...last, [sumKey]: total } : last;
  }

  if (params.tab_id !== undefined) {
    const { client, cleanId } = resolveTarget(params.tab_id, params.browser, tabClientIndex);
    return sendToClient(client, action, withoutBrowser(params, { tab_id: cleanId }));
  }

  if (params.browser) {
    const match = clients.find(c => c.browser === params.browser.toLowerCase() || c.id === params.browser);
    if (!match) throw new Error(`No connected browser matches "${params.browser}".`);
    return sendToClient(match, action, withoutBrowser(params));
  }

  // No target given (e.g. open_tabs without a browser): first connected browser.
  return sendToClient(clients[0], action, params);
}

// ---------------------------------------------------------------------------
// FOLLOWER: proxy calls to the owner; re-elect if the owner vanishes.
// ---------------------------------------------------------------------------

function becomeFollower() {
  role = 'follower';
  if (peerSocket && peerSocket.readyState === WebSocket.OPEN) return;
  connectPeer();
}

function connectPeer() {
  let socket;
  try {
    socket = new WebSocket(`ws://127.0.0.1:${WS_PORT}${PEER_PATH}`);
  } catch {
    scheduleReElection();
    return;
  }
  peerSocket = socket;

  socket.on('open', () => {
    log('Bridge FOLLOWER connected to owner');
    flushReady();
  });

  socket.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (msg.type !== 'reply') return;
    const p = proxyPending.get(msg.peerReqId);
    if (!p) return;
    clearTimeout(p.timer);
    proxyPending.delete(msg.peerReqId);
    if (msg.error) p.reject(new Error(msg.error));
    else           p.resolve(msg.result);
  });

  socket.on('close', () => {
    if (peerSocket === socket) peerSocket = null;
    failProxyPending();
    scheduleReElection();   // owner may have died — try to take over
  });
  socket.on('error', () => { /* close follows */ });
}

function scheduleReElection() {
  const delay = 200 + Math.floor(Math.random() * 300);
  setTimeout(() => {
    if (role === 'follower' && (!peerSocket || peerSocket.readyState !== WebSocket.OPEN)) {
      attemptBind();
    }
  }, delay);
}

function followerCall(action, params) {
  if (!peerSocket || peerSocket.readyState !== WebSocket.OPEN) {
    return Promise.reject(new Error(EXT_NOT_CONNECTED_MSG));
  }
  const peerReqId = ++proxyId;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      proxyPending.delete(peerReqId);
      reject(new Error('Timed out waiting for browser extension response (10s).'));
    }, CALL_TIMEOUT_MS);
    proxyPending.set(peerReqId, { resolve, reject, timer });
    peerSocket.send(JSON.stringify({ type: 'call', peerReqId, action, params }));
  });
}

function failProxyPending() {
  for (const [, p] of proxyPending) {
    clearTimeout(p.timer);
    p.reject(new Error('Bridge owner connection lost; please retry.'));
  }
  proxyPending.clear();
}

// ---------------------------------------------------------------------------
// Routing readiness — a call needs a live route (owner+extension, or
// follower+owner). In steady state this resolves instantly; during a cold
// start or a brief failover it parks the call up to ROUTE_GRACE_MS.
// ---------------------------------------------------------------------------

function hasRoute() {
  if (role === 'owner') {
    for (const client of extensionClients.values()) {
      if (client.socket.readyState === WebSocket.OPEN) return true;
    }
    return false;
  }
  if (role === 'follower') return !!peerSocket && peerSocket.readyState === WebSocket.OPEN;
  return false;
}

function flushReady() {
  if (!hasRoute()) return;
  while (readyWaiters.length) readyWaiters.shift()();
}

function waitForRoute() {
  if (hasRoute()) return Promise.resolve(role);
  return new Promise((resolve, reject) => {
    const onReady = () => {
      clearTimeout(timer);
      const i = readyWaiters.indexOf(onReady);
      if (i >= 0) readyWaiters.splice(i, 1);
      resolve(role);
    };
    const timer = setTimeout(() => {
      const i = readyWaiters.indexOf(onReady);
      if (i >= 0) readyWaiters.splice(i, 1);
      reject(new Error(EXT_NOT_CONNECTED_MSG));
    }, ROUTE_GRACE_MS);
    readyWaiters.push(onReady);
  });
}

// ---------------------------------------------------------------------------
// Public primitive used by every tool.
// ---------------------------------------------------------------------------

export async function callExtension(action, params = {}) {
  const activeRole = await waitForRoute();          // throws the clear error after the grace window
  if (activeRole === 'owner') {
    return routeCall(action, params);
  }
  return followerCall(action, params);
}

export function isExtensionConnected() {
  return hasRoute();
}

// Lightweight introspection for logging / a future status tool.
export function bridgeStatus() {
  const clients = getActiveClients();
  return {
    role,
    extension_connected: clients.length > 0,
    clients: clients.map(c => ({ id: c.id, browser: c.browser, name: c.name })),
    followers: peerClients.size,
    owner_reachable: role === 'follower' ? (!!peerSocket && peerSocket.readyState === WebSocket.OPEN) : undefined,
  };
}
