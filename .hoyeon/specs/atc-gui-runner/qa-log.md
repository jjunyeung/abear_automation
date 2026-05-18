---
spec: "atc-gui-runner"
phase: interview
status: complete
where:
  goal: "윈들리 ATC 프레임워크용 로컬 GUI 러너 — 카탈로그/다중선택/동적폼/실시간 관전/리포트 인라인 표시"
  non_goals:
    - "ATC YAML 작성/편집 (CLI/Claude 유지)"
    - "spec.ts (Playwright 핸들러) 생성 (CLI/Claude 유지)"
    - "복구(recoveries/) 작성/관리 UI"
    - "기존 Playwright/ATC 프레임워크 자체 변경"
    - "CI/CD 통합 (D10 = 로컬 전용)"
    - "멀티유저/호스팅 배포"
  project_type: "user-facing"
  situation: "hybrid"
  ambition: "product"
  risk_modifiers: []
  research_done: true
depth_calibration:
  business:
    WHO: "light"
    WHY: "standard"
    WHAT: "standard"
    SUCCESS: "standard"
    SCOPE: "standard"
    RISK: "deep"
  interaction:
    JOURNEY: "standard"
    HAPPY: "standard"
    EDGE: "standard"
    STATE: "standard"
    FEEDBACK: "standard"
    ACCESS: "deep"
  tech:
    ARCH: "deep"
    DATA: "standard"
    INFRA: "standard"
    DEPEND: "standard"
    COMPAT: "deep"
    SECURITY: "deep"
coverage:
  business: 1.0
  interaction: 1.0
  tech: 1.0
---

# Q&A Log

## Research

### 기존 ATC 프레임워크 — 통합 surface

1. **ATC 카탈로그**: `atcs/<domain>/<name>.atc.yml` glob (52개 존재, 4 도메인). 도메인 = collect, error-check, fix, upload, e2e. `_<name>.atc.yml` 조각도 같이 발견됨.
2. **스키마**: `lib/atc-schema.ts:55-70` 의 zod 스키마 — title/inputs/steps/composes/expected. inputs 메타 (type, description, example) 는 폼 렌더링에 그대로 사용 가능.
3. **로더**: `lib/atc-loader.ts:38-76` — `composes` 재귀 펼침 + 순환 참조 감지. GUI 는 이걸 그대로 호출하면 카탈로그/폼 생성 가능.
4. **실행 진입점**: `npm run atc` = `playwright test --project=windly-collect` (package.json:6). 단일 ATC 실행은 `npm run atc -- atcs/<domain>/<name>.atc.yml --<input>=<value>` 또는 `npx playwright test --project=windly-<domain> tests/<domain>/<name>.spec.ts`.
5. **환경변수**: `lib/config.ts:21-26` `loadEnv()` — `WINDLY_BASE_URL`, `WINDLY_EXTENSION_PATH`, `WINDLY_LOGIN_EMAIL`, `WINDLY_LOGIN_PASSWORD`. 일부 ATC 는 EXTENSION 없으면 fail.
6. **runId**: `lib/config.ts:50-59` `buildRunId()` = `result_YYYY-MM-DD_HH-MM-SS`. **GUI 가 자체 ID 만들면 안 됨** — Playwright config 가 동일 호출을 통해 출력 경로 정함.
7. **리포트**: `reports/runs/{runId}/{runId}.md` + `.json` + `html/`. `.json` 구조 = `{ atc_title, steps[{step_id,status,duration_ms,error_key,recovery_id,message}], overall, inputs_used }`. status = success/failed/recovered/unhandled/skipped.
8. **리포터 attach 계약**: spec 의 `test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' })` 호출이 필수. `reporters/atc-reporter.ts:14-31` 가 이걸 수집해 `.md`/`.json` 출력.
9. **StepHandlers**: `tests/<domain>/<name>.spec.ts` 가 step.id ↔ Playwright 액션 매핑. handler 가 누락된 step.id 가 ATC 에 있으면 runner 가 즉시 FAIL — GUI 는 이 점을 사전 검증할 수 있음.

