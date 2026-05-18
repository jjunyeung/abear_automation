# GUI 의존 방향 — `gui/ → lib/` 단방향 (INV-3)

ATC GUI 러너 (`gui/`) 는 ATC 프레임워크 핵심을 **읽기 전용 클라이언트**로만 소비한다. 의존 방향은 한 방향 — `gui/` 는 `lib/*` 의 일부 화이트리스트 모듈만 import 하고, `lib/` 는 `gui/` 를 절대 import 하지 않는다. 또한 `gui/` 는 `tests/`, `atcs/`, `recoveries/`, `reporters/` 에서 import 하지 않는다. `gui/renderer/` (sandboxed React) 는 한 단계 더 좁다 — `lib/*` 도 직접 import 불가, **IPC 만**.

## 금지

- `gui/**` 가 다음 디렉토리에서 import 하는 것:
  - `tests/**` — spec.ts 는 Playwright 가 실행하는 코드. GUI 는 정적 import X.
  - `atcs/**` — YAML 데이터 파일. 런타임에 `loadATC()` 로만 읽는다 (정적 import 절대 X — `.atc.yml` 은 모듈이 아님).
  - `recoveries/**` — 복구 플로우는 ATC 런타임 코드. GUI 책임 밖.
  - `reporters/**` — reporter 는 Playwright 가 호출하는 모듈. GUI 는 결과 `.md` / `.json` 파일을 **파일시스템에서 읽기만** 한다 (INV-2).
  - `automation/**` — 레거시 폴더. 패턴 참고만, import 금지 (CLAUDE.md (c) D1).
- `lib/**` 가 `gui/**` 에서 import 하는 것 — 절대 금지 (역방향 의존성, 순환 / 재배포 곤란).
- `gui/renderer/**` 가 `lib/**` 에서 import 하는 것 — 금지. 렌더러는 contextIsolation/sandbox 환경. 모든 main↔renderer 통신은 preload 의 IPC 화이트리스트 (R-T3.3) 만.
- `gui/preload/**` 가 `lib/**` 에서 import 하는 것 — 금지. preload 는 contextBridge 만 다룬다. 실제 로직은 main 에 두고 IPC 로 호출.
- 새 디렉토리 (`scripts/gui-*`, `tools/gui-*`) 를 만들어 의존 방향 우회 금지.

## 대신

- `gui/main/**` 만 `lib/*` 를 import 한다. 현재 허용된 `lib/*` 화이트리스트:
  - `lib/config.ts` — `loadEnv()`, `WindlyEnv` 타입 (사전 검증, INV-7).
  - `lib/atc-loader.ts` — `loadATC()` 카탈로그 로딩.
  - `lib/atc-schema.ts` — `ATC`, `Step` 타입 추론.
  - 새 lib 모듈을 import 하려면 먼저 contracts.md 의 "API Surface — GUI ↔ lib boundary" 표에 추가하고 그 다음 코드.
- `gui/renderer/**` 는 `gui/shared/**` (IPC 타입 / 상수) 또는 자체 React 컴포넌트만 import 한다. 환경/파일 시스템 접근이 필요하면 IPC 채널을 새로 정의 (R-T3.3 화이트리스트 갱신).
- `gui/preload/**` 는 `gui/shared/**` 의 채널 상수만 import. `electron` 의 `contextBridge` / `ipcRenderer` 외 X.
- `gui/main/**` 는 `electron`, `node:*`, npm 의존성 (`chokidar`, `react-markdown` 등) 자유 사용.
- 검증: `npm run check:deps` 가 `scripts/check-deps.mjs` 를 통해 위반을 자동 감지한다. 새 위반은 CI 가 아니더라도 즉시 빨갛게 떠야 한다.

## 위반 예시

