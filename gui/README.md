# Windly ATC Runner (GUI)

Electron + React 데스크탑 러너. 본 레포의 ATC 프레임워크 (`atcs/`, `tests/`, `recoveries/`, `lib/`) 를 GUI 에서 선택·실행한다. 내부적으로 `playwright test` 를 spawn 하므로 **CLI (`npm run atc`) 동작은 그대로** 이고, GUI 는 추가 입력 위젯·실시간 step 카드·리포트 뷰·스케줄링을 얹은 얇은 shell 이다.

> macOS 전용 (INV-8 / R-T9.2). Windows / Linux 미지원 — `electron-builder` 타겟에 추가하지 마라.

---

## 무엇이 들어있나

| 디렉토리            | 역할                                                                      |
|---------------------|---------------------------------------------------------------------------|
| `gui/main/`         | Electron main process (single-instance lock, IPC handler, spawn 오케스트레이션, launchd 스케줄러, chokidar fs watcher) |
| `gui/preload/`      | contextBridge 만 노출 — `contextIsolation:true`, `nodeIntegration:false` (R-T14.1) |
| `gui/renderer/`     | React UI (Vite). catalog / input form / run view / report / schedule / settings 탭 |
| `gui/shared/ipc.ts` | IPC payload 타입 + 화이트리스트 채널 상수 (single source of truth)         |
| `gui/dist/`         | tsc + vite build 산출물 (git-ignored)                                     |
| `gui/dist/release/` | `electron-builder` 패키징 결과 (`.dmg`, `.zip`) — git-ignored             |

---

## 사전 요구사항

```
node 20+
npm 11+
macOS (zsh)
```

`.env` 가 프로젝트 루트에 존재해야 한다. `.env.example` 복사 후 채우기:

```bash
cp .env.example .env
vi .env
```

필수 키:

- `WINDLY_BASE_URL` — 윈들리 본체 API (`https://app-api.windly.cc` 기본값).
- `WINDLY_EXTENSION_PATH` — 윈들리 Chrome 확장의 절대 경로. UI ATC 가 동작하려면 채워야 함 (D7).
- `WINDLY_LOGIN_EMAIL` / `WINDLY_LOGIN_PASSWORD` — `tests/auth.setup.ts` 가 사용 (CLAUDE.md (j)).

GUI 의 **Settings 탭** 에서 두 환경변수 의 상태를 확인할 수 있고, **사전검증(preflight)** 이 Run 직전에 자동으로 한 번 더 검사한다 (R-U3.1 / R-U3.2). 환경변수 수정 후에는 GUI 를 재시작해야 한다 — main process 가 startup 시점에 `lib/config.ts` 의 `loadEnv()` 로 1회 로드한다 (INV-7).

> Renderer 는 `.env` 또는 `process.env` 에 직접 접근하지 않는다 (INV-7, `gui-env-policy.md` 참조). 모든 환경변수 접근은 main process 의 `loadEnv()` 경유.

---

## 실행 모드

### 1. 개발 (Vite HMR + Electron)

```bash
npm run gui
```

- `tsc -p gui/main/tsconfig.json` 으로 main/preload/shared/`lib/config` 를 `gui/dist/gui/**` 에 emit.
- Vite dev 서버 (`http://localhost:5273`) 가 renderer 를 hot-reload.
- `concurrently` 로 Vite + Electron 동시 기동, `wait-on tcp:5273` 가 dev 서버 준비를 기다린 뒤 Electron 띄움.
- Renderer 코드는 저장 즉시 반영. Main/preload 코드 수정 시 GUI 종료 → `npm run gui` 재실행.

### 2. 로컬 프로덕션-유사 실행 (패키징 없이)

```bash
npm run build:gui      # tsc(main) + vite build(renderer)
electron gui/dist/gui/main/index.js
```

> emit path 가 `gui/dist/main/` 이 아니라 `gui/dist/gui/main/` 인 이유는 `gui/main/tsconfig.json` 의 `rootDir` 이 repo root 로 잡혀 있기 때문이다 (T8 learning — `lib/config.ts` 화이트리스트 import 를 허용하려고). `electron-builder.yml` 의 `extraMetadata.main` 도 같은 경로를 가리킨다.

