<div align="center">
  <a href="https://github.com/jamubc/2ManyTabs-MCP">
    <img alt="2ManyTabs MCP" width="240" src="docs/logo.png">
  </a>
</div>

# 2ManyTabs MCP ![Chrome](https://img.shields.io/badge/Chrome-4285F4?logo=googlechrome&logoColor=white) ![Firefox](https://img.shields.io/badge/Firefox-FF7139?logo=firefoxbrowser&logoColor=white) ![LibreWolf](https://img.shields.io/badge/LibreWolf-00ACFF?logo=librewolf&logoColor=white) ![Brave](https://img.shields.io/badge/Brave-FB542B?logo=brave&logoColor=white) ![Edge](https://img.shields.io/badge/Edge-0078D7) ![Opera](https://img.shields.io/badge/Opera-FF1B2D?logo=opera&logoColor=white)

An MCP server and browser extension that let your AI agent tame your overflowing tabs: find them, group them, clean them up, and run scripts in them for you.

## Install

### 1. Add the MCP server

One command, with Node.js 18 or newer installed. This example uses Claude Code:

```shell
claude mcp add 2manytabs-mcp -- npx -y 2manytabs-mcp-host
```

Other clients (Claude Desktop, Cursor, VS Code and others) take the same command in their MCP config:

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

### 2. Add the browser extension

The extension is not in a browser store yet. Download it from the [latest release](https://github.com/jamubc/2ManyTabs-MCP/releases/latest): the file ending in `-chrome.zip` for Chrome, Brave, Edge and Opera, or `-firefox.zip` for Firefox and LibreWolf.

- Chrome and other Chromium browsers: unzip it, open `chrome://extensions`, turn on Developer mode, choose Load unpacked, and select the unzipped folder.
- Firefox and LibreWolf: open `about:debugging#/runtime/this-firefox`, choose Load Temporary Add-on, and select the zip. Firefox removes temporary add-ons when it closes, so load it again each session.

Want it signed and in the official stores, with no more temporary loads? [Open an issue](https://github.com/jamubc/2ManyTabs-MCP/issues) to ask.

### 3. Check it works

Restart your MCP client and ask it to "list my open tabs". You should get your tabs back with ids like `chrome:12` or `firefox:34`. If it says the extension is not connected, open the extension and check that it shows Connected.

## Tools

Ask your agent in plain words, for example "close my duplicate tabs", "group my GitHub tabs" or "what does the pricing tab say?". Tab ids look like `chrome:12` or `firefox:34`, and several browsers can be connected at once.

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

## Compatibility

| | Chrome and Chromium | Firefox |
|---|---|---|
| Tab tools | Yes | Yes |
| Tab groups | Yes | 139 or newer |
| `execute_script` | No, returns an error | Yes |

Chrome and Firefox can be connected at the same time. Brave, Edge and Opera use the Chrome build. The server needs Node.js 18 or newer and the free local port 9876.

## Develop from source

```shell
git clone https://github.com/jamubc/2ManyTabs-MCP.git
cd 2ManyTabs-MCP
bash install.sh
cd extension && npm install && npm run build && npm run build:firefox
```

`install.sh` installs the server's dependencies. Claude Code picks up the server from `.mcp.json` when you open the repository. Load the extension from `extension/.output/chrome-mv3/` or `extension/.output/firefox-mv2/manifest.json`.

## License

MIT. See [LICENSE](LICENSE).
