---
spec: "atc-gui-runner"
phase: extract
axis: tech
count: 18
---

# Tech Requirements

## R-T1: Electron + React/TypeScript 데스크탑 스택
- **type**: constraint
- **behavior**: GUI는 Electron 메인 프로세스 + React/TypeScript 렌더러로 구성된 단일 데스크탑 앱으로 구현되어야 한다.
- **source**: [Tech.ARCH.Q: GUI 스택 → "Electron + React/TS"]
- **confidence**: high
- **open_questions**: Electron major 버전 고정 여부 미결 (electron-builder가 권장하는 최신 stable 기준으로 결정)

### Sub-requirements

#### R-T1.1: Electron 단일 인스턴스 보장
- **given**: GUI 앱이 이미 실행 중인 상태
- **when**: 사용자가 동일한 .app을 다시 실행하거나 OS에서 두 번째 인스턴스가 기동되면
- **then**: 두 번째 인스턴스는 즉시 종료되고 기존 창이 포커스를 얻어야 한다 (Electron `app.requestSingleInstanceLock()` 활용)

#### R-T1.2: 빌드 도구 — Vite + electron-builder
- **given**: 개발 빌드 또는 프로덕션 패키징
- **when**: `npm run gui` 또는 패키징 커맨드가 실행되면
- **then**: Vite + @vitejs/plugin-react가 렌더러 번들을 빌드하고, electron-builder가 macOS .app/.dmg/.zip을 생성해야 한다

#### R-T1.3: TypeScript strict — GUI 코드도 예외 없음
- **given**: `gui/` 하위의 모든 .ts/.tsx 파일
- **when**: PostToolUse 훅이 `npx tsc --noEmit`을 실행하면
- **then**: `strict: true` + `noImplicitAny` 위반이 0건이어야 한다 (C1, `.claude/rules/typescript-strict.md`)

---

## R-T2: ATC 실행 — child_process.spawn 직접 호출
- **type**: functional
- **behavior**: GUI가 ATC를 실행할 때 Electron 메인 프로세스에서 `child_process.spawn('npx', ['playwright', 'test', '--project=<domain>', ...])` 를 직접 호출해야 하며, `npm run atc` 스크립트에 의존하지 않는다.
- **source**: [Tech.ARCH.Q: ATC 실행 호출 방식 → "child_process.spawn('npx', ['playwright', 'test', '--project=...'])"]
- **confidence**: high
- **open_questions**: spawn 시 cwd를 프로젝트 루트로 명시 고정해야 함 — Electron 앱 번들 경로와 레포 루트가 다를 수 있음

### Sub-requirements