### Toolchain baseline

- TypeScript strict + CommonJS, target ES2022 (tsconfig.json:6-7)
- Playwright 1.59.1, zod 4.3.6, yaml 2.8.3, dotenv 17.4.2 — **GUI 추가 시 React/Vite/Express 등은 새 의존성**
- Playwright projects: `setup` + `windly-{collect,error-check,fix,upload,e2e,e2e-fresh}` (playwright.config.ts:74-130). 모든 도메인 프로젝트는 `dependencies: ['setup']` 으로 묶여 auth.setup.ts 가 먼저 1회 실행.
- Reporter = list + html + custom atc-reporter (playwright.config.ts:56-66)
- Hooks: PreToolUse(.env/lockfile = block), PostToolUse(*.ts = tsc --noEmit)
- userDataDir = `.playwright-userdata/` (persistent, gitignored)

### GUI 에 영향 가는 강한 제약

| 제약 | 출처 | GUI 의미 |
|---|---|---|
| **workers=1, fullyParallel=false** | playwright.config.ts:51-52, lib/test-fixture.ts:123-159 | persistent userDataDir SingletonLock 때문. **다중 선택 → 순차 실행만 가능**. 진짜 병렬 시도하면 lock 충돌 hang |
| **headed: false 불가** | lib/test-fixture.ts:199, D7 | MV3 service worker 등록 요건. GUI 가 ATC 돌리면 **Chromium 창이 실제로 뜸** — "관전" 의도에 부합하지만 명시 확인 필요 |
| **runId 단일 생성** | lib/config.ts:50-59, C5 | GUI 가 자체 ID 만들면 reporter 경로 어긋남. spawn 후 stdout 파싱 or `reports/runs/` polling 으로 새 runId 발견해야 |
| **로컬 전용** | D10, requirements.md | GUI 서버는 localhost 전용. 외부 노출 X |
| **단방향 의존** | CLAUDE.md §h | GUI 는 `lib/*` import OK. `tests/`/`recoveries/` 직접 import X. `lib/` 는 GUI 모듈 모름 |
| **npm 단독** | C2, D2, `.claude/rules/npm-only.md` | yarn/pnpm/bun lockfile 생성 금지 |
| **TS strict, any 금지** | C1, `.claude/rules/typescript-strict.md` | GUI 코드도 strict + no-any |
| **브라우저 자동화 = ATC 전용** | `.claude/rules/playwright-only-browser.md` | GUI 가 chromux/Puppeteer 등 별도 brower lib 추가 X. 브라우저 조작은 무조건 `npm run atc` 경로 |
| **headed 창 = 사용자 화면 점유** | 위 + 솔로 프로젝트 | "관전" 의도 = Chromium 창과 GUI 창이 동시에 떠 있을 가능성. 멀티모니터/창 배치 고려 |
| **`composes` 펼침** | lib/atc-loader.ts, CLAUDE.md §l | 조각 ATC (`_<name>.atc.yml`) 가 카탈로그에 보일지 숨길지 정책 결정 필요 |
| **재시도 정책** | D12, C7, C8 | GUI 의 "재실행" 버튼은 ATC 전체 재시작이지 복구 재진입 X. unhandled 에 자동 재시도 노출 금지 |
| **레거시 login step** | REFACTOR-PLAN.md, CLAUDE.md §j | 일부 옛 ATC 에 login step 남아있을 수 있음. GUI 카탈로그가 그런 ATC 를 실행하면 FAIL — 사전 stale 감지 필요 |

## Axis: Business

### WHO

#### Q: GUI 의 주 사용자는 누구야?
> 일단 나 (솔로), 나중에 팀원/QA 가능성 — 이해하기 쉬운 UI 구조는 유지
> status: resolved

### WHY

#### Q: 지금 npm run atc 만 쓰고 있을 때 가장 큰 페인은 뭐야?
> 어떤 ATC 가 있는지 / 입력이 뭐가 필요한지 기억해서 명령어 치기 — 카탈로그/입력 메모리 부담이 1순위
> status: resolved

