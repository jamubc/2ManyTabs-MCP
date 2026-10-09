import http from 'http';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.MANYTABS_BRIDGE_PORT) || 9876;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const assert = (cond, msg) => { console.error(cond ? '  ✓' : '  ✗', msg); if (!cond) failures++; };

const httpServer = http.createServer((req, res) => { res.writeHead(200); res.end('ok'); });
const wss = new WebSocketServer({ server: httpServer });
let sawPeer = false;
wss.on('connection', (socket, req) => {
  if (req.url !== '/peer') return;
  sawPeer = true;
  socket.on('message', (raw) => {
    const msg = JSON.parse(raw);
    if (msg.type === 'call') {
      socket.send(JSON.stringify({ type: 'reply', peerReqId: msg.peerReqId, result: { pong: true, echoAction: msg.action } }));
    }
  });
});
await new Promise((r) => httpServer.listen(PORT, '127.0.0.1', r));

const { startBridge, callExtension, bridgeStatus } = await import('../bridge.js');
startBridge();
await sleep(400);
assert(bridgeStatus().role === 'follower', 'host became FOLLOWER (port already held)');
assert(sawPeer, 'FOLLOWER connected to the owner /peer endpoint');

const res = await callExtension('close_tabs', { tab_ids: [1, 2, 3] });
assert(res?.pong === true, 'FOLLOWER call is proxied through the owner and back');
assert(res?.echoAction === 'close_tabs', 'FOLLOWER forwarded the correct action to the owner');

console.error(failures === 0 ? '\nFOLLOWER PATH: ALL PASS' : `\nFOLLOWER PATH: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
