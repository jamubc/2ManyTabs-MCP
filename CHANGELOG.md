# Changelog

All notable changes to this project will be documented in this file.

## [3.1.0] - Unreleased

### Added
- **Guided tab clean-up.** Tell your agent "I have too many tabs" and it follows a step-by-step method: save a record, sort tabs into clusters, close only what you confirm, and keep the few real to-dos with a next step and a when, in your words. The method ships once, as the `closing-tab-loops` Agent Skill in `native-host/skills/`, and reaches every client as the `start_tab_cleanup` tool, the `close-the-loops` MCP prompt, and server instructions that point agents at it.
- `cluster_tabs` summarises any number of tabs as per-site clusters with counts, ages, flags and the `match` string that closes each one. Titles on private sites (banking, health, mail, sign-in) are hidden.
- `snapshot_tabs` saves a record of every open tab to the per-user app-data folder; `reopen_tabs` reopens closed tabs from it.
- `list_tabs` `show_urls`; the `close_tabs` dry-run sample now includes each tab's URL.
- The extension reports each tab's last-used time (Chrome 121+, Firefox). Rebuild and reload the extension to get ages; without it ages show as unknown.

### Changed
- Clean-up replies are short by design: each message leads with where things stand, shows at most five short lines and ends with one question, from filled templates in the skill. On a real 90-tab set a "survey only" reply went from 17 lines and 368 words to 5 or 6 lines and about 120 words.
- `cluster_tabs` adds a "quick win" count (broken pages, copies and searches, each counted once) and a `quickwin` signal, and shows 12 groups by default.
- `list_tabs` no longer asks agents to put its bar graph in their reply, and points them at `cluster_tabs` for surveys.
- `close_tabs` needs `expected_count` to close more than 10 tabs, and closes nothing if the selection no longer has exactly that many.
- `close_tabs` with `match` or `duplicates` leaves pinned tabs open unless `include_pinned` is true. Explicit `tab_ids` still close pinned tabs.

### Fixed
- `list_tabs` silently stopped at 1,000 tabs. It still shows at most 1,000, and now says how many there really are.

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
