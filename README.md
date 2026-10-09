<div align="center">
  <a href="https://github.com/jamubc/2ManyTabs-MCP">
    <img alt="2ManyTabs MCP" width="240" src="docs/logo.png">
  </a>
</div>

# 2ManyTabs MCP ![Chrome](https://img.shields.io/badge/Chrome-4285F4?logo=googlechrome&logoColor=white) ![Firefox](https://img.shields.io/badge/Firefox-FF7139?logo=firefoxbrowser&logoColor=white) ![LibreWolf](https://img.shields.io/badge/LibreWolf-00ACFF?logo=librewolf&logoColor=white) ![Brave](https://img.shields.io/badge/Brave-FB542B?logo=brave&logoColor=white) ![Edge](https://img.shields.io/badge/Edge-0078D7) ![Opera](https://img.shields.io/badge/Opera-FF1B2D?logo=opera&logoColor=white)

An MCP server and browser extension that let your AI agent tame your overflowing tabs: find them, group them, clean them up, and run scripts in them for you.

## Install

### 1. Add the MCP server

One command, with Node.js 18 or newer installed. In Claude Code:

```shell
claude mcp add 2manytabs-mcp -- npx -y 2manytabs-mcp-host
```

Using another client? Open yours:

<details>
<summary><picture><img alt="Antigravity CLI" src="https://img.shields.io/badge/Antigravity%20CLI-4285F4?logo=google&logoColor=white" height="22"></picture></summary>

```shell
agy mcp add 2manytabs-mcp npx -y 2manytabs-mcp-host
```
</details>

<details>
<summary><picture><img alt="Codex" src="https://img.shields.io/badge/Codex-10A37F" height="22"></picture></summary>

```shell
codex mcp add 2manytabs-mcp -- npx -y 2manytabs-mcp-host
```
</details>

<details>
<summary><picture><img alt="VS Code" src="https://img.shields.io/badge/VS%20Code-007ACC" height="22"></picture> <picture><img alt="GitHub Copilot" src="https://img.shields.io/badge/GitHub%20Copilot-000000?logo=githubcopilot&logoColor=white" height="22"></picture></summary>

```shell
code --add-mcp '{"name":"2manytabs-mcp","command":"npx","args":["-y","2manytabs-mcp-host"]}'
```

This adds it to your user profile.
</details>

<details>
<summary><picture><img alt="Hermes Agent" src="https://img.shields.io/badge/Hermes%20Agent-6B4FBB" height="22"></picture></summary>

```shell
hermes mcp add 2manytabs-mcp --command npx --args -y 2manytabs-mcp-host
```
</details>

<details>
<summary><picture><img alt="OpenClaw" src="https://img.shields.io/badge/OpenClaw-E5484D" height="22"></picture></summary>

Open **Settings → MCP**, choose **Add server**, pick **Stdio**, and enter the command `npx` with the arguments `-y 2manytabs-mcp-host`.
</details>

<details>
<summary><picture><img alt="Claude Desktop" src="https://img.shields.io/badge/Claude%20Desktop-D97757?logo=claude&logoColor=white" height="22"></picture> <picture><img alt="Cursor" src="https://img.shields.io/badge/Cursor-000000?logo=cursor&logoColor=white" height="22"></picture> <picture><img alt="Windsurf" src="https://img.shields.io/badge/Windsurf-0B100F?logo=windsurf&logoColor=white" height="22"></picture> <picture><img alt="Cline" src="https://img.shields.io/badge/Cline-5A3FC0?logo=cline&logoColor=white" height="22"></picture> <picture><img alt="Continue" src="https://img.shields.io/badge/Continue-1F2937" height="22"></picture> <picture><img alt="Gemini CLI" src="https://img.shields.io/badge/Gemini%20CLI-8E75B2?logo=googlegemini&logoColor=white" height="22"></picture></summary>

Add this to the client's MCP config file, then restart the client:

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

