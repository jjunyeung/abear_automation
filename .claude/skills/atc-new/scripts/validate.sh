#!/usr/bin/env bash
# validate.sh — /atc-new 스킬 결과물 검증
# 사용법: scripts/validate.sh <domain>/<name>
#   예:   scripts/validate.sh collect/taobao-product-error-check

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <domain>/<name>" >&2
  exit 2
fi

SLUG="$1"
ATC_PATH="atcs/${SLUG}.atc.yml"
SPEC_PATH="tests/${SLUG}.spec.ts"

errors=0

if [ ! -f "$ATC_PATH" ]; then
  echo "FAIL: ATC YAML 누락 — $ATC_PATH" >&2
  errors=$((errors + 1))
else
  echo "OK: $ATC_PATH 존재"
fi

if [ ! -f "$SPEC_PATH" ]; then
  echo "FAIL: spec 누락 — $SPEC_PATH" >&2
  errors=$((errors + 1))
else
  echo "OK: $SPEC_PATH 존재"
fi

# spec에서 loader/runner 호출 패턴 검사
if [ -f "$SPEC_PATH" ]; then
  if ! grep -q "loadATC" "$SPEC_PATH"; then
    echo "FAIL: $SPEC_PATH에 loadATC 호출 없음" >&2
    errors=$((errors + 1))
  fi
  if ! grep -q "runner.run" "$SPEC_PATH"; then
    echo "FAIL: $SPEC_PATH에 runner.run 호출 없음" >&2
    errors=$((errors + 1))
  fi
fi

# tsc 체크
if command -v npx >/dev/null 2>&1; then
  if ! npx --no-install tsc --noEmit >/tmp/atc-new-tsc.log 2>&1; then
    echo "FAIL: npx tsc --noEmit 실패" >&2
    cat /tmp/atc-new-tsc.log >&2
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
