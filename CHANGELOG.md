# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - Unreleased

### Added
- **`open_tabs` tool**: New tool allowing agents to open specific URLs or batches of URLs in the browser.
- **Programmatic Tool Calling**: `close_tabs` and `open_tabs` now return pure JSON (along with clear return schemas in their descriptions) instead of conversational strings to enable easier agentic scripting and data extraction.
- **Power Toggle**: Added an on/off switch to the Chrome Extension popup, letting you easily suspend MCP access without disabling the entire extension.
- **Graceful Shutdown**: Added process signal handlers (`SIGINT`, `SIGTERM`, and `stdin` disconnects) to `native-host/host.js` so the host process exits cleanly and doesn't leave zombie node processes hanging when the MCP client stops.

### Changed
- **README & LLM Context Overhaul**: Completely rewrote `README.md` and `llms.txt` to remove bloat and include explicit, copy-pasteable installation instructions for all major MCP clients (Claude Desktop, VS Code, Cursor, Windsurf, Continue, Cline, Hermes, LibreChat).
- **Extension UI Refinement**: Modernized and decluttered the popup interface using minimalist design principles. Improved typography, simplified the robot eye SVG, and streamlined the layout.
- **Safeguards on `close_tabs`**: Explicitly instructed LLMs (via the tool description) that they MUST ask for user confirmation before executing a non-dry-run tab close, preventing overly-eager agents from randomly deleting your tabs.
- **`list_tabs` Presentation Rules**: Instructed LLMs to pass the tool's ASCII histogram through to the user unharmed instead of unhelpfully summarizing it into bullet points.
- **Extension Resilience**: Enhanced the `background.js` service worker with `chrome.alarms` to reliably wake up and maintain the WebSocket connection to the native host even when Chrome tries to suspend it.
