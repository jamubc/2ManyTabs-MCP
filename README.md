# 2ManyTabs MCP

<div align="center">

<img src="extension/icon.png" width="120" height="120" style="border-radius: 20px; margin-bottom: 10px;" alt="2ManyTabs MCP Logo" />

[![GitHub Release](https://img.shields.io/github/v/release/jamubc/2manytabs-mcp?logo=github&label=GitHub)](https://github.com/jamubc/2manytabs-mcp/releases)
[![npm version](https://img.shields.io/npm/v/2manytabs-mcp-host)](https://www.npmjs.com/package/2manytabs-mcp-host)
[![npm downloads](https://img.shields.io/npm/dt/2manytabs-mcp-host)](https://www.npmjs.com/package/2manytabs-mcp-host)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Open Source](https://img.shields.io/badge/Open%20Source-❤️-red.svg)](https://github.com/jamubc/2manytabs-mcp)

</div>

> ☄️ Expose browser tabs to your AI assistant via the Model Context Protocol. List, group, deduplicate, and bulk-close tabs directly from Claude Code, Claude Desktop, Hermes, Cursor, and more.

`2ManyTabs MCP` solves the browser clutter problem. It consists of two components: a **Browser Extension** that acts as a thin proxy for browser tabs, and a **Node.js MCP Host** that communicates with the extension over WebSocket (local loopback) and connects to your AI client over stdio.

<a href="https://glama.ai/mcp/servers/@jamubc/2manytabs-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@jamubc/2manytabs-mcp/badge" alt="2ManyTabs MCP server" />
</a>

## TLDR: [![Claude](https://img.shields.io/badge/Claude-D97757?logo=claude&logoColor=fff)](#) + [![Chrome](https://img.shields.io/badge/Google%20Chrome-4285F4?logo=googlechrome&logoColor=fff)](#)

**Goal**: Organize, sort, deduplicate, and clean up hundreds of open browser tabs using natural language.

---

## 🌐 Browser Support & Releases

`2ManyTabs MCP` is designed to be browser-agnostic:

* **Google Chrome & Chromium Browsers (Edge, Brave, Opera):** Fully supported.
* **Firefox:** Planned (Development underway for Manifest V2 compatibility).
* **Safari:** Planned.

You can download pre-packaged extension builds from the **GitHub Releases** section or use the source files directly.

---

## Architecture

```
Claude / AI Client 
       │
 (stdio JSON-RPC)
       ▼
 ┌───────────┐ 
 │  host.js  │ ◄─────── (Self-organizing Bridge: WS port 9876)
 └─────┬─────┘
       │
  (WebSocket)
       ▼
 ┌───────────┐
 │ Extension │ (thin browser tabs background worker proxy)
 └───────────┘
```

- **Unified Tool Pattern:** The browser extension is a minimal query/close proxy. All filtering, grouping, and deduplication logic resides entirely in the Node.js host. Adding new capabilities requires zero extension updates!
- **Self-Organizing Bridge:** MCP-over-stdio spawns a separate host process for every client session. `2ManyTabs` implements an **Owner/Follower pattern** where the first host binds to port `9876` (Owner) and subsequent hosts proxy calls through it (Followers). If the Owner dies, Followers automatically re-elect a new Owner.

---

## Prerequisites

Before starting, ensure you have:
1. **[Node.js](https://nodejs.org/)** (v18.0.0 or higher)
2. A supported browser (Google Chrome, Brave, Edge, etc.)
3. An available local loopback port `9876`

---

## Quick Setup

### 1. Install the MCP Host
You can run the host directly via `npx` (recommended) or download it from NPM:

#### Claude Code (One-Line Setup)
```bash
claude mcp add 2manytabs-mcp -- npx -y 2manytabs-mcp-host
```

#### Claude Desktop
Add this to your configuration file:
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

*Note: If you prefer a local git installation, clone the repository and run `bash install.sh`.*

---

### 2. Load the Browser Extension

#### For Google Chrome and Chromium Browsers
Because the extension is loaded locally during developer setup:
1. Open your browser and navigate to `chrome://extensions/` (or `edge://extensions/` for Edge).
2. Enable **Developer mode** (usually a toggle in the top-right corner).
3. Click **Load unpacked** (top-left corner).
4. Select the `extension/` directory of this repository (or unzip and load the pre-packaged zip from the `releases/` directory).
5. Click the extension icon in the toolbar; once the host is running, the popup status pill will transition to **Connected**.

---

## Configuration File Locations

- **Claude Desktop**:
  - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
  - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
  - **Linux**: `~/.config/claude/claude_desktop_config.json`

Restart your AI client/session after modifying the configuration.

---

## Example Workflow & Commands

### Natural Language Prompts
* "Analyze my open tabs and show me where they're grouped."
* "Find all duplicate tabs and close them."
* "Show me all my open Github tabs."
* "Do a dry run of closing tabs matching 'youtube' and let me know."

### Claude Code Slash Commands
Type `/2manytabs-mcp` or run tools directly:
* `/list_tabs` - Get a summary of all open tabs.
* `/close_tabs` - Bulk-close selected tabs.

---

## Tools

`2ManyTabs MCP` registers the following tools with the AI:

### 1. `list_tabs`
Retrieve and summarize all currently open tabs.
- **Histogram Visualization:** Always displays a neat proportional bar graph (using characters like `▇`) representing the top domains, allowing the AI to understand your tab profile instantly.
- **Arguments:**
  - `query` (optional string): Substring to match (case-insensitive) against tab titles or URLs.
  - `group_by` (optional enum: `domain`, `window`, `none`, defaults to `domain`): Organization style of the detailed list.
  - `duplicates_only` (optional boolean, defaults to `false`): Restricts the list to tabs that have duplicate URLs (ignoring the first occurrence).

### 2. `close_tabs`
Bulk-close tabs using one of three selection criteria.
- **Safety First:** Supports a `dry_run` preview mode. It is highly recommended to run a dry run first when closing many tabs.
- **Arguments:**
  - `tab_ids` (optional array of numbers): Close specific tab IDs.
  - `match` (optional string): Close all tabs containing this substring in their URL or title.
  - `duplicates` (optional boolean): Close every duplicate tab (keeps the first occurrence of each URL, closes the rest).
  - `dry_run` (optional boolean, defaults to `false`): If `true`, returns a JSON preview of the tabs that would be closed without actually closing them.

*Note: You must supply exactly one selection mode (`tab_ids`, `match`, or `duplicates`).*

---

## 🔒 Security Hardening

To protect your system, `2ManyTabs MCP` includes **WebSocket Origin Verification**:
- **CORS & Origin Checks:** The local host server strictly validates the `Origin` header of incoming WebSockets.
- **Extension Isolation:** Only requests originating from a `chrome-extension://` scheme can connect to the main WebSocket router. Malicious web pages trying to run local loopback attacks are rejected instantly with a `4003` HTTP socket error.
- **Loopback Bound:** The HTTP server listens exclusively on `127.0.0.1`, preventing any external machines on your local network from accessing your browser.

---

## Contributing

Contributions are welcome! If you want to help add Firefox or Safari support, please submit a pull request or report issues on GitHub.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

**Disclaimer:** This is an unofficial tool and is not affiliated with, endorsed, or sponsored by Google or Mozilla.
