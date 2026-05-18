#!/usr/bin/env bash
# validate.sh — /recovery-new 결과물 검증
# 사용법: scripts/validate.sh <recovery_id>
#   예:   scripts/validate.sh missing_image

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <recovery_id>" >&2
  exit 2
fi

RID="$1"
FILE="recoveries/${RID}.ts"

errors=0

if [ ! -f "$FILE" ]; then
  echo "FAIL: 복구 파일 누락 — $FILE" >&2
  errors=$((errors + 1))
else
  echo "OK: $FILE 존재"
fi

if [ -f "$FILE" ]; then
  if ! grep -qE "export[[:space:]]+async[[:space:]]+function[[:space:]]+recover[[:space:]]*\(" "$FILE"; then
    echo "FAIL: $FILE에 'export async function recover(' 시그니처 없음" >&2
    errors=$((errors + 1))
  else
    echo "OK: recover() 시그니처 확인"
  fi
fi

if command -v npx >/dev/null 2>&1; then
  if ! npx --no-install tsc --noEmit >/tmp/recovery-new-tsc.log 2>&1; then
    echo "FAIL: npx tsc --noEmit 실패" >&2
    cat /tmp/recovery-new-tsc.log >&2
    errors=$((errors + 1))
  else
    echo "OK: tsc --noEmit 통과"
  fi
else
  echo "WARN: npx 미발견 — tsc 체크 건너뜀" >&2
fi

if [ "$errors" -gt 0 ]; then
  echo "validate.sh: $errors 개 실패" >&2
  exit 1
fi

echo "validate.sh: 모두 통과"
exit 0
