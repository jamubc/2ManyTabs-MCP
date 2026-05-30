// Owner-path test: a lone host should bind the port, own the extension, serve
// its own calls, AND relay a follower's proxied calls. Run on a scratch port:
//   MANYTABS_BRIDGE_PORT=19876 node test/owner.mjs
import { startBridge, callExtension, isExtensionConnected, bridgeStatus } from '../bridge.js';
import { WebSocket } from 'ws';

const PORT = Number(process.env.MANYTABS_BRIDGE_PORT) || 9876;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const assert = (cond, msg) => { console.error(cond ? '  ✓' : '  ✗', msg); if (!cond) failures++; };

startBridge();
await sleep(300);
assert(bridgeStatus().role === 'owner', 'lone host became OWNER (bound the port)');

// Fake extension: echoes every request so we can see routing end-to-end.
const ext = new WebSocket(`ws://127.0.0.1:${PORT}/`, {
  origin: 'chrome-extension://mock-extension-id-for-testing'
});
ext.on('message', (raw) => {
  const msg = JSON.parse(raw);
  ext.send(JSON.stringify({ id: msg.id, result: { pong: true, echoAction: msg.action } }));
});
await new Promise((r) => ext.on('open', r));
await sleep(100);
assert(isExtensionConnected(), 'isExtensionConnected() true once the extension joins');

const local = await callExtension('ping');
assert(local?.pong === true, 'OWNER local call resolves via the extension');
assert(local?.echoAction === 'ping', 'OWNER forwarded the correct action to the extension');

// Fake follower: connects to /peer and proxies a call through the owner.
const peer = new WebSocket(`ws://127.0.0.1:${PORT}/peer`);
await new Promise((r) => peer.on('open', r));
const reply = await new Promise((resolve) => {
  peer.on('message', (raw) => resolve(JSON.parse(raw)));
  peer.send(JSON.stringify({ type: 'call', peerReqId: 42, action: 'query_tabs', params: {} }));
});
assert(reply.type === 'reply', 'OWNER answers a follower with type=reply');
assert(reply.peerReqId === 42, 'OWNER preserves peerReqId for correlation');
assert(reply.result?.echoAction === 'query_tabs', 'OWNER routed the follower call to the extension and back');

// No-extension path: after the extension leaves, calls must error clearly (post-grace).
ext.close();
await sleep(150);
let emsg = '';
try { await callExtension('ping'); } catch (e) { emsg = e.message; }
assert(/not connected/i.test(emsg), 'call rejects with the clear "not connected" message when the extension is gone');

console.error(failures === 0 ? '\nOWNER PATH: ALL PASS' : `\nOWNER PATH: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
