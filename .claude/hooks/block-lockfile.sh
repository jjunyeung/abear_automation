#!/usr/bin/env bash
# PreToolUse hook (Edit|Write|MultiEdit)
# Blocks any write/edit targeting `package-lock.json`.
# Lock files should only change via `npm install` / `npm uninstall`.
# Reads stdin JSON: { "tool_input": { "file_path": "..." }, ... }

input=$(cat)
path=$(echo "$input" | jq -r '.tool_input.file_path // ""')
base=$(basename "$path")

if [ "$base" = "package-lock.json" ]; then
  echo '{"decision":"block","reason":"lock 파일은 npm install/uninstall 결과만 허용. 직접 편집 금지"}'
  exit 2
fi

exit 0