### WHAT

#### Q: GUI 의 most-wanted 핵심 가치 1순위는?
> 3개 다 동등하게 중요 — (1) 카탈로그+동적 폼, (2) 실시간 런 관전(로그/스크린샷/step), (3) 리포트 인라인+히스토리 대시보드. 하나 추릴 수 없음.
> status: resolved

##### Drill: MVP 컷 순서 (일정 압박 시 어디 자르나)?
> "딱히 일정 있진 않아" — 컷 결정 deferred. 일정 압박 없으니 셋 다 v1 으로 진행. 만약 나중에 일정이 생기면 카탈로그+폼 = 선행 필수 / 실시간 관전 vs 히스토리는 둘 중 하나를 v2 로 미루는 게 가능.
> status: assumption (셋 다 v1, 컷 순서 미정)
> → Open Decision OD-1

### SUCCESS

#### Q: GUI 가 올해 어떻게 되면 '성공'이야?
> 위 세 가지(실행 횟수 ↑, 명령어 치는 시간/실수 ↓, 다른 사람도 시키면 돌릴 수 있음)가 결국 한 덩어리. 따로 세분화 안 함.
> status: resolved

##### Drill: 측정 가능한 시그널 하나?
> "스케줄링도 넣을 거라 잔버그만 없으면 OK" — 정량 메트릭 대신 안정성/QoL 이 메트릭. 평소 사용 중 버그/이상 종료가 거의 없으면 성공.
> 또한 **스케줄링 기능이 새 scope 로 추가됨** (이전 답변에서 미언급, 여기서 등장).
> status: resolved

### SCOPE

#### Q: MVP 경계선 — 어디까지 포함?
> 카탈로그 + 폼 + 런너 + 실시간 로그 + 히스토리/대시보드 + **스케줄링** 까지 다 포함 = "풀스택 MVP"
> status: resolved

##### Drill: 스케줄링 형태?
> 주기적 (cron-like, 매일/매시간 등) **+** 단발 예약 (X시간 후, 오늘 22:00) 둘 다. → 함의: GUI 가 항상 켜져 있어야 하거나, 별도 background 데몬/타이머 필요. 구현 복잡도 ↑.
> status: resolved

> Non-goals (Mirror 에서 명시): ATC YAML 작성/편집, spec.ts 생성, 복구 작성, 기존 프레임워크 변경, CI/CD, 멀티유저/호스팅

### RISK

#### Q: 동시 Run 처리?
> 큐에 넣고 순차 실행 (Playwright workers=1 / userDataDir SingletonLock 제약과 일관)
> status: resolved

#### Q: prod 데이터 변경 안전장치?
> Confirm 불필요. ATC 돌릴 의도적이니까 Run = 즉시 실행
> status: resolved

#### Q: GUI 닫기 시 진행 중 ATC?
> Confirm 모달로 물어보고 사용자 선택 (kill vs detach)
> status: resolved

##### Drill: detach 선택 시 완료 시그널 받는 방식?
> macOS OS 네이티브 알림 + 이후 GUI 다시 열었을 때 runs 목록에 결과 표시. tray/menubar 영구 daemon 은 안 함.
> status: resolved

#### Q: 폼 입력값 영속화?
> 기억 안 함, 매번 새로 입력 (stale 입력 실수 방지 우선)
> status: resolved

#### Q: Chromium/Playwright 비정상 종료 감지?
> spawn process exit code + stdout 마지막 line 파싱 (Playwright 가 'X failed' 같은 메시지 발타) 조합. watchdog timeout 은 미정.
> status: resolved

#### Q: stale ATC (login step 남아있는 구 파일 등) 처리?
> 자동 감지 후 카탈로그에 'stale' 배지 + 실행 허용 (사용자가 알고서 실행). 차단은 안 함.
> status: resolved

## Axis: Interaction

### JOURNEY

