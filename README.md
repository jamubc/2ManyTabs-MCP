# 2ManyTabs MCP
<img width="799" height="254" alt="image" src="https://github.com/user-attachments/assets/7ee50e2b-cb51-43b2-b3b4-e87aeb0e21c4" />

<div align="center">

<img src="extension/public/icon.png" width="120" height="120" style="border-radius: 20px; margin-bottom: 10px;" alt="2ManyTabs MCP Logo" />

[![GitHub Release](https://img.shields.io/github/v/release/jamubc/2manytabs-mcp?logo=github&label=GitHub)](https://github.com/jamubc/2manytabs-mcp/releases)
[![npm version](https://img.shields.io/npm/v/2manytabs-mcp-host)](https://www.npmjs.com/package/2manytabs-mcp-host)
[![npm downloads](https://img.shields.io/npm/dt/2manytabs-mcp-host)](https://www.npmjs.com/package/2manytabs-mcp-host)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

</div>

> List, group, deduplicate, bulk-close, activate, and update browser tabs with natural language — from any MCP client.

A browser extension (Chrome and Firefox, one source tree built with [WXT](https://wxt.dev)) proxies a fixed set of `browser.tabs`, `browser.tabGroups`, and `browser.scripting` operations. A Node.js MCP host handles all the logic (filtering, grouping, dedup) and talks to your AI client over stdio. Everything runs locally on loopback. Tools that only filter or reshape data from existing browser operations ship without any extension change; adding a genuinely new browser operation requires a new handler in the extension's `dispatch()` (and sometimes a new manifest permission) plus a rebuild/reload.

## Browsers

Works with any Chromium browser, and Firefox:

[![Chrome](https://img.shields.io/badge/Chrome-4285F4?logo=googlechrome&logoColor=fff&style=flat-square)](https://www.google.com/chrome/)
[![Brave](https://img.shields.io/badge/Brave-FF1B2D?logo=brave&logoColor=fff&style=flat-square)](https://brave.com/)
[![Edge](https://img.shields.io/badge/Edge-0078D7?logo=microsoftedge&logoColor=fff&style=flat-square)](https://www.microsoft.com/edge)
[![Opera](https://img.shields.io/badge/Opera-FF1B2D?logo=opera&logoColor=fff&style=flat-square)](https://www.opera.com/)
[![Comet](https://img.shields.io/badge/Comet-886FBF?style=flat-square)](https://www.perplexity.ai/comet)
[![Firefox](https://img.shields.io/badge/Firefox-FF7139?logo=firefox&logoColor=fff&style=flat-square)](https://www.mozilla.org/firefox/)

The extension is built with [WXT](https://wxt.dev), which generates a Chrome MV3 build and a Firefox MV2 build from one source tree — tab groups (Chrome-only) are feature-detected and disabled cleanly on Firefox. Safari is planned.

---

## Prerequisites

- **[Node.js](https://nodejs.org/) v18+**
- Local port `9876` available

---

## Step 1 · Install the MCP Host

Pick your client below. They all run the same server — just different config locations.

### Verified Clients

<details>
<summary><strong>Claude Code</strong></summary>

```bash
claude mcp add 2manytabs-mcp -- npx -y 2manytabs-mcp-host
```
</details>

<details>
<summary><strong>Claude Desktop</strong></summary>

Add to your config file:

| OS | Path |
|---|---|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux | `~/.config/claude/claude_desktop_config.json` |

```json
{
  "mcpServers": {
    "2manytabs-mcp": {
      "command": "npx",
      "args": ["-y", "2manytabs-mcp-host"]
    }
  }
}
```

Restart Claude Desktop after saving.
</details>

<details>
<summary><strong>VS Code / GitHub Copilot Chat</strong></summary>

Create `.vscode/mcp.json` in your workspace (or add to your user `settings.json` under `"mcp"`):

```json
{
  "mcpServers": {
    "2manytabs-mcp": {
      "command": "npx",
      "args": ["-y", "2manytabs-mcp-host"]
    }
  }
}
```

See the [VS Code MCP docs](https://code.visualstudio.com/docs/copilot/customization/mcp-servers) for details.
</details>

<details>
<summary><strong>Cursor</strong></summary>

Open **Settings → MCP** and add a new server, or create/edit `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "2manytabs-mcp": {
      "command": "npx",
      "args": ["-y", "2manytabs-mcp-host"]
    }
  }
}
```
</details>

<details>
<summary><strong>Windsurf</strong></summary>

Open **Settings → Cascade → MCP**, or create/edit `mcp_config.json`:

```json
{
  "mcpServers": {
    "2manytabs-mcp": {
      "command": "npx",
      "args": ["-y", "2manytabs-mcp-host"]
    }
  }
}
```

See the [Windsurf MCP guide](https://windsurf.com/university/general-education/intro-to-mcp) for details.
</details>

<details>
<summary><strong>Continue</strong></summary>

Add to `.continue/config.json` (or create `.continue/mcpServers/2manytabs-mcp.json`):

```json
{
  "mcpServers": {
    "2manytabs-mcp": {
      "command": "npx",
      "args": ["-y", "2manytabs-mcp-host"]
    }
  }
}
```

See the [Continue MCP docs](https://docs.continue.dev/customize/mcp-tools) for details.
</details>

<details>
<summary><strong>Cline</strong></summary>

Open the **MCP Servers** panel in Cline and add a new server:

- **Command:** `npx`
- **Args:** `-y 2manytabs-mcp-host`

Or edit the Cline MCP config JSON directly with the same block used above. See the [Cline MCP docs](https://docs.cline.bot/mcp/mcp-overview) for details.
</details>

<details>
<summary><strong>Hermes Agent</strong></summary>

```bash
hermes mcp add 2manytabs-mcp --command "npx -y 2manytabs-mcp-host"
```

Restart your session (`/reset` or start a new `hermes` invocation), then verify:

```bash
hermes mcp list
hermes mcp test 2manytabs-mcp
```

Config lives at `~/.hermes/config.yaml` under the `mcp` section.
</details>

### Should Also Work

These clients support MCP but we haven't tested them directly. The same JSON config block should work — just drop it into the client's MCP config file:

| Client | Notes |
|---|---|
| [LibreChat](https://docs.librechat.ai/) | MCP agent/tool server support documented |
| [ChatGPT](https://platform.openai.com/docs/mcp) | MCP connectors exist; local stdio flow unverified |
| [Sourcegraph Cody](https://sourcegraph.com/cody) | MCP via OpenCTX; setup syntax unverified |
| [Genkit](https://firebase.google.com/products/genkit) | `genkitx-mcp` plugin can consume MCP servers |
| [Zed](https://zed.dev/) | Tool support is experimental — prompts/resources only in some builds |

If your client speaks MCP over stdio, it will work. Point it at `npx -y 2manytabs-mcp-host` and you're set.

---

## Step 2 · Load the Browser Extension

First build it — the extension is a [WXT](https://wxt.dev) project, so it needs a build step (the native host does not):

```bash
cd extension
npm install
npm run build           # → .output/chrome-mv3/  (Chrome, Brave, Edge, Opera, Comet)
npm run build:firefox   # → .output/firefox-mv2/  (Firefox)
```

<details>
<summary><strong>Chrome / Chromium</strong></summary>

1. Go to `chrome://extensions/` (or `edge://extensions/`, `brave://extensions/`, etc.)
2. Enable **Developer mode** (toggle in the top-right)
3. Click **Load unpacked**
4. Select `extension/.output/chrome-mv3/`
5. Click the extension icon in the toolbar — the popup should show **Connected** once the host is running

</details>

<details>
<summary><strong>Firefox</strong></summary>

1. Go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Select `extension/.output/firefox-mv2/manifest.json`
4. Click the extension icon in the toolbar — the popup should show **Connected** once the host is running

Temporary add-ons are unloaded when Firefox restarts; reload as needed during development. Tab-group tools are unsupported on Firefox (no `tabGroups` API) and fail with a clear error instead of breaking other tools.

</details>

### Extension development

Run from `extension/`:

- `npm run dev` / `npm run dev:firefox` — launches Chrome/Firefox with the extension loaded and hot-reloads on save
- `npm run build` / `npm run build:firefox` — production build to `.output/<target>/`
- `npm run zip` / `npm run zip:firefox` — packages a distributable `.zip` for each target

---

## What You Can Say

Just talk to your AI client:

- *"Show me all my open tabs."*
- *"Find and close duplicate tabs."*
- *"Close everything matching 'youtube'."*
- *"Do a dry run of closing all tabs from reddit.com."*
- *"Group my tabs by domain and show the breakdown."*

---

## Tools

The host exposes ten tools:

### `list_tabs`

Read-only. Returns a domain histogram with proportional bars and a per-domain listing with titles, pinned (📌), and audible (🔊) flags.

| Param | Type | Default | Description |
|---|---|---|---|
| `query` | string | — | Substring filter on title or URL |
| `group_by` | `"domain"` · `"window"` · `"none"` | `"domain"` | How to group results |
| `duplicates_only` | boolean | `false` | Show only duplicate URLs |

### `close_tabs`

Closes tabs. Exactly one selection mode required:

| Param | Type | Description |
|---|---|---|
| `tab_ids` | number[] | Close specific tab IDs |
| `match` | string | Close tabs matching this substring |
| `duplicates` | boolean | Close all duplicates (keeps first occurrence) |
| `dry_run` | boolean | Preview what would close without closing |

### `open_tabs`

Opens new tabs in the browser.

| Param | Type | Description |
|---|---|---|
| `urls` | string[] | Array of URLs to open. Required. If no protocol is provided, `https://` is prepended automatically. |

### `list_tab_groups`

Read-only. Lists all existing native Chrome Tab Groups in the current browser session, including their IDs, titles, colors, collapsed states, and parent window IDs.

| Param | Type | Description |
|---|---|---|
| `title_query` | string | Case-insensitive substring filter for group titles. |

### `group_tabs`

Groups open Chrome tabs into native Chrome Tab Groups. Can create a new group or add tabs to an existing group.

| Param | Type | Description |
|---|---|---|
| `tab_ids` | number[] | Array of tab IDs to add to the group. Required. |
| `group_id` | number | Add to an existing group ID. If omitted, a new group is created. |
| `title` | string | Title to set on the group (new or existing). |
| `color` | `"grey"` · `"blue"` · `"red"` · `"yellow"` · `"green"` · `"pink"` · `"purple"` · `"cyan"` · `"orange"` | Color to set on the group (new or existing). |

### `ungroup_tabs`

Removes one or more open Chrome tabs from their current native Tab Groups.

| Param | Type | Description |
|---|---|---|
| `tab_ids` | number[] | Array of tab IDs to remove from any groups. Required. |

### `update_tab_group`

Updates properties of an existing native Chrome Tab Group.

| Param | Type | Description |
|---|---|---|
| `group_id` | number | The numeric ID of the tab group to update. Required. Obtain from `list_tab_groups` or `list_tabs`. |
| `title` | string | New title for the group. |
| `color` | `"grey"` · `"blue"` · `"red"` · `"yellow"` · `"green"` · `"pink"` · `"purple"` · `"cyan"` · `"orange"` | New color for the group. |
| `collapsed` | boolean | Set `true` to collapse the group, `false` to expand it. |

### `activate_tab`

Brings a specific browser tab to the foreground, activating it and focusing its containing window.

| Param | Type | Description |
|---|---|---|
| `tab_id` | number | The numeric ID of the tab to activate. Required. |

### `update_tab`

Modifies properties of an open browser tab: navigate it to a new URL, pin/unpin it, or mute/unmute its audio.

| Param | Type | Description |
|---|---|---|
| `tab_id` | number | The numeric ID of the tab to update. Required. |
| `url` | string | A new URL to navigate the tab to. If no protocol is provided, `https://` is prepended. |
| `pinned` | boolean | Set `true` to pin the tab, `false` to unpin it. |
| `muted` | boolean | Set `true` to mute the tab, `false` to unmute it. |

### `get_tab_text`

Read-only. Extracts the plain body text of a loaded browser tab via `chrome.scripting`. Useful for summarization or classification. Fails on restricted internal browser pages (e.g., `chrome://`, `edge://`, or extension pages) or if the tab is not loaded.

| Param | Type | Description |
|---|---|---|
| `tab_id` | number | The numeric ID of the tab whose body text to extract. Required. |

---

## Architecture

```
  AI Client ◄──stdio──► MCP Host ──WebSocket :9876──► Browser Extension (Chrome / Firefox)
                           │
                           ▼
                      Follower Hosts
```

- One extension source tree (`extension/`, built with [WXT](https://wxt.dev)) produces a Chrome MV3 build and a Firefox MV2 build. The extension proxies a fixed set of `browser.tabs`, `browser.tabGroups`, and `browser.scripting` operations (`extension/lib/tab-ops.js`); `browser.tabGroups` has no Firefox equivalent and is feature-detected, failing only the affected tools with a clear error. All selection, filtering, and reshaping logic lives in the host. Tools that only filter or reshape data from an existing browser operation ship with no extension change; adding a genuinely new browser operation requires a new `case` in `dispatch()` (and sometimes a new manifest permission in `wxt.config.ts`) plus a rebuild/reload.
- Multiple AI clients can share one browser. Hosts self-organize: one binds port 9876 (owner), the rest proxy through it (followers). On owner death, followers re-elect automatically.
- The extension reconnects via `browser.alarms` every 30s (MV3 idle behavior).
- `native-host/` is browser-agnostic and shared unchanged by both builds — the WXT build step only affects `extension/`; installing or configuring the MCP host is unaffected.

---

## Security

- **Loopback only** — the server binds to `127.0.0.1`, not `0.0.0.0`.
- **Origin validation** — only `chrome-extension://` or `moz-extension://` origins can connect. Web pages attempting loopback attacks get rejected with a `4003` close code.
- **No cloud, no daemon** — everything stays on your machine.

---

## Contributing

PRs welcome. Safari support is the biggest gap right now:

[![Safari](https://img.shields.io/badge/Safari-Planned-000000?logo=safari&logoColor=fff&style=flat-square)](https://www.apple.com/safari/)

For a local dev setup: run `bash install.sh` for the MCP host, and see [Extension development](#extension-development) for the browser side.

## License

MIT — see [LICENSE](LICENSE).
