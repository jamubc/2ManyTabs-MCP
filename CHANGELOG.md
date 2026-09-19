# Changelog

All notable changes to this project will be documented in this file.

## [2.1.0] - 2026-09-19

### Added
- Firefox support (MV2), built alongside Chrome (MV3) from one WXT source tree. Tab-group tools are unsupported on Firefox and fail per-tool with a clear error.
- Tab-group tools: `list_tab_groups`, `group_tabs`, `ungroup_tabs`, `update_tab_group`.
- `activate_tab`, `update_tab`, `get_tab_text` tools.

### Changed
- Extension rebuilt on WXT (`entrypoints/`, `lib/tab-ops.js`, `wxt.config.ts`); `native-host/` is unchanged.
- `list_tabs` grouping/rendering extracted into `present.js`/`rendering.js`; adds group prefixes to output.
- `close_tabs` handles a failed extension query with a clear error instead of throwing raw.
- README and `llms.txt` updated for the extension's new build step and Firefox install.
