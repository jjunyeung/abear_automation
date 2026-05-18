# GUI 네트워크 포트 사용 금지 — IPC 만 (INV-4)

ATC GUI 러너는 **단일 사용자 로컬 데스크톱 앱**이다. TCP/UDP 포트를 열거나 HTTP/WS 서버를 띄우지 마라. 메인 ↔ 렌더러 통신은 **오로지 Electron IPC 화이트리스트 채널 (R-T3.3)** 만 사용한다. 멀티유저 호스팅, 원격 접근, 브라우저 기반 백엔드 패턴은 비-목표 (R-B5.2).

## 금지

- `gui/**` 에서 다음 모듈/API 호출 금지 (정적 import 든 dynamic import 든):
  - `node:http`, `node:https`, `node:net`, `node:dgram`, `node:tls` — 서버 생성 API 일체 (`createServer`, `Server`, `listen`).
  - `node:cluster`, `node:worker_threads` 안에서의 포트 listen 도 금지.
  - `express`, `koa`, `fastify`, `hapi`, `polka`, `connect`, `restify`, `nest` — HTTP 프레임워크.
  - `ws`, `socket.io`, `socket.io-client`, `engine.io`, `engine.io-client`, `sockjs`, `μWebSockets`, `uws` — WebSocket / realtime.
  - `tcp-port-used`, `portfinder`, `get-port` — 포트 탐지/관리. GUI 가 포트를 알 필요 자체가 없다.
- 다음 패턴 코드 금지 (검색 grep 타깃):
  - `\.listen\s*\(` (HTTP/WS 서버 listen)
  - `createServer\s*\(`
  - `new WebSocket\(` (서버/클라이언트 양쪽 다 — GUI 는 외부 ws 도 안 연다)
  - `fetch\(` / `axios` 로 외부 서버에 메인이 호출 — 단, **윈들리 API 호출은 spawn 된 Playwright 자식 프로세스가** 한다. GUI 자체는 외부 네트워크 호출 X (오프라인에서 카탈로그/히스토리/스케줄 모두 동작해야 함).
  - `BrowserWindow.loadURL` 로 `http://` / `https://` 외부 URL 로드 (R-T15.2 — `file://` 또는 Vite dev 의 `http://localhost:5273` 만).
- 디버깅 목적의 일시 서버 (`node-inspect` 외) 도 커밋 금지. 로컬 디버깅은 Electron 자체 DevTools 사용.
- 새 IPC "라우터" 라이브러리 (`trpc-electron`, `electron-ipc-link` 등) 도입 시 — **그 자체로 포트를 열지 않는지 확인 후** 결정. 의심스러우면 안 쓴다.

## 대신

- 메인 → 렌더러 push: `BrowserWindow.webContents.send('<channel>', payload)` — 화이트리스트 채널만 (R-T3.3).
- 렌더러 → 메인 호출: `ipcRenderer.invoke('<channel>', args)` ↔ 메인 `ipcMain.handle('<channel>', ...)` — 동일 화이트리스트.
- 메인 ↔ Playwright 자식: `child_process.spawn` 의 **표준 stdout/stderr** 만 사용. extra IPC pipe 도 안 쓴다 (R-T2 / R-T17 — exit code + stdout 패턴으로 충분).
- 파일을 통한 비동기 신호: `reports/runs/` 디렉토리 변경 watch (chokidar — INV-2 / R-T7), `<userData>/.gui-run.lock` 파일 존재 여부 — 모두 fs 레벨이라 네트워크 무관.
- launchd 스케줄링은 OS 가 spawn 하므로 GUI 가 listen 할 필요 없음 (INV-8).

## 위반 예시

