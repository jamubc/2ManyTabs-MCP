# Architecture

```
AI client ◄──stdio──► MCP host ──WebSocket :9876──► browser extension (Chrome / Firefox)
                         ▲
        other hosts ─────┘  (followers, via ws://127.0.0.1:9876/peer)
```

- One extension source tree (`extension/`, built with [WXT](https://wxt.dev)) produces a Chrome MV3 build and a Firefox MV2 build.
- The extension proxies a fixed set of `browser.tabs`, `browser.tabGroups` and `browser.scripting` operations in `extension/lib/tab-ops.js`. Selection, filtering and reshaping live in the host.
- A tool that only filters or reshapes data from an existing browser operation needs no extension change. A new browser operation needs a new `case` in `dispatch()` in `extension/entrypoints/background.js`, possibly a manifest permission in `extension/wxt.config.ts`, and a rebuild and reload.
- Several AI clients can share one browser. Each client starts its own host. One host binds port 9876 and becomes the owner. The rest connect to it as followers and proxy their calls. If the owner exits, followers race to bind the port and one takes over.
- Several browsers and several profiles can connect at once. Each connection is a client with its own instance id. `list_tabs` merges their tabs and tags each with its browser.
- A bare tab id is routed to the one browser that owns it. If more than one browser reports the same id, or none does while several are connected, the host refuses the call and asks for `browser:id`. Tab groups cannot span browsers.
- The extension reconnects through `browser.alarms` every 30 seconds, because Chrome MV3 service workers go idle.
- `native-host/` is browser-agnostic and shared by both builds.

## Security

- The host binds to `127.0.0.1` only.
- Extension connections must carry a `chrome-extension://` or `moz-extension://` origin. Other origins are closed with code `4003`.
- Follower connections to `/peer` must carry no `Origin` header, which keeps web pages out.
- Nothing leaves the machine.
