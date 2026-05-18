#!/usr/bin/env bash
# validate.sh — /atc-run 결과물 검증
# 사용법: scripts/validate.sh <runId>
#   예:   scripts/validate.sh result_2026-04-28_15-12-30

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <runId>" >&2
  exit 2
fi

RUN_ID="$1"
RUN_DIR="reports/runs/${RUN_ID}"
MD_PATH="${RUN_DIR}/${RUN_ID}.md"

errors=0

if [ ! -d "$RUN_DIR" ]; then
  echo "FAIL: run 디렉토리 누락 — $RUN_DIR" >&2
  errors=$((errors + 1))
fi

if [ ! -f "$MD_PATH" ]; then
  echo "FAIL: 리포트 .md 누락 — $MD_PATH" >&2
  errors=$((errors + 1))
else
  echo "OK: $MD_PATH 존재"
fi

if [ "$errors" -gt 0 ]; then
  echo "validate.sh: $errors 개 실패" >&2
  exit 1
fi

echo "validate.sh: 모두 통과"
exit 0