```ts
// 잘못된 예 1: HTTP 서버 띄우기
// 파일: gui/main/api-server.ts
import http from "node:http";
const server = http.createServer((req, res) => { /* ... */ });
server.listen(3000);                                   // ✗ INV-4 위반

// 잘못된 예 2: Express 미들웨어
// 파일: gui/main/index.ts
import express from "express";                         // ✗ npm install 도 거부
const app = express();
app.get("/atc", handler);
app.listen(0);                                          // ✗ port=0 도 listen 은 listen

// 잘못된 예 3: WebSocket 서버
// 파일: gui/main/live-stream.ts
import { WebSocketServer } from "ws";                  // ✗
const wss = new WebSocketServer({ port: 8080 });

// 잘못된 예 4: socket.io
import { Server } from "socket.io";                    // ✗
const io = new Server(httpServer);

// 잘못된 예 5: 외부 URL 을 BrowserWindow 가 직접 로드 (R-T15.2)
win.loadURL("https://app.windly.cc/something");         // ✗ — Playwright 자식이 열어야 함

// 잘못된 예 6: 메인이 윈들리 API 직접 호출
// 파일: gui/main/preflight.ts
const r = await fetch("https://app-api.windly.cc/health");   // ✗ — GUI 책임 밖
```

## 올바른 예

```ts
// 올바른 예 1: 메인이 IPC 로 렌더러에 push
// 파일: gui/main/run-queue.ts
import { BrowserWindow } from "electron";
import { CHANNELS } from "../shared/channels";
const win = BrowserWindow.getAllWindows()[0];
win?.webContents.send(CHANNELS.ATC_LOG, { runId, line });   // ✓

// 올바른 예 2: 렌더러가 ipcRenderer.invoke (preload 화이트리스트 경유)
// 파일: gui/renderer/src/RunPanel.tsx
const result = await window.atc.runAtc({ atcPath, inputs });  // ✓ preload 가 invoke

// 올바른 예 3: Playwright spawn — stdout 만 사용
// 파일: gui/main/run-queue.ts
import { spawn } from "node:child_process";
const child = spawn("npx", ["playwright", "test", "--project", project, spec]);
child.stdout.on("data", (chunk) => streamToRenderer(chunk));   // ✓ 표준 출력

// 올바른 예 4: 파일시스템 watch 로 신호 받기 (INV-2 read-only)
// 파일: gui/main/run-history.ts
import chokidar from "chokidar";
chokidar.watch("reports/runs/").on("addDir", (path) => indexNewRun(path));  // ✓

// 올바른 예 5: dev 모드에서만 Vite 로컬호스트 로드 (R-T15.2 예외)
if (process.env.NODE_ENV === "development") {
  win.loadURL("http://localhost:5273");                  // ✓ — localhost Vite dev only
} else {
  win.loadFile("gui/renderer/dist/index.html");          // ✓ — 패키징 후 file://
}
```

```bash
# 검증 grep — 위반 패턴 0건이어야 함
rg --type ts --type tsx -n 'createServer|\.listen\(|new WebSocketServer|new WebSocket\(|require\(.express|from .ws.' gui/
# 기대 출력: (없음)

rg -n '"(express|ws|socket\.io|fastify|koa|hapi)"' gui/ package.json
# 기대 출력: (없음 — gui/main package 의존성에도 없어야 함)
```

## 근거 / 출처

- contracts.md **INV-4**: "Zero network ports. No `ws`, `socket.io`, `express`, or `http.createServer` in `gui/`. All renderer↔main communication is Electron IPC via the channel whitelist above."
- requirements.md **R-T15.1**: "WebSocket/HTTP 서버 금지 — `ws`/`socket.io`/`express`/`http.createServer` 등 네트워크 서버 코드가 존재하지 않는다."
- requirements.md **R-T15.2**: "원격 URL 로드 금지 — `file://` 프로토콜 또는 Vite dev 서버의 `localhost`만 사용되며 외부 URL을 BrowserWindow에 직접 로드하지 않는다."
- requirements.md **R-T3 (R-T3.3)**: 메인↔렌더러 전 통신은 preload 의 IPC 화이트리스트 채널만.
- requirements.md **R-B5.2**: 멀티유저 호스팅·CI/CD 는 비-목표 — 따라서 네트워크 서비스 형태로 노출할 이유가 애초에 없다.
- contracts.md "Non-Goals (GUI v1)": "Multi-user hosting / CI/CD" 명시 제외.
- 단일 인스턴스 보장 (INV-6, R-U10) 도 같은 맥락 — 외부 접속을 받지 않는 단일 로컬 사용자 모델.
