#!/bin/bash
# Reply eval: run one headless Claude Code turn (or two) against this checkout's host and a
# stand-in browser, then print the numbers that matter to a tired reader. Never touches a real
# browser. Needs the `claude` CLI and python3.
#
#   test/reply-eval/run.sh RECORD.json OUT_DIR LABEL PORT "first message" ["second message"]
#
# RECORD.json is any record written by snapshot_tabs. Run each case several times: replies vary
# from run to run, so one run proves little.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOST="$(cd "$HERE/../.." && pwd)/host.js"
RECORD=$1; OUT=$2; L=$3; P=$4
mkdir -p "$OUT/snaps-$L"
cat > "$OUT/cfg-$L.json" <<J
{"mcpServers":{"2manytabs-mcp":{"type":"stdio","command":"node","args":["$HOST"],"env":{"MANYTABS_BRIDGE_PORT":"$P","MANYTABS_SNAPSHOT_DIR":"$OUT/snaps-$L"}}}}
J
node "$HERE/fake-browser.mjs" "$P" "$RECORD" "$OUT/log-$L.jsonl" & FPID=$!
trap 'kill $FPID 2>/dev/null' EXIT
# --disable-slash-commands keeps the user's own skills out, so the result reflects this server.
COMMON=(--mcp-config "$OUT/cfg-$L.json" --strict-mcp-config --disable-slash-commands
        --allowedTools "mcp__2manytabs-mcp__*" --output-format stream-json --verbose)
claude -p "$5" "${COMMON[@]}" > "$OUT/$L-a.jsonl" 2>/dev/null
if [ -n "${6:-}" ]; then
  SID=$(python3 -I -c "import json,sys;print([json.loads(l) for l in open(sys.argv[1])][-1]['session_id'])" "$OUT/$L-a.jsonl")
  claude -p "$6" --resume "$SID" "${COMMON[@]}" > "$OUT/$L-b.jsonl" 2>/dev/null
fi
for f in "$OUT/$L-a.jsonl" "$OUT/$L-b.jsonl"; do
  [ -f "$f" ] && echo "$L $(basename "$f" .jsonl | sed 's/.*-//') $(python3 -I "$HERE/metrics.py" "$f" show)"
done
