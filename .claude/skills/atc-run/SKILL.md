---
name: atc-run
description: 기존 ATC 파일을 실행한다. inputs schema 기준 인자 확인, 환경변수 점검, npm run atc 실행, 결과 디렉토리 경로 안내까지 한 번에 처리한다. 사용자가 "ATC 실행해줘", "atcs/collect/foo 돌려" 류로 요청할 때 트리거한다.
disable-model-invocation: true
---

# /atc-run

특정 ATC 파일을 표준 절차로 실행하기 위한 스킬이다. 입력값 누락·환경변수 미설정으로 인한 실패를 사전에 막고, 실행 종료 후 결과 디렉토리 경로를 명확히 알려준다.

## 트리거

- "ATC 실행해줘"
- "atcs/collect/foo 돌려"
- "이 ATC 한 번 돌려봐"
- "/atc-run atcs/collect/foo.atc.yml --url=https://item.taobao.com/..."

## 무엇을 하는가

ATC 경로를 받아 inputs schema를 읽고, 누락된 입력은 사용자에게 prompt로 채운 뒤 `npm run atc -- <path> [args]`를 실행한다. 실행 후 `reports/runs/<runId>/` 경로를 stdout으로 남긴다.

## 절차

1. **ATC 경로 확인** — 인자가 없으면 `atcs/`를 보여주고 사용자에게 선택을 요청한다. 인자가 있으면 그 파일이 존재하는지 검사한다.
2. **inputs schema 파악** — YAML의 `inputs:` 블록을 읽어 필수 키 목록을 만든다.
3. **CLI 인자 검사** — 사용자가 `--url=...` 또는 `--fixture=<name>`을 전달했는지 확인한다.
4. **누락된 입력은 prompt** — 둘 다 없으면 ATC inputs schema 항목 하나하나에 대해 `AskUserQuestion`으로 값을 물어본다. fixture 사용 시 `fixtures/<name>.json` 존재 여부를 검증한다.
5. **환경변수 사전 체크** — `WINDLY_EXTENSION_PATH` (UI ATC 필수), `WINDLY_BASE_URL`, 기타 ATC가 명시적으로 의존하는 env. 누락 시 사용자에게 `.env` 설정 안내 후 중단 (자동으로 `.env`를 수정하지 않는다).
6. **실행** — `npm run atc -- atcs/<domain>/<name>.atc.yml [--url=... | --fixture=...]`. 종료 코드를 보존한다.
7. **결과 안내** — `reports/runs/`에서 가장 최근 디렉토리(mtime 기준)를 찾아 절대 경로를 출력한다. 단계별 status(✅/⚠️/❌) 한 줄 요약도 같이 보여준다.

## 출력

- 실행한 ATC 경로
- 사용된 입력값 (url 또는 fixture 이름)
- `reports/runs/<runId>/` 절대 경로
- 단계별 결과 한 줄 요약 (예: `step1 ✅ / step2 ✅ / step3 ⚠️→복구 missing_image / step4 ✅`)

## 검증

- `npm run atc -- ...` 종료 코드를 보존해서 실패 시 사용자에게 그대로 노출
- 실행 직후 `reports/runs/`에 새 디렉토리가 생겼는지 확인 (mtime 비교)
- 동봉된 `scripts/validate.sh <runId>` 실행 — `<runId>.md` 존재 검증
