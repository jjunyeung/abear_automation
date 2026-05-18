#!/usr/bin/env bash
# PreToolUse hook (Edit|Write|MultiEdit)
# Blocks any write/edit targeting `.env`, `.env.local`, `.env.production`, etc.
# Allows `.env.example` (it's a committed template).
# Reads stdin JSON: { "tool_input": { "file_path": "..." }, ... }

input=$(cat)
path=$(echo "$input" | jq -r '.tool_input.file_path // ""')
base=$(basename "$path")

# Allow .env.example explicitly
if [ "$base" = ".env.example" ]; then
  exit 0
fi

case "$base" in
  .env|.env.*)
    echo '{"decision":"block","reason":"환경변수 파일은 사용자 수동 편집만. 변경이 필요하면 사용자에게 안내 (.env.example만 Claude 편집 허용)"}'
    exit 2
    ;;
esac

exit 0