```ts
// 잘못된 예 1: gui/main 이 tests/ import (R-T12.2)
// 파일: gui/main/catalog.ts
import { StepHandlers } from "../../tests/collect/product-error-check.spec";   // ✗

// 잘못된 예 2: gui/main 이 atcs/ YAML 을 정적 import
// 파일: gui/main/catalog.ts
import atc from "../../atcs/collect/foo.atc.yml";                              // ✗ (YAML 은 loadATC 경유)

// 잘못된 예 3: gui/main 이 recoveries/ import
// 파일: gui/main/run-queue.ts
import { recover } from "../../recoveries/missing_image";                      // ✗

// 잘못된 예 4: gui/main 이 reporters/ import (INV-2 + INV-10 위반)
// 파일: gui/main/run-history.ts
import { writeReport } from "../../reporters/atc-reporter";                    // ✗ (파일을 fs 로만 읽을 것)

// 잘못된 예 5: lib/ 가 gui/ import (역방향)
// 파일: lib/runner.ts
import { sendIpc } from "../gui/main/ipc-scaffold";                            // ✗

// 잘못된 예 6: gui/renderer 가 lib/ 직접 import (sandbox 위반)
// 파일: gui/renderer/src/App.tsx
import { loadEnv } from "../../../lib/config";                                 // ✗ (IPC 경유할 것)
import fs from "node:fs";                                                      // ✗ (renderer 는 nodeIntegration: false)

// 잘못된 예 7: gui/preload 가 lib/ import
// 파일: gui/preload/index.ts
import { loadATC } from "../../lib/atc-loader";                                // ✗
```

## 올바른 예

```ts
// 올바른 예 1: gui/main 이 화이트리스트된 lib/* 만 import
// 파일: gui/main/preflight.ts
import { loadEnv } from "../../lib/config";              // ✓ INV-7 의 유일한 env 진입점
import type { WindlyEnv } from "../../lib/config";       // ✓
import { loadATC } from "../../lib/atc-loader";          // ✓
import type { ATC, Step } from "../../lib/atc-schema";   // ✓

// 올바른 예 2: gui/renderer 는 IPC + shared 만
// 파일: gui/renderer/src/App.tsx
import { CHANNELS } from "../../shared/channels";        // ✓ gui/shared
declare const window: { atc: { runAtc: (a: SpawnArgs) => Promise<void> } };
await window.atc.runAtc({ atcPath, inputs });             // ✓ IPC 만

// 올바른 예 3: gui/preload 는 electron + shared 만
// 파일: gui/preload/index.ts
import { contextBridge, ipcRenderer } from "electron";   // ✓
import { CHANNELS } from "../shared/channels";           // ✓

// 올바른 예 4: atcs/ YAML 은 런타임 loadATC 로만
// 파일: gui/main/catalog.ts
import { loadATC } from "../../lib/atc-loader";
const atc = await loadATC(absPath);                       // ✓ 동적 로드, 정적 import 아님
```

```bash
# 검증 — 위반 있으면 비0 종료
npm run check:deps
# 기대 출력: "check-deps: OK (0 violations, INV-3 unidirectional gui→lib boundary intact)"
```

## 근거 / 출처

- contracts.md **INV-3**: "Dependency direction is strictly `gui/ → lib/` only. `lib/` never imports from `gui/`. `gui/` never imports from `tests/`, `recoveries/`, or `atcs/`."
- requirements.md **R-T12.1**: GUI 코드 (`gui/**`) 는 `lib/*` (config/runner/schema) 만 import 한다.
- requirements.md **R-T12.2**: `gui/` 는 `tests/`/`recoveries/`/`atcs/` 의 어떤 파일도 import 하지 않는다.
- requirements.md **R-T12.3**: `lib/` 는 `gui/` 의 어떤 파일도 import 하지 않는다 (단방향).
- requirements.md **R-T14.1**: `BrowserWindow` 는 `contextIsolation: true`, `nodeIntegration: false` — 따라서 렌더러는 lib import 자체가 불가능하므로 IPC 가 유일한 통로.
- requirements.md **R-T3.3**: preload 채널 화이트리스트 — 임의 채널/모듈 노출 금지.
- 자동 검증: `scripts/check-deps.mjs` (T3) — `npm run check:deps`.
- 비-목표 경계: contracts.md "Non-Goals (GUI v1)" — ATC YAML editor / spec.ts generator / recoveries UI 등이 없어야 하므로, 해당 디렉토리에 대한 정적 import 가 애초에 발생할 일이 없다 (R-B5.2 기준 부수 보호막).
