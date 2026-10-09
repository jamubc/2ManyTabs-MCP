<div align="center">
  <a href="https://github.com/jamubc/2ManyTabs-MCP">
    <img alt="2ManyTabs MCP" width="240" src="extension/public/icon.png">
  </a>
</div>

# 2ManyTabs MCP

An MCP server and browser extension that let AI clients list, script and close tabs in Chrome and Firefox.

## Download

Clone the repo and install the host. `install.sh` runs on macOS and Linux. Then build the extension.

```shell
git clone https://github.com/jamubc/2ManyTabs-MCP.git
cd 2ManyTabs-MCP
bash install.sh
cd extension && npm install && npm run build && npm run build:firefox
```

## Get started

Register the host with your MCP client from the repo root. This example uses Claude Code. Any client that runs a stdio command works with the same `node` command and path.

```shell
claude mcp add 2manytabs-mcp -- node "$PWD/native-host/host.js"
```

### Load the extension

Chrome and other Chromium browsers: open `chrome://extensions`, turn on Developer mode, choose Load unpacked, and select `extension/.output/chrome-mv3/`. Firefox: open `about:debugging#/runtime/this-firefox`, choose Load Temporary Add-on, and select `extension/.output/firefox-mv2/manifest.json`. The extension popup shows Connected once the host is running.

## Usage

The host registers eleven tools. Tab ids can be numbers or `chrome:12` and `firefox:34` style ids. With several browsers connected, a bare number is refused when more than one browser owns it. The `browser` parameter narrows a call to one browser.

| Tool | What it does |
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

Tab group tools need Firefox 139 or newer on Firefox.

## Project structure

| Path | Purpose |
|---|---|
| `native-host/` | MCP server over stdio, the WebSocket bridge and the tool definitions, with unit tests |
| `extension/` | WXT browser extension for Chrome (MV3) and Firefox (MV2) |
| `docs/` | Architecture and security notes |
| `install.sh` | Installs host dependencies and writes the launcher script |
| `llms.txt` | Summary of the project for language models |
| `CHANGELOG.md` | Release history |

## Requirements

- Node.js 18 or newer
- Free loopback port 9876
- Chrome or another Chromium browser, or Firefox

## License

MIT. See [LICENSE](LICENSE).