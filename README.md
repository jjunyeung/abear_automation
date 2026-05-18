# Windly ATC Framework

Playwright 기반 자동화 테스트 케이스(ATC) 실행 프레임워크. 자유양식 ATC를 작성하면 Claude가 Playwright 코드로 변환하고, 에러 발생 시 별도 복구 플로우로 분기 후 복귀해 단계별 결과를 기록합니다.

사용 방법은 두 가지:
- **CLI** — `npm run atc -- <path>` (1회성 실행, 빠른 디버깅)
- **GUI 러너** (`npm run gui`) — Electron 데스크톱 앱. 카탈로그 / 실시간 step 카드 / 리포트 / **launchd 스케줄러** / **Slack 알림** 통합

## 빠른 시작 — CLI

```bash
cp .env.example .env
# .env 편집 — WINDLY_EXTENSION_PATH, WINDLY_BASE_URL 등

npx playwright install chromium     # 최초 1회

npm run typecheck                    # 타입 검증
npm run atc -- atcs/collect/product-error-check.atc.yml \
  --url=https://item.taobao.com/...
```

## 빠른 시작 — GUI

```bash
npm run gui                    # dev 모드 (Vite HMR + Electron)
# 또는 패키징:
npm run package:gui            # .dmg + .zip → gui/dist/release/
```

GUI 안에서:
- **자동화** — 카탈로그에서 ATC 선택 → 입력값 채움 → Run, 또는 N개 체크 후 묶음 실행
- **스케줄** — "+ 새 스케줄" 로 단발/반복 (매일/매주/매월) + 다중 ATC 묶음. GUI 꺼져 있어도 macOS launchd 가 정해진 시각에 자동 실행. 카드에서 "리포트" 클릭으로 과거 발화 결과 보기, ✏️ 로 수정
- **설정** — Headless/Headed 토글, Slack 알림 안내

자세한 GUI 사용·아키텍처·트러블슈팅: [`gui/README.md`](gui/README.md)

## 디렉토리 구조

| 경로                              | 용도                                                       |
|-----------------------------------|------------------------------------------------------------|
| `atcs/<domain>/<name>.atc.yml`    | ATC 선언 (YAML, 자유양식 step)                             |
| `tests/<domain>/<name>.spec.ts`   | 대응 Playwright spec (StepHandlers 정의)                   |
| `recoveries/<id>.ts`              | 복구 플로우 (단일 함수 export)                             |
| `lib/`                            | 런타임 (loader, runner, recovery-registry, errors, schema) |
| `reporters/atc-reporter.ts`       | 단계별 `.md` + `.json` 리포터                              |
| `reports/runs/<runId>/`           | 개별 실행 결과 (`runId = result_YYYY-MM-DD_HH-MM-SS`)      |
| `reports/batches/<batchId>.md`    | 묶음 실행 통합 리포트 (GUI 묶음 / 스케줄 발화 시 자동 생성) |
| `reports/schedule-runs.json`      | 스케줄 발화 로그 (scheduleId → runIds 매핑, GUI 카드용)    |
| `scripts/atc.mjs`                 | 단일 ATC wrapper (CLI / GUI 직접 실행)                     |
| `scripts/atc-multi.mjs`           | 스케줄 발화 wrapper — 자식 N개 순차 실행 + Slack POST + 통합 md 작성 |
| `gui/`                            | Electron 데스크톱 러너 (main/preload/renderer/shared)      |
| `.claude/{rules,skills,hooks}`    | Claude Code 가드레일                                       |
| `CLAUDE.md`                       | Claude 를 위한 단일 진입점 (도메인·결정·절차)              |

## Playwright 프로젝트 (도메인별)

`windly-collect`, `windly-error-check`, `windly-fix`, `windly-upload`, `windly-e2e` —
`npx playwright test --project=<name>` 으로 선택 실행.

## 스케줄링 (GUI)

GUI 에서 만든 스케줄은 `~/Library/LaunchAgents/cc.windly.atc.<id>.plist` 에 macOS launchd plist 로 박힘. launchd 가 발화하면:

1. `/usr/bin/env node scripts/atc-multi.mjs --tasks=<base64-json> [--headless]`
2. atc-multi 가 N개 atc.mjs 자식을 순차 spawn (한 ATC fail 해도 나머지 계속)
3. 모든 자식 종료 후:
   - `reports/runs/<runId>/` 각 ATC 결과 (Playwright reporter 가 작성)
   - `reports/batches/batch-<firstRunId>.md` 통합 리포트
   - `reports/schedule-runs.json` 발화 로그 (GUI SchedulePanel 카드의 "최근 실행" 표시용)
   - `SLACK_WEBHOOK_URL` 채워져 있으면 Slack 알림 ("스케줄 작업 완료 (N/M 성공)" + 통합 md 본문 inline 첨부)

## 환경변수 (`.env`)

| 키                          | 용도                                                            |
|-----------------------------|-----------------------------------------------------------------|
| `WINDLY_BASE_URL`           | 윈들리 API 베이스 (기본 `https://app-api.windly.cc`)            |
| `WINDLY_EXTENSION_PATH`     | 윈들리 Chrome 확장 절대 경로 (UI ATC 필수, D7)                  |
| `WINDLY_LOGIN_EMAIL/PASSWORD` | `tests/auth.setup.ts` 로그인 자동화                           |
| `SLACK_WEBHOOK_URL`         | 스케줄 발화 결과 Slack 알림 (선택, 비우면 silent skip)          |

## 새 ATC / 복구 추가
- 새 ATC: `/atc-new` 또는 `CLAUDE.md` (d) 절차
- 새 복구: `/recovery-new <id>` 또는 `CLAUDE.md` (e) 절차

## 더 깊이
- GUI 사용·아키텍처·트러블슈팅: `gui/README.md`
- 결정·제약·요건 (프레임워크): `.hoyeon/specs/atc-framework/requirements.md`
- 결정·제약·요건 (GUI): `.hoyeon/specs/atc-gui-runner/requirements.md`
- 가드레일: `.claude/rules/`
- 도메인 스킬: `.claude/skills/`
