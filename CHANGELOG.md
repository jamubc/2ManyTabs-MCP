# Changelog

All notable changes to this project will be documented in this file.

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
