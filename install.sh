#!/usr/bin/env bash
# 2ManyTabs MCP – Install Script
# Usage: bash install.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOST_DIR="$SCRIPT_DIR/native-host"

echo ""
echo "☄️  2ManyTabs MCP – Installer"
echo "=============================="

# ---------------------------------------------------------------------------
# 1. Check Node.js
# ---------------------------------------------------------------------------

if ! command -v node &>/dev/null; then
  echo "❌  Node.js not found. Install it from https://nodejs.org (v18+) and re-run."
  exit 1
fi

NODE_VER=$(node -e "process.stdout.write(process.versions.node)")
echo "✓  Node.js $NODE_VER found"

# ---------------------------------------------------------------------------
# 2. Install npm dependencies
# ---------------------------------------------------------------------------

echo ""
echo "→  Installing npm dependencies in native-host/ ..."
cd "$HOST_DIR"
npm install --silent
echo "✓  Dependencies installed"

# ---------------------------------------------------------------------------
# 3. Write the launcher wrapper (a plain shell script Claude Desktop will call)
# ---------------------------------------------------------------------------

WRAPPER="$HOST_DIR/host"

cat > "$WRAPPER" <<'EOF'
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$SCRIPT_DIR/host.js"
EOF

chmod +x "$WRAPPER"
echo "✓  Launcher written to: $WRAPPER"

# ---------------------------------------------------------------------------
# 4. Print Claude Desktop config
# ---------------------------------------------------------------------------

echo ""
echo "=============================="
echo "📋  EXAMPLE: Add this to your Claude Desktop config"
echo "    (usually ~/Library/Application Support/Claude/claude_desktop_config.json)"
echo ""
echo '    "mcpServers": {'
echo '      "2manytabs-mcp": {'
echo "        \"command\": \"$WRAPPER\""
echo '      }'
echo '    }'
echo ""
echo "=============================="
echo ""
echo "📦  Next steps:"
echo "    1. Add the config above to Claude Desktop and restart it."
echo "    2. Load the extension: chrome://extensions → Developer mode → Load unpacked → extension/"
echo "    3. The extension popup should show 'Connected' once host.js is running."
echo ""
echo "All Finished. (Restart MCP Clients)"
