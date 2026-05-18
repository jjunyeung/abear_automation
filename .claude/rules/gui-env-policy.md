# GUI 환경변수 정책 — `.env` 직접 접근 금지, `loadEnv()` 단일 경유 (INV-7)

GUI 는 자격증명·환경변수를 **직접 파싱하거나 렌더러에 노출하지 않는다**. 환경변수는 부모 프로세스의 inherited env 로만 자식 Playwright 프로세스에 전달되며 (`child_process.spawn` 의 `env` 옵션을 명시하지 않는다), 사전 검증이 필요한 항목 (`WINDLY_EXTENSION_PATH` 등) 만 `lib/config.ts` 의 `loadEnv()` 를 통해 메인 프로세스에서 읽는다. 렌더러는 환경변수 이름조차 코드에 적지 않는다.

## 금지

- `gui/**` 어디서든 다음 모듈 import 금지:
  - `dotenv`, `dotenv-flow`, `dotenv-cli`, `dotenv-expand`, `dotenv-safe` — `.env` 파싱 라이브러리.
  - `node:fs` 로 `.env` 파일을 직접 `readFileSync`/`readFile` 하는 코드 — 정규식이든 줄 단위든 일체.
- `gui/**` 어디서든 `.env` 또는 `process.env.WINDLY_*` 직접 접근 금지 — **단 예외 1개**: `gui/main/preflight.ts` 에서 `loadEnv()` 호출 후 그 결과 객체를 읽는 것. preflight 외 다른 메인 모듈도 직접 `process.env` 가 아닌 `loadEnv()` 호출 → 결과 받기.
- `gui/renderer/**` 에 `WINDLY_*`, `process.env`, `import.meta.env.WINDLY_*` 같은 문자열 자체 등장 금지. (Vite 가 빌드 시 inline 해버리는 위험. 렌더러는 `nodeIntegration: false` 라 `process.env` 자체가 없으니 빌드 통과 자체가 안 되어야 정상.)
- `gui/preload/**` 에 환경변수 읽기 코드 금지 — preload 는 contextBridge 만, 환경 결과는 IPC 응답으로만 흘려보낸다.
- spawn 시 `env` 옵션 명시 금지 — 명시하면 inherited env 가 끊긴다. `env: { ...process.env, FOO: 'bar' }` 같은 패턴도 금지 (PATH 등 부수 변수 누락 위험). 부모 env 그대로 상속이 표준.
- 자격증명 (`WINDLY_LOGIN_EMAIL`, `WINDLY_LOGIN_PASSWORD`) 을 IPC 응답에 포함 금지 — 사전 검증 결과는 **boolean / sanitized 메시지** 만 (예: `{ ok: false, reason: 'WINDLY_EXTENSION_PATH 미설정' }`. 실제 값을 보내지 않는다).
- `.env` 파일 자체를 GUI 가 **쓰지** 마라 (편집 UI 비-목표 R-B5.2). 사용자가 직접 편집 / 외부 vault 사용.
- 환경변수 derived 값을 `localStorage` / `IndexedDB` / `userData/schedules.json` 등에 영속 저장 금지. 휘발성으로만 사용.

## 대신

- 메인 프로세스 어디서든 env 가 필요하면:
  ```ts
  // 단일 진입점
  import { loadEnv } from "../../lib/config";
  const env = loadEnv();   // .env 가 없거나 필드가 비면 throw 또는 정의된 시그널
  ```
- preflight 외 모듈은 결과 객체를 인자로 받는다 (DI 패턴, 재호출 X):
  ```ts
  export async function runAtc(args: SpawnArgs, env: WindlyEnv) { /* ... */ }
  ```
- 사전 검증 흐름:
  1. 사용자가 Run 트리거 → 메인이 `loadEnv()` 호출.
  2. `WINDLY_EXTENSION_PATH` 존재 + 경로 유효성 체크 (R-T16.1).
  3. 결과를 `PreRunValidation` (boolean + reason string) 으로 렌더러에 응답.
  4. 통과 시에만 spawn — `env` 옵션 없이 (inherited).
- 렌더러에서 env 상태 보여주기:
  - "EXTENSION_PATH 미설정" 같은 sanitized 메시지만 표시.
  - 실제 경로 문자열도 노출하지 않는 게 안전 (path 에 사용자명 등 PII 포함 가능).
- 자격증명 변경이 필요하면: 사용자가 `.env` 파일을 외부 editor 로 직접 편집 → GUI 재시작. GUI 안에서 편집 UI 제공 X (비-목표).

## 위반 예시

