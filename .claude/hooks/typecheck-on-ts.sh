#!/usr/bin/env bash
# PostToolUse hook (Edit|Write|MultiEdit)
# Runs `npx tsc --noEmit` on the project when a *.ts file is edited.
# Non-blocking: always exits 0 even on TypeScript errors.
# Reads stdin JSON: { "tool_input": { "file_path": "..." }, ... }

input=$(cat)
path=$(echo "$input" | jq -r '.tool_input.file_path // ""')

case "$path" in
  *.ts)
    cd "/Users/a1/windly 자동화" && npx tsc --noEmit 2>&1 || echo "[tsc] non-blocking failure"
    ;;
esac

exit 0
