<div align="center">
  <a href="https://github.com/jamubc/2ManyTabs-MCP">
    <img alt="2ManyTabs MCP" width="240" src="extension/public/icon.png">
  </a>
</div>

# 2ManyTabs MCP

An MCP server & browser extension combo that let AI clients (with MCP support) manage your overflowing tabs, script for you, and organize (group, cleanup, ect)

## Install

### 1. Add the MCP server

One command. This example uses Claude Code:

```shell
claude mcp add 2manytabs-mcp -- npx -y 2manytabs-mcp-host
```

Any other MCP client takes the same command in its config:

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

Download the zip for your browser from the [latest release](https://github.com/jamubc/2ManyTabs-MCP/releases/latest).

- Chrome and other Chromium browsers: unzip `2manytabs-mcp-extension-<version>-chrome.zip`, open `chrome://extensions`, turn on Developer mode, choose Load unpacked, and select the unzipped folder.
- Firefox: open `about:debugging#/runtime/this-firefox`, choose Load Temporary Add-on, and select `2manytabs-mcp-extension-<version>-firefox.zip`. Firefox removes temporary add-ons when it closes.

If you would like this project to be signed and released through official channels (no more temporary loads), please consider supporting or opening an issue requesting it.

## Usage


| Tool | Description |
|---|---|
| `list_tabs` | Lists open tabs across browsers, grouped by domain or window, with `query`, `duplicates_only` and `browser` filters |
| `execute_script` | Runs JavaScript in a tab, in the `ISOLATED` or `MAIN` world, and returns the result |
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
| `execute_script` | No, Chrome blocks it | Yes |

Chrome and Firefox can be connected at the same time. The server needs Node.js 18 or newer and the free local port 9876, and works with any MCP client that can run a command (Claude Code, Claude Desktop, Cursor, VS Code and others).

## Develop from source

```shell
git clone https://github.com/jamubc/2ManyTabs-MCP.git
cd 2ManyTabs-MCP
bash install.sh
cd extension && npm install && npm run build && npm run build:firefox
```

Claude Code picks up the server from `.mcp.json` when you open the repository. Load the extension from `extension/.output/chrome-mv3/` or `extension/.output/firefox-mv2/manifest.json`.

## License

MIT. See [LICENSE](LICENSE).