#### R-T2.1: 도메인 프로젝트 인자 자동 결정
- **given**: 사용자가 카탈로그에서 `atcs/<domain>/<name>.atc.yml` 을 선택하고 Run을 누른 상태
- **when**: spawn 인자가 구성되면
- **then**: `--project=windly-<domain>` 과 ATC YAML 경로를 포함한 인자 배열이 조립되어야 한다 [Research#4 package.json:6]

#### R-T2.2: 환경변수 상속 — GUI는 .env 미개입
- **given**: 메인 프로세스가 spawn을 호출
- **when**: child_process 옵션이 설정되면
- **then**: `env` 옵션을 따로 지정하지 않아 부모 프로세스 환경(`.env`를 dotenv로 이미 로드한 상태)을 그대로 자식 프로세스가 상속해야 한다 [Research#5 lib/config.ts:21-26]

#### R-T2.3: runId는 GUI가 생성하지 않음
- **given**: spawn 실행 직후
- **when**: GUI가 실행 결과 디렉토리를 식별해야 할 때
- **then**: `reports/runs/` 디렉토리를 재스캔하거나 stdout을 파싱하여 Playwright가 생성한 runId를 사후 발견해야 하며, GUI 자체가 `buildRunId()`를 호출해 ID를 미리 생성하면 안 된다 [Research#6 lib/config.ts:50-59]

---

## R-T3: 실시간 스트리밍 — Electron IPC (네트워크 포트 없음)
- **type**: constraint
- **behavior**: spawn 자식 프로세스의 stdout/stderr 스트림은 Electron IPC (ipcMain → contextBridge → ipcRenderer) 를 통해 렌더러로 전달되어야 하며, WebSocket 또는 별도 네트워크 포트를 열지 않는다.
- **source**: [Tech.ARCH.Q: 실시간 로그/진행상황 스트림 방식 → "최종: Electron IPC"]
- **confidence**: high
- **open_questions**: none

### Sub-requirements

#### R-T3.1: stdout 라인 단위 IPC 전송
- **given**: child_process가 실행 중이고 stdout에 데이터가 출력되는 상태
- **when**: `data` 이벤트가 메인 프로세스에서 수신되면
- **then**: ipcMain이 해당 데이터를 `atc:log` 채널로 렌더러에 즉시 전달해야 한다

#### R-T3.2: 프로세스 종료 신호 IPC 전달
- **given**: spawn된 Playwright 프로세스
- **when**: `exit` 또는 `close` 이벤트가 발생하면
- **then**: exit code와 함께 `atc:done` 채널로 렌더러에 알림이 전달되어야 한다

#### R-T3.3: preload 화이트리스트 채널 제한
- **given**: preload 스크립트가 contextBridge를 통해 IPC API를 렌더러에 노출
- **when**: 렌더러가 ipcRenderer.on을 등록하거나 ipcRenderer.send를 호출하면
- **then**: preload가 명시적으로 허용한 채널 목록(예: `atc:log`, `atc:done`, `atc:run`, `atc:kill`)에 한해서만 통신이 허용되어야 한다

---

## R-T4: 스케줄링 — macOS launchd plist 동적 생성/관리
- **type**: functional
- **behavior**: cron-like 반복 예약과 단발성 예약 모두 launchd plist를 동적으로 생성·등록·삭제하여 구현해야 하며, GUI 프로세스가 종료된 상태에서도 스케줄이 발화되어야 한다.
- **source**: [Tech.ARCH.Q: 스케줄링 구현 → "OS launchd 등록 — plist 동적 생성/관리"]
- **confidence**: high
- **open_questions**: plist 파일 네이밍 컨벤션 (예: `cc.windly.atc.<schedule-id>.plist`) 및 LaunchAgents vs LaunchDaemons 선택 미결

### Sub-requirements

#### R-T4.1: 반복 스케줄 — launchd StartCalendarInterval
- **given**: 사용자가 "매일 09:00" 같은 cron-like 반복 스케줄을 생성하면
- **when**: GUI가 launchd에 등록할 때
- **then**: `StartCalendarInterval` 키를 사용한 plist 파일이 `~/Library/LaunchAgents/` 에 생성되고 `launchctl load` 가 실행되어야 한다

#### R-T4.2: 단발 예약 — launchd StartCalendarInterval (일회성)
- **given**: 사용자가 "오늘 22:00 한 번" 같은 단발 예약을 생성하면
- **when**: 해당 plist에서 발화가 1회 완료되면
- **then**: GUI 또는 launchd 래퍼 스크립트가 해당 plist를 자동으로 unload + 삭제하여 재발화를 방지해야 한다

#### R-T4.3: 스케줄 삭제 시 plist 정리
- **given**: 사용자가 GUI에서 스케줄을 삭제하면
- **when**: 삭제 액션이 처리되면
- **then**: `launchctl unload` 후 해당 plist 파일이 삭제되어야 하고, `schedules.json` 에서도 항목이 제거되어야 한다

---

## R-T5: launchd 발화 시 SingletonLock 충돌 방지 — 파일 기반 lock
- **type**: functional
- **behavior**: launchd가 예약된 ATC를 기동하려 할 때 GUI가 이미 실행 중인 run이 있으면, 파일 기반 lock(예: `.gui-run.lock` in userData)을 확인하여 스킵하고 "skipped(lock)" 을 리포트에 기록해야 한다.
- **source**: [Tech.ARCH.Drill: launchd 예약 run vs GUI 진행 중 run의 SingletonLock 충돌]
- **confidence**: high
- **open_questions**: launchd 래퍼 스크립트가 lock 파일을 직접 읽는지, 별도 IPC로 GUI 메인 프로세스에 위임하는지 구현 선택 필요

### Sub-requirements

#### R-T5.1: Run 시작 시 lock 파일 생성
- **given**: GUI 메인 프로세스 또는 launchd 래퍼가 spawn을 시작하기 직전
- **when**: 실행 직전 lock 확인이 수행되면
- **then**: `.gui-run.lock` (userData 경로 내) 파일이 존재하지 않으면 생성(PID 기록)하고, 존재하면 "skipped(lock)" 항목을 기록한 뒤 spawn을 하지 않아야 한다

#### R-T5.2: Run 완료 시 lock 파일 삭제
- **given**: spawn된 Playwright 프로세스가 exit 이벤트를 발생
- **when**: exit code와 무관하게 프로세스 종료가 감지되면
- **then**: `.gui-run.lock` 파일이 즉시 삭제되어 다음 실행이 가능한 상태가 되어야 한다

---

## R-T6: 동시성 제한 — 전역 1 워커 + 순차 큐
- **type**: constraint
- **behavior**: GUI는 동시에 1개의 Playwright 실행만 허용하고, 추가 Run 요청은 순차 큐에 적재하여 현재 실행 완료 후 순서대로 처리해야 한다.
- **source**: [Tech.ARCH Research — "workers=1, fullyParallel=false" / playwright.config.ts:51-52; Business.RISK.Q: 동시 Run 처리 → "큐에 넣고 순차 실행"]
- **confidence**: high
- **open_questions**: none

### Sub-requirements

#### R-T6.1: 큐 대기 상태 UI 반영
- **given**: 카탈로그 항목이 큐에 대기 중인 상태
- **when**: 렌더러가 현재 큐 상태를 표시하면
- **then**: 해당 ATC 항목은 "Queued(n번째)" 상태 배지로 표시되어야 한다 (Interaction.STATE.Q 참조)

#### R-T6.2: 병렬 spawn 절대 금지
- **given**: GUI 메인 프로세스에 Run 요청이 2개 이상 동시에 도착한 상태
- **when**: 이미 spawn이 활성 중이면
- **then**: 두 번째 이후 요청은 spawn하지 않고 큐에만 적재되어야 하며, userDataDir SingletonLock 충돌을 유발하는 병렬 Playwright 기동은 발생하지 않아야 한다 [Research — lib/test-fixture.ts:123-159]

---

## R-T7: runs 결과 발견 — reports/runs/ SSOT + chokidar watch
- **type**: functional
- **behavior**: GUI는 `reports/runs/` 디렉토리를 단일 정보 소스(SSOT)로 취급하며, 앱 시작 시 전체 재스캔하고 활성 중에는 chokidar로 fs.watch하여 launchd가 GUI 없이 완료한 run도 자동 발견해야 한다.
- **source**: [Tech.ARCH.Drill: launchd가 GUI 꺼진 동안 돌린 run의 결과 GUI가 어떻게 발견 → "reports/runs/ SSOT, chokidar watch"]
- **confidence**: high
- **open_questions**: `<runId>.json` 기록 완료 시점 감지 방법 — 파일 크기 안정화 또는 rename 이벤트로 판정할지 미결

### Sub-requirements

#### R-T7.1: 앱 시작 시 기존 runs 전체 인덱싱
- **given**: Electron 앱이 기동되면
- **when**: 메인 프로세스 초기화 단계에서
- **then**: `reports/runs/` 를 glob 스캔하여 기존 `<runId>.json` 파일들을 읽고 히스토리 목록을 구성해야 한다 [Research#7 — .json 구조: atc_title, steps, overall, inputs_used]

#### R-T7.2: 활성 중 신규 runId 자동 감지
- **given**: GUI가 열려 있고 chokidar가 `reports/runs/` 를 watch 중인 상태
- **when**: 새 `reports/runs/<runId>/` 디렉토리 또는 `<runId>.json` 파일이 생성되면
- **then**: 히스토리 목록에 해당 runId가 자동으로 추가되고 완료 여부가 반영되어야 한다

#### R-T7.3: launchd post-hook 의존 금지
- **given**: launchd가 ATC를 실행하고 완료된 상태
- **when**: GUI가 해당 run의 결과를 발견하는 방식이 결정될 때
- **then**: launchd plist에 post-exit hook/program을 추가하여 GUI에 알리는 방식을 사용하지 않고, 순수하게 파일시스템 watch만으로 발견해야 한다

---

## R-T8: 데이터 영속화 — Electron userData 폴더
- **type**: constraint
- **behavior**: 스케줄 설정, runs 인덱스 캐시, 카탈로그 캐시는 `~/Library/Application Support/<app-name>/` (Electron `app.getPath('userData')`) 에 저장되어야 하며, 레포 디렉토리 안에는 저장하지 않는다.
- **source**: [Tech.DATA.Q: 스케줄/런 메타/카탈로그 캐시 저장 위치 → "Electron userData"]
- **confidence**: high
- **open_questions**: `<app-name>` 값 미결 (예: `Windly ATC Runner`)

### Sub-requirements

#### R-T8.1: schedules.json — userData에 저장
- **given**: 사용자가 스케줄을 생성/수정/삭제하면
- **when**: 변경이 적용되면
- **then**: `<userData>/schedules.json` 이 갱신되어야 하며, 레포 클론을 지워도 스케줄 설정이 유지되어야 한다

#### R-T8.2: runs 결과는 reports/runs/ — GUI가 이동/복사 금지
- **given**: Playwright가 `reports/runs/<runId>/` 에 결과를 기록한 상태
- **when**: GUI가 해당 결과를 표시하면
- **then**: GUI는 `.json`/`.md`/스크린샷을 읽기 전용으로만 소비해야 하며, 파일을 이동·복사·삭제해서는 안 된다 [Research#6-7 D6]

#### R-T8.3: lock 파일 — userData에 위치
- **given**: R-T5에서 정의된 `.gui-run.lock`
- **when**: 파일 경로가 결정되면
- **then**: `<userData>/.gui-run.lock` 경로를 사용해야 하며, 레포 루트나 `reports/` 안에 생성되어서는 안 된다

---

## R-T9: 플랫폼 — macOS 전용 하드 제약
- **type**: constraint
- **behavior**: GUI는 macOS 전용으로만 구현하며, Windows/Linux 지원을 고려한 추상화 레이어를 두지 않는다.
- **source**: [Tech.INFRA.Q: 지원 플랫폼 → "macOS 전용, launchd 활용, Windows/Linux 미지원"]
- **confidence**: high
- **open_questions**: 최소 지원 macOS 버전 미결

### Sub-requirements

#### R-T9.1: launchd 하드 의존
- **given**: 스케줄링 기능이 구현될 때
- **when**: 스케줄 발화 메커니즘이 선택되면
- **then**: macOS launchd만을 사용해야 하며, node-cron이나 setTimeout 기반의 in-process 대안을 launchd 대체제로 사용하지 않아야 한다

#### R-T9.2: .app 패키징만 지원
- **given**: electron-builder 패키징 설정
- **when**: 배포 아티팩트가 정의되면
- **then**: `mac` 타겟만 설정하고 `win`/`linux` 타겟 설정을 추가하지 않아야 한다

---

## R-T10: 새 의존성 목록 — npm 단독 설치
- **type**: constraint
- **behavior**: GUI 추가에 필요한 신규 패키지는 `npm install`로만 설치하며, yarn/pnpm/bun을 사용하지 않는다.
- **source**: [Tech.DEPEND.Q: 새 의존성 (갱신 버전) → electron, react, react-dom, vite, @vitejs/plugin-react, electron-builder, react-markdown 또는 marked, chokidar; C2, D2]
- **confidence**: high
- **open_questions**: react-markdown vs marked 최종 선택 미결

### Sub-requirements

#### R-T10.1: 승인된 신규 패키지 목록
- **given**: GUI 구현을 시작할 때
- **when**: `npm install`로 새 의존성을 추가하면
- **then**: `electron`, `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `electron-builder`, `react-markdown` (또는 `marked`), `chokidar` 에 한해 추가해야 하며, `ws` (WebSocket)는 IPC로 대체되었으므로 추가하지 않는다

#### R-T10.2: lockfile 단일 유지
- **given**: 신규 패키지 설치 후
- **when**: 레포 루트를 확인하면
- **then**: `package-lock.json`만 존재하고 `yarn.lock`, `pnpm-lock.yaml`, `bun.lock*` 은 생성되어 있지 않아야 한다

---

## R-T11: 단일 레포 — gui/ 디렉토리 병행 구조
- **type**: constraint
- **behavior**: GUI 코드는 기존 레포의 `gui/` 디렉토리에 위치하며, 기존 `atcs/`, `lib/`, `tests/`, `recoveries/`, `reporters/` 구조를 변경하지 않는다.
- **source**: [Tech.COMPAT.Q: GUI 코드 위치 → "단일 레포 안 gui/ 디렉토리, package.json 공유"]
- **confidence**: high
- **open_questions**: none

### Sub-requirements

#### R-T11.1: tsconfig include 확장
- **given**: 기존 `tsconfig.json`의 `include` 배열
- **when**: `gui/` 코드가 추가되면
- **then**: `"gui/**"` 항목이 `include` 배열에 추가되어야 하며, 기존 `include` 항목은 그대로 유지되어야 한다 [Research — Toolchain baseline: TypeScript strict, tsconfig.json:6-7]

#### R-T11.2: npm run gui 스크립트 추가
- **given**: 개발자가 GUI를 실행하려 할 때
- **when**: `npm run gui`를 실행하면
- **then**: Electron + Vite dev 서버가 기동되어야 하며, `package.json`의 `scripts`에 해당 항목이 추가되어야 한다

#### R-T11.3: 기존 프레임워크 동작 불변
- **given**: `gui/` 코드가 추가된 상태
- **when**: `npm run atc -- atcs/<domain>/<name>.atc.yml` 을 실행하면
- **then**: 기존 runner/reporter/config/tests의 동작이 GUI 추가 전과 완전히 동일해야 한다

---

## R-T12: 단방향 의존 — GUI는 lib/* import, lib는 GUI 모름
- **type**: constraint
- **behavior**: `gui/` 코드는 `lib/*`을 import할 수 있으나 `tests/`, `recoveries/`, `atcs/`를 직접 import해서는 안 되며, `lib/` 모듈은 `gui/`를 import해서는 안 된다.
- **source**: [Tech.COMPAT.Q: 기존 ATC 프레임워크 동작 변경 → "GUI는 lib/* import 단방향, CLAUDE.md §h"]
- **confidence**: high
- **open_questions**: none

### Sub-requirements

#### R-T12.1: GUI → lib/* import 허용
- **given**: GUI가 ATC 카탈로그를 로드하거나 스키마를 검증할 때
- **when**: GUI 코드가 `lib/atc-loader.ts`, `lib/atc-schema.ts` 등을 import하면
- **then**: 해당 import는 허용되며 정상 타입 추론이 동작해야 한다 [Research#3 lib/atc-loader.ts:38-76]

#### R-T12.2: GUI → tests/recoveries/atcs 직접 import 금지
- **given**: `gui/` 내의 소스 파일
- **when**: `tests/`, `recoveries/`, `atcs/` 경로를 import 구문에 사용하면
- **then**: 해당 import는 존재하지 않아야 하며, 코드 리뷰 또는 tsc 에서 경로 오류로 드러나야 한다

#### R-T12.3: lib/ → gui/ import 금지
- **given**: `lib/` 내의 소스 파일
- **when**: `gui/` 경로를 import 구문에 사용하면
- **then**: 해당 import는 존재하지 않아야 한다

---

## R-T13: 리포트 데이터 소비 — .json/.md 읽기 전용
- **type**: constraint
- **behavior**: GUI는 `reports/runs/<runId>/<runId>.json` 과 `<runId>.md`를 읽기 전용으로 소비하며, Playwright reporter가 생성한 파일 형식과 경로를 그대로 신뢰한다.
- **source**: [Tech.COMPAT.Q: 기존 ATC 프레임워크 동작 변경 → "reports/runs/<runId>/<runId>.{md,json}을 데이터로만 소비"; Research#7]
- **confidence**: high
- **open_questions**: none

### Sub-requirements

#### R-T13.1: .json 구조 신뢰 — 스키마 변경 없음
- **given**: GUI가 run 결과를 렌더링할 때
- **when**: `<runId>.json`을 파싱하면
- **then**: `{ atc_title, steps[{step_id, status, duration_ms, error_key, recovery_id, message}], overall, inputs_used }` 구조를 그대로 사용해야 하며, reporter 출력 형식을 GUI에 맞게 변경해서는 안 된다 [Research#7]

#### R-T13.2: .md 인라인 렌더링
- **given**: GUI에서 run 결과 탭을 선택하면
- **when**: `<runId>.md` 파일이 로드되면
- **then**: react-markdown 또는 marked를 통해 GUI 내부 별도 탭에 렌더링되어야 한다 (Interaction.FEEDBACK.Q: 리포트 .md 별도 탭으로 GUI 안에서 렌더)

---

## R-T14: Renderer 보안 강화 — contextIsolation + 화이트리스트 IPC
- **type**: security
- **behavior**: Electron BrowserWindow는 `contextIsolation: true`, `nodeIntegration: false`로 생성해야 하며, 렌더러가 Node.js API에 직접 접근할 수 없어야 한다.
- **source**: [Tech.SECURITY.Q: Electron renderer 보안 기본값 → "contextIsolation: true, nodeIntegration: false, preload script로 노출 API 제한"]
- **confidence**: high
- **open_questions**: none

### Sub-requirements

#### R-T14.1: contextIsolation 강제
- **given**: BrowserWindow 생성 옵션
- **when**: GUI 앱이 기동되면
- **then**: 모든 BrowserWindow의 `webPreferences`에 `contextIsolation: true`, `nodeIntegration: false` 가 명시되어야 한다

#### R-T14.2: preload 스크립트 채널 화이트리스트
- **given**: preload.ts 에서 contextBridge.exposeInMainWorld가 정의
- **when**: 렌더러가 IPC API를 호출하면
- **then**: `ipcMain.handle` / `ipcRenderer.on`에 등록된 채널 목록(예: `atc:run`, `atc:kill`, `atc:log`, `atc:done`, `catalog:list`, `schedule:create`, `schedule:delete`)에 한해서만 통신이 허용되어야 하며, 임의 채널명 사용이 차단되어야 한다

#### R-T14.3: .env 미접근 — 메인 프로세스도 GUI 목적으로 읽지 않음
- **given**: GUI 메인 프로세스가 실행 중인 상태
- **when**: 환경변수가 필요한 상황이 발생하면
- **then**: GUI는 `.env`를 직접 파싱하거나 credential 값을 읽어 렌더러에 노출해서는 안 되며, spawn 시 자식 프로세스가 lib/config.ts를 통해 처리하도록 위임해야 한다 [Research#5 lib/config.ts:21-26]

---

## R-T15: 네트워크 포트 미사용 — 외부 노출 0
- **type**: security
- **behavior**: GUI 앱은 어떠한 TCP/UDP 포트도 열지 않으며, 모든 통신은 Electron IPC 내부 채널로만 이루어진다.
- **source**: [Tech.SECURITY.Q: localhost 외부 노출 → "네트워크 포트 자체 안 엶, Electron 내부 IPC만 사용"]
- **confidence**: high
- **open_questions**: none

### Sub-requirements

#### R-T15.1: WebSocket 서버 금지
- **given**: GUI 메인 프로세스 초기화 코드
- **when**: 통신 채널이 설정되면
- **then**: `ws`, `socket.io`, `express`, `http.createServer` 등 네트워크 서버 코드가 존재하지 않아야 한다

#### R-T15.2: 원격 URL 접근 금지
- **given**: BrowserWindow 설정
- **when**: 렌더러가 로드할 URL이 결정되면
- **then**: `file://` 프로토콜 또는 Vite dev 서버의 `localhost`만 사용해야 하며, 외부 URL을 BrowserWindow에서 직접 로드해서는 안 된다

---

## R-T16: 사전 검증 — WINDLY_EXTENSION_PATH 및 step handler 매칭
- **type**: functional
- **behavior**: GUI는 Run 실행 전에 환경변수 존재 여부와 ATC step.id ↔ spec.ts handler 매칭 누락을 사전 검증하여 사용자에게 명확한 오류 메시지를 제공해야 한다.
- **source**: [Interaction.EDGE.Q: ATC 실행 주요 실패 시나리오 → "WINDLY_EXTENSION_PATH 누락/.env 부재 → Run 전 사전 검증; step.id ↔ handler 매칭 누락 → 카탈로그 로드 시 사전 감지"]
- **confidence**: high
- **open_questions**: spec.ts handler 목록을 정적 분석으로 추출할지, 별도 manifest 파일을 두어 등록할지 구현 선택 필요

### Sub-requirements

#### R-T16.1: WINDLY_EXTENSION_PATH 사전 체크
- **given**: 사용자가 UI ATC(확장 필요)의 Run 버튼을 누른 상태
- **when**: spawn 직전 사전 검증이 수행되면
- **then**: `process.env.WINDLY_EXTENSION_PATH`가 falsy이거나 경로가 존재하지 않으면 실행을 차단하고 UI에 명확한 오류 메시지를 표시해야 한다

#### R-T16.2: stale ATC 배지 표시 (차단 없음)
- **given**: 카탈로그 로드 시 `login` 또는 `enter_workspace` step id를 포함한 ATC가 감지되면
- **when**: 해당 ATC가 카탈로그에 표시되면
- **then**: 'Stale' 경고 배지가 표시되어야 하며, 실행은 차단하지 않아야 한다 [Research#87 레거시 login step]

---

## R-T17: Chromium 비정상 종료 감지 — exit code + stdout 파싱
- **type**: functional
- **behavior**: GUI는 spawn된 Playwright 프로세스의 exit code와 stdout 마지막 라인을 파싱하여 성공/실패를 판정해야 하며, 별도 watchdog timeout은 구현하지 않는다.
- **source**: [Business.RISK.Q: Chromium/Playwright 비정상 종료 감지 → "spawn process exit code + stdout 마지막 line 파싱, watchdog timeout 미정 → 구현 안 함"]
- **confidence**: high
- **open_questions**: Playwright stdout의 정확한 실패 패턴 문자열 목록 사전 정의 필요 (예: "X failed", "Error:")

### Sub-requirements

#### R-T17.1: exit code 0 = 성공, 비0 = 실패
- **given**: spawn 프로세스가 종료되면
- **when**: `close` 이벤트의 code 인자를 평가하면
- **then**: code가 0이면 run 성공, 비0이면 run 실패로 판정하고 UI에 반영해야 한다

#### R-T17.2: stdout 실패 패턴 파싱
- **given**: Playwright가 stdout에 "X failed" 또는 오류 요약을 출력한 상태
- **when**: 프로세스 종료 후 stdout 버퍼를 분석하면
- **then**: 실패 패턴이 감지되면 GUI run 상태를 failed로 마킹하고 해당 라인을 UI 로그에 강조 표시해야 한다

---

## R-T18: GUI 닫기 시 진행 중 ATC 처리 — Confirm 모달 + detach 지원
- **type**: functional
- **behavior**: 진행 중인 run이 있을 때 GUI 창을 닫으려 하면 confirm 모달을 표시하여 kill 또는 detach를 선택하게 해야 하며, detach 선택 시 run이 background에서 계속 실행되어야 한다.
- **source**: [Business.RISK.Q: GUI 닫기 시 진행 중 ATC → "Confirm 모달, kill vs detach"; Drill: detach 선택 시 → "macOS OS 네이티브 알림 + 이후 GUI 다시 열었을 때 runs 목록에 결과 표시"]
- **confidence**: high
- **open_questions**: detach 시 spawn 옵션 (`detached: true, stdio: 'ignore'` + `unref()`) 적용 여부 확인 필요

### Sub-requirements

#### R-T18.1: kill 선택 시 프로세스 즉시 종료
- **given**: confirm 모달에서 사용자가 "kill"을 선택하면
- **when**: 모달 확인 이벤트가 처리되면
- **then**: spawn된 Playwright 프로세스에 SIGTERM이 전달되고 GUI 창이 닫혀야 한다

#### R-T18.2: detach 선택 시 백그라운드 계속 실행
- **given**: confirm 모달에서 사용자가 "detach"를 선택하면
- **when**: 모달 확인 이벤트가 처리되면
- **then**: spawn 프로세스는 계속 실행되고 GUI 창만 닫혀야 하며, run 완료 시 macOS OS 네이티브 알림이 발송되어야 한다

#### R-T18.3: 재기동 시 detach된 run 결과 표시
- **given**: detach 후 Playwright run이 완료되어 `reports/runs/<runId>/`가 생성된 상태
- **when**: GUI를 다시 열면
- **then**: R-T7.1의 시작 시 재스캔에 의해 해당 runId가 히스토리 목록에 자동으로 표시되어야 한다

<!--
Parsing hints:
  - Requirement ID:     ^## R-[BUT]\d+: (.+)
  - Field:              ^- \*\*(\w+)\*\*: (.+)
  - Sub-requirement ID: ^#### R-[BUT]\d+\.\d+: (.+)
  - GWT fields:         given/when/then under sub-requirement
  - Axis codes:         B=Business, U=UX, T=Tech
-->