| Client | Config file |
|---|---|
| Claude Desktop | macOS `~/Library/Application Support/Claude/claude_desktop_config.json`, Windows `%APPDATA%\Claude\claude_desktop_config.json`, Linux `~/.config/claude/claude_desktop_config.json` |
| Cursor | `~/.cursor/mcp.json`, or `.cursor/mcp.json` in a project |
| Windsurf | `mcp_config.json`, opened from **Settings → Cascade → MCP** |
| Cline | `cline_mcp_settings.json`, opened from the **MCP Servers** panel |
| Continue | `.continue/mcpServers/2manytabs-mcp.json` |
| Gemini CLI (enterprise) | `~/.gemini/settings.json`, or `.gemini/settings.json` in a project |
</details>

Any other client that runs MCP servers over stdio works with the command `npx -y 2manytabs-mcp-host`.

### 2. Add the browser extension

The extension is not in a browser store yet. Download it from the [latest release](https://github.com/jamubc/2ManyTabs-MCP/releases/latest): the file ending in `-chrome.zip` for Chrome, Brave, Edge and Opera, or `-firefox.zip` for Firefox and LibreWolf.

- Chrome and other Chromium browsers: unzip it, open `chrome://extensions`, turn on Developer mode, choose Load unpacked, and select the unzipped folder.
- Firefox and LibreWolf: open `about:debugging#/runtime/this-firefox`, choose Load Temporary Add-on, and select the zip. Firefox removes temporary add-ons when it closes, so load it again each session.

Want it signed and in the official stores, with no more temporary loads? [Open an issue](https://github.com/jamubc/2ManyTabs-MCP/issues) to ask.

## Tools

Tab ids look like `chrome:12` or `firefox:34`, and several browsers can be connected at once.

| Tool | Description |
|---|---|
| `list_tabs` | Lists open tabs across browsers, grouped by domain or window, with `query`, `duplicates_only` and `browser` filters |
| `execute_script` | Runs JavaScript in a tab (Firefox only), in the `ISOLATED` or `MAIN` world, and returns the result |
| `get_tab_text` | Returns the body text of a loaded tab |
| `close_tabs` | Closes tabs by `tab_ids`, `match` or `duplicates`, with `dry_run` to preview |
| `open_tabs` | Opens the given `urls`, adding `https://` when no scheme is present |
| `activate_tab` | Brings a tab to the foreground and focuses its window |
| `update_tab` | Sets a tab's `url`, `pinned` or `muted` state |
| `list_tab_groups` | Lists native tab groups with `title_query` filter |
| `group_tabs` | Puts tabs into a new or existing tab group with `title` and `color` |
| `ungroup_tabs` | Removes tabs from their groups |
| `update_tab_group` | Changes a group's `title`, `color` or `collapsed` state |

## Usage

Ask your agent in plain words. Some things to try:

| Ask | What happens |
|---|---|
| "How many tabs do I have open, and on which sites?" | A count per site across every connected browser |
| "Close my duplicate tabs" | Previews the duplicates, then closes them once you agree |
| "Group my GitHub tabs and call the group Work" | Creates a named tab group |
| "Summarise the article in my current tab" | Reads the page text and summarises it |
| "Find the tab with my flight booking and bring it to the front" | Searches titles and addresses, then switches to it |
| "Open the docs for React, Vue and Svelte" | Opens each site in a new tab |
| "Get every image link on this page" (Firefox) | Runs a script in the tab and returns the links |

## Compatibility

| | Chrome and Chromium | Firefox |
|---|---|---|
| Tab tools | Yes | Yes |
| Tab groups | Yes | 139 or newer |
| `execute_script` | No, returns an error | Yes |

Chrome and Firefox can be connected at the same time. Brave, Edge and Opera use the Chrome build.

<details>
<summary><strong>Interested in developing 2ManyTabs MCP?</strong></summary>

```shell
git clone https://github.com/jamubc/2ManyTabs-MCP.git
cd 2ManyTabs-MCP
bash install.sh
cd extension && npm install && npm run build && npm run build:firefox
```

`install.sh` installs the server's dependencies. Claude Code picks up the server from `.mcp.json` when you open the repository. Load the extension from `extension/.output/chrome-mv3/` or `extension/.output/firefox-mv2/manifest.json`.

</details>

## License

MIT. See [LICENSE](LICENSE).