#### Q: 진입 화면?
> ATC 카탈로그 (도메인 섹션별 좌측 패널 + 우측 폼/로그 패널). VSCode/Postman 스타일.
> status: resolved

### HAPPY

#### Q: Happy path 클릭 수?
> ≤3 클릭 (카탈로그 클릭 → 입력 타이핑 → Run)
> status: resolved

### EDGE

#### Q: ATC 실행 주요 실패 시나리오 — GUI 특별 처리?
> (1) WINDLY_EXTENSION_PATH 누락/.env 부재 → Run 전 사전 검증 + 명확 메시지. (2) ATC step.id ↔ spec.ts handler 매칭 누락 → 카탈로그 로드 시 사전 감지 + 경고.
> status: resolved
> Not selected: unhandled 에러 UI 결각화 (리포트 .md 로 충분), watchdog hang kill (구현 안 함)

### STATE

#### Q: 카탈로그 ATC 항목의 주요 상태?
> Normal / Stale(경고 배지) / Running(스피너) / Queued(대기 번호) + Failed-recent(빨간 도트) / Passed-recent(초록 도트)
> status: resolved
> Composes 조각 ATC (`_<name>.atc.yml`) 구분/숨김은 미언급 — assumption: 카탈로그에 같이 노출 (별도 그룹/들여쓰기 정도). Open Decision 으로 처리 가능.

### FEEDBACK

#### Q: 실시간 런 중 진행 상황 표시 형태?
> Step 각각이 expand/collapse 카드 (열면 로그/스크린샷). GitHub Actions 스타일.
> status: resolved

#### Q: 스크린샷 + 최종 리포트 표시?
> 스크린샷 = step 안에 축소 그림 + 클릭 시 lightbox. 리포트 = `.md` 별도 탭으로 GUI 안에서 렌더.
> status: resolved

### ACCESS

#### Q: 키보드 단축키 / 파워 유저 기능?
> 기본 단축키 (Cmd+Enter=Run, Cmd+/=검색, Esc=패널 닫기) + **Cmd+K 명령 팔레트** (ATC 검색 + 바로 실행). VSCode/Linear 스타일.
> status: resolved

#### Q: 멀티 인스턴스 (여러 창/탭) 허용?
> 1개만 허용. 2번째 실행·접근 시 '이미 열려 있음' 메시지 + 기존 창 포커스. (userDataDir SingletonLock 의 GUI 레벨 대응)
> status: resolved

## Axis: Tech

### ARCH

#### Q: GUI 스택?
> Electron + React/TS — 데스크탑 앱. single-instance lock / OS notif / system tray 다 Electron API. 무겁(200MB+)지만 노드 단일 스택 유지.
> status: resolved

#### Q: ATC 실행 호출 방식?
> `child_process.spawn('npx', ['playwright', 'test', '--project=...'])` — Playwright 직접 호출. npm scripts 의존 X. 결과는 npm run atc 와 동일.
> status: resolved

#### Q: 실시간 로그/진행상황 스트림 방식?
> 초안: WebSocket. **최종: Electron IPC (contextBridge + ipcMain/ipcRenderer)** — SECURITY 라운드에서 보안/단순성 이유로 진화. 네트워크 포트 0개. main process 가 child_process.spawn 결과를 IPC channel 로 renderer 에 전달.
> status: resolved

#### Q: 스케줄링 구현?
> OS launchd 등록 — GUI 꺼져도 실행. plist 동적 생성/관리. cron-like 반복 + 단발 예약 모두 launchd 로 통합.
> status: resolved

##### Drill: launchd 가 GUI 꺼진 동안 돌린 run 의 결과 GUI 가 어떻게 발견?
> 의도: GUI 가 `reports/runs/` 를 single source of truth 로 보고 비동기 watch — 시작 시 디렉토리 재스캔, 활성 중에는 fs.watch (chokidar 등) 로 새 runId 등장/완료 감지. "현재 돌고 있는 작업 모음" 패널에 실시간 반영. launchd job 에 post-hook 안 박음 (단순화).
> status: resolved (assumption: GUI 인덱스 = 파일시스템 미러)

