# Changelog

All notable changes to this project will be documented in this file.

## [3.0.0] - 2026-10-09

### Added
- **Several browsers at once.** Chrome and Firefox (and several profiles) can connect together. Tabs carry ids like `chrome:12` and `firefox:34`, and every call goes to the browser that owns the tab.
- **`execute_script`** runs JavaScript in a Firefox tab and returns the result. Chrome tabs get a clear error, because Chrome's extension rules block running script text.
- **A live connection map in the extension popup.** It shows each connected agent and browser, highlights the browser you are in, and lights the path of every real call as it happens, with the last call and how long ago it was.
- `list_tabs` groups windows by browser and summarises counts per browser.
- `.mcp.json` registers the local server, so Claude Code sees it in this repository after a one-time approval.

### Changed
- A bare tab id is used only when exactly one connected browser owns it; otherwise the call is refused with the ids to use instead, so nothing lands in the wrong browser.
- Tab group tools accept `browser:id` ids, and grouping tabs from different browsers is refused.

## [2.1.0] - 2026-09-19

### Added
- Firefox support (MV2), built alongside Chrome (MV3) from one WXT source tree. Tab-group tools require Firefox 139+ (`tabGroups.query`/`get`/`update`, added Firefox 139) and fail per-tool with a clear error on older versions.
- Tab-group tools: `list_tab_groups`, `group_tabs`, `ungroup_tabs`, `update_tab_group`.
- `activate_tab`, `update_tab`, `get_tab_text` tools.

### Changed
- Extension rebuilt on WXT (`entrypoints/`, `lib/tab-ops.js`, `wxt.config.ts`); `native-host/` is unchanged.
- `list_tabs` grouping/rendering extracted into `present.js`/`rendering.js`; adds group prefixes to output.
- `close_tabs` handles a failed extension query with a clear error instead of throwing raw.
- README and `llms.txt` updated for the extension's new build step and Firefox install.

### Fixed
- Tab-group tools failing on Firefox: the manifest was missing the `tabGroups` permission. Now requested on both targets, gated to Firefox 139+.
- `open_tabs` mangling non-http URLs like `about:blank` by blindly prepending `https://`.
- `get_tab_text` failing on any real page: `host_permissions` only covered localhost. Added `*://*/*`.
- `list_tabs` never showing a tab's id, so id-based tools had no way to get one. Listings now lead with `[id:N]`.
