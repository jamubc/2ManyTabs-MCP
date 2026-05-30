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
let extensionSocket = null;         // the browser extension's socket
const peerClients   = new Set();    // connected follower sockets
let wireId          = 0;            // id for requests we send to the extension
const inflight      = new Map();    // wireId → delivery descriptor (local or peer)

// FOLLOWER state ----------------------------------------------------
let peerSocket      = null;         // our client connection to the owner
let proxyId         = 0;            // id for requests we send to the owner
const proxyPending  = new Map();    // proxyId → { resolve, reject, timer }

// Calls parked until a usable route appears (covers cold start / failover).
const readyWaiters  = [];

function log(msg) {
  // stderr only — stdout is reserved for the MCP stdio transport.
  process.stderr.write(`[2manytabs-mcp] ${msg}\n`);
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
    res.end('2ManyTabs MCP host running\n');
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
      // Extension connections must originate from a chrome-extension:// URI.
      if (!origin.startsWith('chrome-extension://')) {
        log(`Rejected extension connection from unauthorized origin: ${origin}`);
        socket.close(4003, 'Unauthorized origin');
        return;
      }
      handleExtensionConnection(socket);
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

function handleExtensionConnection(socket) {
  extensionSocket = socket;
  log('Extension connected');
  flushReady();

  socket.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    const d = inflight.get(msg.id);
    if (!d) return;
    clearTimeout(d.timer);
    inflight.delete(msg.id);
    deliver(d, msg.result, msg.error);
  });

  socket.on('close', () => {
    if (extensionSocket === socket) {
      extensionSocket = null;
      log('Extension disconnected');
    }
  });
  socket.on('error', () => { /* close handles cleanup */ });
}

function handlePeerConnection(socket) {
  peerClients.add(socket);
  log(`Follower host connected (${peerClients.size} active)`);

  socket.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (msg.type !== 'call') return;
    forwardToExtension(msg.action, msg.params, { kind: 'peer', socket, peerReqId: msg.peerReqId });
  });

  socket.on('close', () => { peerClients.delete(socket); });
  socket.on('error', () => { /* close handles cleanup */ });
}

// Send one request to the extension on behalf of a local caller or a follower.
function forwardToExtension(action, params, descriptor) {
  if (!extensionSocket || extensionSocket.readyState !== WebSocket.OPEN) {
    deliver(descriptor, undefined, EXT_NOT_CONNECTED_MSG);
    return;
  }
  const id = ++wireId;
  descriptor.timer = setTimeout(() => {
    inflight.delete(id);
    deliver(descriptor, undefined, 'Timed out waiting for browser extension response (10s).');
  }, CALL_TIMEOUT_MS);
  inflight.set(id, descriptor);
  extensionSocket.send(JSON.stringify({ id, action, ...(params || {}) }));
}

// Deliver an extension result back to wherever the request came from.
function deliver(descriptor, result, error) {
  if (descriptor.kind === 'local') {
    if (error) descriptor.reject(new Error(error));
    else       descriptor.resolve(result);
  } else { // 'peer'
    if (descriptor.socket.readyState === WebSocket.OPEN) {
      descriptor.socket.send(JSON.stringify({ type: 'reply', peerReqId: descriptor.peerReqId, result, error }));
    }
  }
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

// The owner connection dropped. After a little jitter (to avoid a thundering
// herd of followers), try to become the owner. Whoever wins the port wins;
// the rest will EADDRINUSE and fall back to following the new owner.
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
  if (role === 'owner')    return !!extensionSocket && extensionSocket.readyState === WebSocket.OPEN;
  if (role === 'follower') return !!peerSocket      && peerSocket.readyState      === WebSocket.OPEN;
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
    return new Promise((resolve, reject) => {
      forwardToExtension(action, params, { kind: 'local', resolve, reject });
    });
  }
  return followerCall(action, params);
}

export function isExtensionConnected() {
  return hasRoute();
}

// Lightweight introspection for logging / a future status tool.
export function bridgeStatus() {
  return {
    role,
    extension_connected: !!extensionSocket && extensionSocket.readyState === WebSocket.OPEN,
    followers: peerClients.size,
    owner_reachable: role === 'follower' ? (!!peerSocket && peerSocket.readyState === WebSocket.OPEN) : undefined,
  };
}