### 3. macOS 패키징 (`.dmg` + `.zip`)

```bash
npm run package:gui
```

- 산출물: `gui/dist/release/Windly ATC Runner-<version>-{arm64,x64}.{dmg,zip}`
- 양쪽 아키텍처 (`arm64`, `x64`) 모두 빌드 — Apple Silicon / Intel 어느 쪽에서든 .dmg 마운트 후 `/Applications` 로 드래그.
- **notarization / hardened runtime 비활성** — 개인용 로컬 도구라 codesign identity 없음. macOS 첫 실행 시 Gatekeeper 가 차단하면 우클릭 → 열기 (한 번만).
- **auto-update 없음** — `electron-builder.yml` 에 publish 설정을 두지 않았다. 새 버전이 필요하면 `npm run package:gui` 재실행. INV-4 (startup 시 네트워크 금지) 와도 일치.

### 4. 동작 중 종료

- 단일 인스턴스 (`R-U10`) — 두 번째 실행 시 기존 윈도우에 토스트만 표시하고 즉시 종료.
- 실행 중인 ATC 가 있는 상태에서 종료 시 **Kill / Detach** 모달 (R-B6.3). Detach 선택 시 Electron 은 종료되지만 Playwright 자식 프로세스는 살아남고, 완료되면 macOS Notification 으로 알림 (R-B6.4 / R-T18.3).

---

## userData 아티팩트

GUI 가 자체적으로 생성·소비하는 파일은 모두 macOS userData 디렉토리 아래에 있다:

```
~/Library/Application Support/Windly ATC Runner/
  ├── schedules.json       # 등록된 스케줄 정의 (R-T8.1)
  ├── .gui-run.lock        # 실행 중인 ATC 의 PID (R-T8.3 / INV-6 — GUI 내부 직렬화 게이트)
  └── recent-skips.json    # lock 충돌 skip 로그 — 다음 GUI 열림 시 배너 (R-T5.3 / R-B6.8)
```

**reports/runs/ 는 userData 가 아닌 프로젝트 repo 안 (`reports/runs/<runId>/`) 에 있다** — Playwright reporter 가 쓰는 디스크 위치를 그대로 따른다 (R-T13.1). GUI 는 reports/runs 를 **read-only** 로만 소비 (INV-2 / R-T8.2) — chokidar 로 새 runId 디렉토리 감지, react-markdown 으로 `<runId>.md` 렌더링, screenshot 은 sandbox 화된 IPC 채널 `screenshot:read` 로 base64 base 로만 읽음.

스케줄을 모두 삭제하거나 GUI 상태를 초기화하려면:

```bash
rm -rf ~/Library/Application\ Support/Windly\ ATC\ Runner/
```

(reports/runs/ 는 영향 없음 — repo 안.)

---

## 새 ATC 추가

GUI 자체는 ATC YAML 편집기를 제공하지 않는다 (R-B5.2). 새 ATC 가 필요하면 프로젝트 루트 `CLAUDE.md` (d) 절차 또는 `/atc-new` 스킬을 사용:

```bash
# Claude Code 에서
/atc-new
```

새 ATC 파일이 `atcs/<domain>/<name>.atc.yml` 에 추가되면 GUI 의 catalog 패널이 chokidar 로 자동 감지하여 표시한다. 대응 `tests/<domain>/<name>.spec.ts` 의 `StepHandlers` 가 누락되거나 `step.id` 와 mismatch 면 catalog status 가 `stale` 로 표시되어 클릭은 가능하지만 Run 은 차단된다 (R-T16.2 / R-U5).

> 같은 이유로 `tests/<domain>/<name>.handlerKeys.json` 매니페스트가 필요하다 (T4). `scripts/migrate-handlerKeys.mjs` 로 일괄 생성 가능 — 51개 기존 spec 은 이미 매니페스트 완비.

---

## 아키텍처 / 결정 근거