```ts
// 잘못된 예 1: gui/ 가 dotenv 사용
// 파일: gui/main/index.ts
import { config } from "dotenv";                       // ✗ 라이브러리 자체 금지
config();
console.log(process.env.WINDLY_LOGIN_PASSWORD);        // ✗ 자격증명 메인 로그에 찍기

// 잘못된 예 2: 직접 .env 파싱
// 파일: gui/main/env-reader.ts
import fs from "node:fs";
const raw = fs.readFileSync(".env", "utf8");           // ✗ INV-7 위반
const lines = raw.split("\n").map(...);                // ✗

// 잘못된 예 3: 렌더러가 WINDLY_* 문자열을 코드에 적음
// 파일: gui/renderer/src/EnvStatus.tsx
const path = import.meta.env.WINDLY_EXTENSION_PATH;    // ✗ Vite inline 위험
if (window.process?.env?.WINDLY_LOGIN_EMAIL) { /* */ } // ✗ nodeIntegration 우회 시도

// 잘못된 예 4: 자격증명을 IPC 응답에 포함
// 파일: gui/main/preflight.ts
ipcMain.handle("env:status", () => ({
  email: process.env.WINDLY_LOGIN_EMAIL,                // ✗ 렌더러 노출 금지
  extensionPath: process.env.WINDLY_EXTENSION_PATH,    // ✗ 경로조차 sanitize 안 됨
}));

// 잘못된 예 5: spawn 에 env 옵션 명시
spawn("npx", ["playwright", "test"], {
  env: { ...process.env, FORCE_COLOR: "1" }            // ✗ inherited env 끊김 위험 — FORCE_COLOR 는 PATH/HOME 등 빠질 수 있음
});

// 잘못된 예 6: 다른 메인 모듈이 process.env 직접 접근 (single source 위반)
// 파일: gui/main/run-queue.ts
if (process.env.WINDLY_EXTENSION_PATH) { /* ... */ }    // ✗ — loadEnv() 결과를 인자로 받을 것
```

## 올바른 예

```ts
// 올바른 예 1: preflight 가 유일한 env 진입점
// 파일: gui/main/preflight.ts
import { existsSync } from "node:fs";
import { loadEnv, type WindlyEnv } from "../../lib/config";
import type { PreRunValidation } from "../shared/types";

export function runPreflight(): PreRunValidation {
  let env: WindlyEnv;
  try {
    env = loadEnv();
  } catch {
    return { ok: false, reason: ".env 파일이 없거나 형식이 잘못됨" };
  }
  if (!env.WINDLY_EXTENSION_PATH) {
    return { ok: false, reason: "WINDLY_EXTENSION_PATH 가 .env 에 정의되지 않음" };
  }
  if (!existsSync(env.WINDLY_EXTENSION_PATH)) {
    return { ok: false, reason: "WINDLY_EXTENSION_PATH 경로가 존재하지 않음" };
    // 실제 경로 문자열은 응답에 포함하지 않는다 — sanitized message only
  }
  return { ok: true };   // ✓ env 값 자체는 응답에 X
}
```

```ts
// 올바른 예 2: spawn 은 inherited env (env 옵션 미명시)
// 파일: gui/main/run-queue.ts
import { spawn } from "node:child_process";
const child = spawn("npx", ["playwright", "test", "--project", project, spec], {
  cwd: process.cwd(),
  stdio: ["ignore", "pipe", "pipe"],
  // env 옵션 없음 → 부모 env 그대로 상속 ✓
});
```

```ts
// 올바른 예 3: 렌더러는 IPC 결과만 받음
// 파일: gui/renderer/src/RunButton.tsx
const validation = await window.atc.preflight();   // ✓ IPC
if (!validation.ok) {
  toast.error(validation.reason);                  // sanitized message 만
  return;
}
await window.atc.runAtc({ atcPath, inputs });
```

```bash
# 검증 grep — gui/ 안에 다음 패턴이 0건이어야 함
rg -n 'process\.env\.WINDLY_' gui/ --type ts --type tsx
# 기대: gui/main/preflight.ts (loadEnv 결과 사용 부분만, 또는 0건)

rg -n 'require\(.dotenv.\)|from .dotenv.' gui/
# 기대: 0건

rg -n 'readFileSync\(.*\.env' gui/
# 기대: 0건

rg -n 'WINDLY_' gui/renderer/ gui/preload/
# 기대: 0건 (렌더러/preload 코드 본체에는 환경변수 이름 자체 없음)
```

## 근거 / 출처

- contracts.md **INV-7**: "`gui/` never parses or writes `.env`. Environment variables reach the child Playwright process via inherited parent env (`env` option omitted from `child_process.spawn` options). GUI reads env state only through `loadEnv()` (`lib/config.ts`) for pre-run validation, in the main process only — never in the renderer."
- requirements.md **R-T14.3**: "GUI는 `.env`를 직접 파싱하거나 credential을 렌더러에 노출하지 않고 spawn 시 자식 프로세스(`lib/config.ts` 경유)에 위임한다."
- requirements.md **R-T14.1**: `contextIsolation: true`, `nodeIntegration: false` — 렌더러에서 `process.env` 자체에 접근할 길이 차단됨.
- requirements.md **R-T2.2**: Playwright 자식이 `loadEnv()` 등 기존 진입점을 그대로 사용 (`lib/config.ts` 변경 금지).
- requirements.md **R-T16.1**: 사전 검증 — `process.env.WINDLY_EXTENSION_PATH` falsy / 경로 부재 시 spawn 차단 + UI 명확한 메시지.
- requirements.md **R-B5.2**: ATC YAML 편집, spec.ts 생성, recoveries UI 등 비-목표 — **`.env` 편집 UI 도 비-목표**의 자연스러운 확장 (사용자가 직접 편집).
- 기존 룰 `playwright-only-browser.md`: 외부 도구 우회 금지와 같은 톤 — 자격증명도 GUI 안에서 다루지 않는다.