##### Drill: launchd 예약 run vs GUI 진행 중 run 의 SingletonLock 충돌?
> GUI 가 스케줄 시작 전 파일 기반 lock 상태 체크 (예: `.gui-run.lock` 또는 userData 안 PID 파일) → 진행 중이면 그 스케줄 스킵 + 리포트에 "skipped(lock)" 마킹. 재시도 X. 다음 launchd 발화에서 정상 시도.
> status: resolved

### DATA

#### Q: 스케줄/런 메타/카탈로그 캐시 저장 위치?
> Electron 의 OS 표준 userData 폴더 (`~/Library/Application Support/<app-name>/`). 프로젝트 바깥. 레포 클론해도 GUI 설정 유지.
> status: resolved

> Note: runs 결과 자체는 기존 `reports/runs/<runId>/` 그대로 유지 (D6). GUI 가 추가로 인덱스/메타만 userData 에 캐시.

### INFRA

#### Q: 지원 플랫폼?
> macOS 전용. launchd 활용. Windows/Linux 아예 미지원. 패키징/배포 간단 (.app 만).
> status: resolved

### DEPEND

#### Q: 새 의존성 (자동 도출)?
> Stack 선택에서 도출: electron, react, react-dom, ws (WebSocket), node 빌트인(child_process, fs, path). 빌드툴: vite + @vitejs/plugin-react + electron-builder/electron-forge. 모두 npm 으로 설치.
> status: resolved

### COMPAT

#### Q: GUI 코드 위치 — 기존 프레임워크와 어떻게 평행?
> 단일 레포 안 `gui/` 디렉토리. 기존 구조 (atcs/lib/tests/recoveries/reporters)와 평행. package.json 공유. tsconfig `include` 에 `gui/**` 추가. `npm run gui` script 추가.
> status: resolved

#### Q: 기존 ATC 프레임워크 동작 변경?
> 없음 — GUI 는 `lib/*` 를 import (단방향, CLAUDE.md §h 허용 범위) 하지만 lib/ 는 GUI 모름. spec.ts / runner / reporter / config 모두 그대로. GUI 는 `reports/runs/<runId>/<runId>.{md,json}` 을 데이터로만 소비.
> status: resolved

### SECURITY

#### Q: 인증/secret 처리?
> GUI 는 `.env` 를 읽지도 쓰지도 않음. spawn 시 부모 환경 그대로 상속 (자식 ATC 가 lib/config.ts 로 .env 로딩). GUI 는 credential 비노출 → PreToolUse 훅(.env 차단)과도 무충돌.
> status: resolved

#### Q: localhost 외부 노출?
> 네트워크 포트 자체 안 엶. Electron 내부 IPC 만 사용 → 외부 노출 0. 다른 도구/원격 클라이언트와의 통신 의도 없음 (D10 로컬 전용에 부합).
> status: resolved

#### Q: Electron renderer 보안 기본값?
> 엄격 디폴트 — `contextIsolation: true`, `nodeIntegration: false`, preload script 로 노출 API 제한. main↔renderer 통신은 contextBridge 통해 화이트리스트된 채널만.
> status: resolved

#### Q: 새 의존성 자동 도출 갱신?
> WebSocket(ws) 제거 — IPC 만 쓰니까. 최종: electron, react, react-dom, vite, @vitejs/plugin-react, **electron-builder** (성숙, .dmg/.app/.zip 지원). markdown 렌더용 react-markdown 또는 marked. 파일 watcher 용 chokidar. 모두 npm.
> status: resolved

## Open Items

### OD-1: MVP cut priority (일정 압박 시)
- context: "3 기능(카탈로그+폼 / 실시간 관전 / 히스토리 대시보드) 다 동등하게 중요" + "일정 없음" 으로 컷 결정 deferred
- options: [실시간 관전 우선 / 히스토리 우선 / 둘 다 v1 (현재 가정)]
- impact: 향후 일정 생기면 v2 미루기 결정 필요
