#!/usr/bin/env bash
set -euo pipefail

# DreamInsight helper to launch Codex CLI (or similar) with one command.
# Usage: npm run ai [-- any args...]

has() { command -v "$1" >/dev/null 2>&1; }

run() {
  echo "[ai] launching: $*" >&2
  exec "$@"
}

# Forward any extra args after --
ARGS=()
if [ "$#" -gt 0 ]; then
  ARGS=("$@")
fi

if has codex; then
  run codex "${ARGS[@]}"
elif has codex-cli; then
  run codex-cli "${ARGS[@]}"
elif has npx; then
  # Falls back to latest package via npx (may require network)
  run npx @openai/codex-cli@latest "${ARGS[@]}"
else
  cat >&2 <<'EOF'
[ai] Unable to find a Codex CLI binary.
    Tried: codex, codex-cli, npx @openai/codex-cli

Quick setup options:
  - Install globally:   npm i -g @openai/codex-cli
  - Or use npx each run: npx @openai/codex-cli@latest

Then re-run: npm run ai
EOF
  exit 127
fi