- **계약 (`CONTRACTS`):** `.hoyeon/specs/atc-gui-runner/contracts.md` — IPC 채널 표, payload 타입, INV-1~INV-9 불변식, 6 가지 CatalogStatus 등 모든 결정이 정규화되어 있다.
- **요구사항 (`REQUIREMENTS`):** `.hoyeon/specs/atc-gui-runner/requirements.md` — R-B*/R-U*/R-T* 사용자/기술 요건 GWT.
- **프로젝트 규칙 (`RULES`):** `.claude/rules/`
  - `playwright-only-browser.md` — 외부 브라우저 자동화 도구 금지 (GUI 도 동일).
  - `npm-only.md` — yarn/pnpm/bun 금지.
  - `typescript-strict.md` — any 금지.
  - `atc-file-layout.md`, `recovery-file-layout.md` — ATC / recovery 파일 컨벤션.
  - `gui-import-direction.md` — gui→lib 단방향, renderer/preload→lib 차단.
  - `gui-no-network.md` — startup 네트워크 금지 (INV-4).
  - `gui-env-policy.md` — renderer 에서 env 직접 접근 금지 (INV-7).
- **솔로/로컬 전용:** CI/CD 없음 (D10). 신뢰 경계는 본인 노트북. notarization 도 auto-update 도 없다.

---

## 트러블슈팅

| 증상                                          | 원인 / 해결                                                                |
|-----------------------------------------------|----------------------------------------------------------------------------|
| `Cannot find module '.../gui/dist/main/...'`  | 옛 emit path. `npm run build:gui:main` 다시 실행, `gui/dist/main/` 잔여물 있으면 삭제. `gui/dist/gui/main/index.js` 가 실제 경로. |
| Run 클릭 시 "Settings 탭으로 이동" 토스트     | `.env` 또는 `WINDLY_EXTENSION_PATH` 가 비어있음. Settings 탭에서 확인 후 GUI 재시작. |
| catalog 의 ATC 가 `stale` 로 표시             | `tests/<domain>/<name>.handlerKeys.json` 매니페스트가 누락되거나 step.id 와 mismatch. `npm run check:deps && node scripts/migrate-handlerKeys.mjs` 후 catalog reload (Cmd+R). |
| 두 번째 GUI 실행 시 즉시 종료                  | 정상. single-instance lock (R-U10). 기존 GUI 의 SecondInstanceToast 확인. |
| .dmg 가 Gatekeeper 차단                        | 우클릭 → 열기 (한 번만). codesign identity 없음 — 의도된 동작.             |
| 스케줄이 발화 안 함                            | `launchctl list \| grep cc.windly.atc-runner` 로 plist 등록 확인. macOS 설정 → 시스템 환경설정 → 일반 → 로그인 항목 에서 "허용된 백그라운드" 도 확인. |

---

## 안전선 (절대 금지)

- ATC YAML 편집 UI 추가 금지 (R-B5.2). `/atc-new` 가 단일 경로.
- spec.ts / recoveries / lib 본체를 GUI 코드에서 import 하거나 수정 금지 (INV-3, `gui-import-direction.md`).
- Renderer 에서 `process.env.*` 또는 `fs.readFile('.env')` 직접 호출 금지 (INV-7).
- Startup 시 네트워크 요청 금지 (INV-4). auto-update / 텔레메트리 / analytics 어느 것도 없음.
- Win/Linux 타겟 추가 금지 (R-T9.2 / INV-8). `electron-builder.yml` 에 `win:` / `linux:` 키 넣지 마라.
- ATC `playwright test` 자식 프로세스를 GUI 가 죽이지 않은 채 detach 한 상태에서 두 번째 GUI 인스턴스를 시도하지 마라 — `.gui-run.lock` 이 잔존하면 next Run 이 skip 됨 (R-B6.8 의 의도된 동작). 1분 내 자연 해소 (Playwright 종료 시 lock 자동 삭제) 안 되면 `rm ~/Library/Application\ Support/Windly\ ATC\ Runner/.gui-run.lock` 수동 정리.
