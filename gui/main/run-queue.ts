/**
 * Sequential Playwright run queue (main process).
 *
 * Fulfills:
 *   R-B6.1  — multi-select / additional requests enqueue, no parallel spawn
 *   R-B6.2  — Run invocation spawns immediately (no confirm modal in main)
 *   R-B6.6  — exit code + stdout failure-pattern parsing → failed marking
 *   R-B6.8  — Lock-collision skip surfaces as schedule:skipped push + macOS
 *             Notification + persisted recent-skips.json entry so the next
 *             GUI launch shows a banner (R-T5.3 / T21 integration).
 *   R-T2.1  — SpawnArgs assembly: `npx playwright test --project=windly-<domain> <specPath> -- --<k>=<v>`
 *   R-T2.2  — `env` option omitted so parent env (.env via dotenv) inherits unchanged
 *   R-T2.3  — runId NOT generated here; left null in atc:done, T15 fills via fs rescan
 *   R-T3.1  — stdout AND stderr streamed line-buffered via atc:log
 *   R-T3.2  — close event → atc:done with exitCode + runId:null
 *   R-T5.1  — <userData>/.gui-run.lock created (with PID) before spawn; skipped if exists
 *   R-T5.2  — lock deleted on close regardless of exit code
 *   R-T5.3  — skip path fires macOS Notification + persists for next-open banner
 *   R-T6.1  — queue position reflected in RunQueueItem.status='pending' (renderer reads queue)
 *   R-T6.2  — at most 1 active spawn; subsequent requests enqueue only
 *   R-T17.1 — exitCode classification (0 success, !=0 failure) — value passed to renderer
 *   R-T17.2 — stdout buffer scanned post-exit for /\d+ failed/ to detect failure despite code=0
 *
 * Invariants:
 *   INV-1 — buildRunId() NEVER called here
 *   INV-3 — imports: electron, node stdlib, ../shared/ipc, ./preflight, ./userdata (no tests/recoveries/atcs)
 *   INV-4 — no http/ws/socket import
 *   INV-6 — single active spawn enforced by `active !== null` gate + lock file
 *   INV-7 — spawn `env` option intentionally omitted
 *
 * Boundary note (T21 integration):
 *   The `.gui-run.lock` file is a *GUI-process-level* coordination primitive.
 *   It is honored by this queue (here) but NOT by the Playwright process that
 *   launchd spawns directly via its plist `ProgramArguments`. Cross-process
 *   safety against launchd↔GUI parallel runs is layered:
 *     1. Playwright's own `userDataDir` SingletonLock blocks two Chromium
 *        instances on the same persistent profile (the root cause R-T5
 *        was created for; see Tech.ARCH.Drill in reqs-tech.md).
 *     2. This module *also* honors the file lock so a manual Run inside the
 *        GUI cannot collide with the GUI's own in-flight spawn — and so the
 *        skip surface (R-T5.3) has a path to fire. A scheduled run that
 *        sneaks past Playwright's lock (rare) would only ever cause a hung
 *        chromium launch, not a data race; the GUI surfaces its own skip
 *        record for the next attempt.
 *   The lock PATH itself routes through `userdata.getLockPath()` so the
 *   single source of truth (T16) is preserved.
 */

import { spawn } from 'node:child_process';
import type { ChildProcessByStdio } from 'node:child_process';
import type { Readable } from 'node:stream';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { Notification, type BrowserWindow } from 'electron';
import {
  PUSH_CHANNELS,
  type AtcDoneEvent,
  type AtcLogEvent,
  type AtcRunArgs,
  type PreRunError,
  type RunQueueItem,
  type ScheduleSkippedEvent,
} from '../shared/ipc';
import { runPreflight } from './preflight';
import { getLockPath, recordSkip } from './userdata';
import { loadATC } from '../../lib/atc-loader';

// Matches Playwright's terminal summary line, e.g. "  3 failed" / "1 failed"
// AND generic "Error:" leadings that escape exit code = 0 paths.
const FAILURE_PATTERN = /\b\d+\s+failed\b/i;
const RUN_ID_PATTERN = /^\[atc-wrapper\]\s+runId=(result_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}(?:_\d+)?)\s*$/i;

type SpawnedChild = ChildProcessByStdio<null, Readable, Readable>;

interface ActiveProcess {
  queueId: string;
  child: SpawnedChild;
  stdoutBuffer: string;
  stderrBuffer: string;
  // Aggregated tail used for post-close failure-pattern parsing (R-T17.2).
  // Only the last ~64KB to avoid memory blow-up on long runs.
  combinedTail: string;
  lockPath: string;
  runId: string | null;
  /** 같은 batch 안에서만 outputs → from:previous 자동 주입이 동작. */
  batchSessionId?: string;
}

export interface EnqueueResult {
  ok: true;
  queueId: string;
}

export interface EnqueueFailure {
  ok: false;
  errors: PreRunError[];
}

export type EnqueueOutcome = EnqueueResult | EnqueueFailure;

/**
 * Queue holding pending + active runs. Sequential by construction:
 * `active` is null OR one item; new requests append to `pending`.
 */
const pending: RunQueueItem[] = [];
let active: ActiveProcess | null = null;
let activeItem: RunQueueItem | null = null;
let queueIdCounter = 0;

/**
 * Batch outputs pool — sessionId 별로 같은 batch 안의 앞 TC 들이 emit 한 output
 * 값을 누적. 같은 sessionId 를 가진 뒤 TC 가 startNext 진입 시 자기 ATC YAML 의
 * `inputs.<name>.from === 'previous'` 자리에 값을 자동 주입 (사용자가 큐 뷰에서
 * 이미 채워둔 값이 있으면 그 값이 우선).
 *
 * 라이프사이클:
 *   - 첫 enqueueRun(batchSessionId=X) 호출 시 빈 객체로 초기화 (아직 outputs 없음)
 *   - 한 TC 가 close 되면 reports/runs/<runId>/<runId>.json 를 파싱해 outputs 머지
 *   - 더 이상 같은 sessionId 의 pending 이 없을 때 (즉 batch 종료) 자동 GC
 *   - 단일 실행 / 스케줄러 spawn 등 batchSessionId 미설정인 경우는 아예 사용 X
 */
const batchOutputs = new Map<string, Record<string, string>>();

/**
 * queueId → 그 TC 의 `inputs.<name>.from === 'previous'` 키 목록.
 * enqueueRun 에서 한 번 계산 → startNext 가 spawn 직전 자동 주입에 사용.
 * RunQueueItem 자체에 노출하지 않는 이유: IPC 표면을 작게 유지 + 렌더러는 알 필요 없음.
 */
const fromPreviousByQueueId = new Map<string, string[]>();

/**
 * 같은 batchSessionId 의 pending + active 가 더 있는지 확인.
 * 모두 끝났으면 batchOutputs 항목을 비워 메모리 누수 방지.
 */
function gcBatchIfDone(sessionId: string): void {
  if (active?.batchSessionId === sessionId) return;
  for (const p of pending) {
    if (p.batchSessionId === sessionId) return;
  }
  batchOutputs.delete(sessionId);
}

let targetWindow: BrowserWindow | null = null;

/**
 * Wire the queue to the renderer window. Called once from `index.ts` after
 * window creation. Subsequent calls overwrite (e.g. on macOS dock re-activate).
 */
export function bindWindow(win: BrowserWindow): void {
  targetWindow = win;
}

function nextQueueId(): string {
  queueIdCounter += 1;
  return `q${queueIdCounter}`;
}

/**
 * Resolve the absolute lock path via the userdata single-source-of-truth
 * (T16). userData may not exist yet on first launch — ensure the parent dir
 * before any lock IO so `fs.writeFileSync` does not ENOENT.
 */
function lockPath(): string {
  const p = getLockPath();
  const dir = path.dirname(p);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return p;
}

function sendLog(queueId: string, line: string): void {
  if (!targetWindow || targetWindow.isDestroyed()) return;
  const payload: AtcLogEvent = { queueId, line };
  targetWindow.webContents.send(PUSH_CHANNELS.atcLog, payload);
}

type DoneObserver = (event: AtcDoneEvent) => void;
const doneObservers: DoneObserver[] = [];

/**
 * Subscribe to atc:done events in-process (main side). Used by T18 to fire a
 * macOS notification when a detached run completes after the GUI window closed.
 * Returns an unsubscribe function.
 */
export function onDone(observer: DoneObserver): () => void {
  doneObservers.push(observer);
  return (): void => {
    const idx = doneObservers.indexOf(observer);
    if (idx >= 0) doneObservers.splice(idx, 1);
  };
}

function sendDone(queueId: string, exitCode: number, runId: string | null): void {
  const payload: AtcDoneEvent = { queueId, exitCode, runId };
  if (targetWindow && !targetWindow.isDestroyed()) {
    targetWindow.webContents.send(PUSH_CHANNELS.atcDone, payload);
  }
  for (const observer of doneObservers) {
    try {
      observer(payload);
    } catch {
      // Observer failures must not poison queue progression.
    }
  }
}

/**
 * Surface a lock-collision skip to every channel R-T5.3 / R-B6.8 requires:
 *
 *   1. `schedule:skipped` push to the renderer (banner UI in the active window).
 *   2. macOS native `Notification` (visible even when the window is minimized
 *      or focus is elsewhere — the only path that reaches the user when the
 *      GUI is just sitting in the dock).
 *   3. Persist to `<userData>/recent-skips.json` so the NEXT GUI launch can
 *      replay the banner — covers the case where no window is currently
 *      bound (e.g. detached-run completion path).
 *
 * `scheduleId` is the empty string when the skipped attempt was a manual
 * GUI Run (rare); the contract leaves the field as a free-form string so we
 * keep that flexibility for future wrapper-script scenarios.
 */
function emitSkip(item: RunQueueItem): void {
  // Derive an ATC title that the user will recognise without leaking the
  // full filesystem path — basename minus the `.atc.yml` suffix is enough.
  const base = path.basename(item.atcPath);
  const title = base.replace(/\.atc\.yml$/, '');
  const event: ScheduleSkippedEvent = {
    scheduleId: '',
    atcTitle: title,
    skippedAt: new Date().toISOString(),
  };

  // 1) Push to renderer if a window is bound and alive.
  if (targetWindow && !targetWindow.isDestroyed()) {
    targetWindow.webContents.send(PUSH_CHANNELS.scheduleSkipped, event);
  }

  // 2) macOS Notification — only when supported (Electron returns false on
  // platforms without native notification support; INV-8 keeps us on macOS
  // so this is effectively always true, but the guard keeps the code honest).
  if (Notification.isSupported()) {
    try {
      const n = new Notification({
        title: 'ATC 실행 스킵',
        body: `다른 실행이 이미 진행 중이라 "${title}" 실행이 스킵되었습니다.`,
      });
      n.show();
    } catch {
      // Notification construction can throw on some macOS edge cases
      // (e.g. notification daemon unavailable). Non-fatal — the persisted
      // record below and the renderer push still surface the skip.
    }
  }

  // 3) Persist so the next GUI launch can replay this as a banner.
  try {
    recordSkip(event);
  } catch {
    // Best-effort: persistence failures should not block queue progression.
  }
}

/**
 * Line-buffered stream reader. Holds a partial-line tail across chunks so
 * mid-chunk newlines never produce truncated log lines (R-T3.1).
 */
function makeLineReader(onLine: (line: string) => void): (chunk: Buffer) => string {
  let tail = '';
  return (chunk: Buffer): string => {
    const text = tail + chunk.toString('utf8');
    const parts = text.split(/\r?\n/);
    tail = parts.pop() ?? '';
    for (const line of parts) {
      onLine(line);
    }
    return tail;
  };
}

/**
 * Build the argv array for `node scripts/atc.mjs <atcPath> [--key=val ...]`.
 *
 * Changed from direct `npx playwright test ...` so inputs flow through the
 * project-level wrapper (scripts/atc.mjs) which converts each `--<key>=<value>`
 * into `ATC_INPUT_<KEY>=<value>` env before spawning Playwright. spec.ts files
 * already read `process.env.ATC_INPUT_*`, so this restores D8 priority
 * (CLI > env > fixture > schema-example). Passing inputs as Playwright args
 * directly was broken — Playwright treated them as test path patterns.
 *
 * INV-7 preserved: gui/ still spawns with `env: undefined` (inherited parent
 * env); the wrapper alone constructs the ATC_INPUT_* overrides. Domain +
 * specPath are still derived from the atcPath, so the buildArgs signature
 * stays in sync with CatalogItem.
 */
/**
 * Resolve the repo root by walking up from __dirname looking for package.json.
 * Same pattern as preflight.ts / schedule-manager.ts. Layout-agnostic so it
 * survives both compiled emit (`gui/dist/gui/main/run-queue.js`, 4 ups) and
 * a direct ts-node-like layout (`gui/main/run-queue.ts`, 2 ups).
 */
function resolveRepoRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(__dirname, '..', '..');
}

function buildArgs(args: AtcRunArgs): string[] {
  // Absolute path so the spawn doesn't depend on process.cwd() — Electron's
  // cwd is normally the repo root when launched via `npm run gui`, but
  // packaged or detached launches may differ.
  const wrapper = path.join(resolveRepoRoot(), 'scripts', 'atc.mjs');
  const out: string[] = [wrapper, args.atcPath];
  for (const [key, val] of Object.entries(args.inputs)) {
    out.push(`--${key}=${val}`);
  }
  if (args.headless === true) {
    // wrapper-level flag; wrapper converts it to `WINDLY_HEADLESS=1` in the
    // *child* env (its own spawn), which lib/test-fixture.ts reads. R-T2.2 /
    // INV-7 untouched here — this spawn still omits its own `env` option.
    out.push('--headless');
  }
  return out;
}

function maybeCaptureRunId(proc: ActiveProcess, line: string): boolean {
  const match = line.match(RUN_ID_PATTERN);
  if (!match) return false;
  proc.runId = match[1];
  return true;
}

/**
 * ATC YAML 의 `inputs.<name>.from === 'previous'` 키 목록을 뽑아낸다. 실패는
 * 항상 빈 배열 — 자동 주입은 best-effort, 실패해도 사용자 입력 그대로 spawn.
 */
function extractFromPreviousKeys(atcAbsPath: string): string[] {
  try {
    const atc = loadATC(atcAbsPath);
    const out: string[] = [];
    for (const [name, spec] of Object.entries(atc.inputs)) {
      if (spec.from === 'previous') out.push(name);
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Enqueue a run. Returns `{ok:false}` only when preflight fails — in which
 * case nothing is enqueued and no spawn happens (R-U3.1 gate).
 */
export async function enqueueRun(args: AtcRunArgs): Promise<EnqueueOutcome> {
  const pre = await runPreflight();
  if (!pre.ok) {
    return { ok: false, errors: pre.errors };
  }

  const queueId = nextQueueId();
  const item: RunQueueItem = {
    queueId,
    atcPath: args.atcPath,
    domain: args.domain,
    specPath: args.specPath,
    inputs: { ...args.inputs },
    headless: args.headless === true,
    status: 'pending',
    skipReason: null,
    runId: null,
    pid: null,
    batchSessionId: args.batchSessionId,
  };
  pending.push(item);

  if (args.batchSessionId !== undefined) {
    // ATC YAML 에서 from:previous 키들을 미리 뽑아 둔다. startNext 가 spawn 직전 주입.
    const absPath = path.isAbsolute(args.atcPath)
      ? args.atcPath
      : path.join(resolveRepoRoot(), args.atcPath);
    const keys = extractFromPreviousKeys(absPath);
    if (keys.length > 0) fromPreviousByQueueId.set(queueId, keys);
    // 새 batch 의 첫 entry 면 pool 초기화 (이전 batch 잔존 방지).
    if (!batchOutputs.has(args.batchSessionId)) {
      batchOutputs.set(args.batchSessionId, {});
    }
  }

  // Kick the pump: if idle, start immediately; otherwise it waits.
  startNext();
  return { ok: true, queueId };
}

/**
 * Start the next pending run if no spawn is currently active.
 * Sequential gate that enforces R-T6.2 (no parallel spawn) and INV-6.
 */
function startNext(): void {
  if (active !== null) return; // already running — R-T6.2
  const next = pending.shift();
  if (!next) return;

  // R-T5.1 — lock file check + create (PID written after spawn).
  const lock = lockPath();
  if (existsSync(lock)) {
    next.status = 'skipped';
    next.skipReason = 'lock';
    // R-B6.8 / R-T5.3 — surface skip to renderer + macOS notification + persist
    // for next-open banner. emitSkip handles all three surfaces.
    emitSkip(next);
    // Surface skip via done event so renderer can dismiss the pending row.
    // exitCode = -1 by convention signals "did not run".
    sendDone(next.queueId, -1, null);
    // Keep pumping in case more items are queued (rare; only happens if
    // a stale lock survived a crash).
    startNext();
    return;
  }

  // Reserve lock with placeholder PID; replace once spawn yields a real PID.
  try {
    writeFileSync(lock, String(process.pid), { encoding: 'utf8', flag: 'wx' });
  } catch {
    // Race: someone else grabbed the lock between exists and write.
    // R-B6.8 / R-T5.3 — same surface set as the exists-check path above.
    next.status = 'skipped';
    next.skipReason = 'lock';
    emitSkip(next);
    sendDone(next.queueId, -1, null);
    startNext();
    return;
  }

  // outputs → inputs.from='previous' 자동 주입 (사용자 입력값이 이김).
  // batchSessionId 가 있고, 그 batch 안에 앞 TC 가 emit 한 output 이 있으면
  // 빈 칸인 from:previous input 에만 채운다.
  if (next.batchSessionId !== undefined) {
    const pool = batchOutputs.get(next.batchSessionId) ?? {};
    const keys = fromPreviousByQueueId.get(next.queueId) ?? [];
    for (const k of keys) {
      const existing = next.inputs[k];
      const hasUserValue = typeof existing === 'string' && existing.length > 0;
      if (hasUserValue) continue;
      const fromPool = pool[k];
      if (typeof fromPool === 'string' && fromPool.length > 0) {
        next.inputs[k] = fromPool;
        process.stderr.write(
          `[run-queue] inject from:previous ${k}=${fromPool} (batch=${next.batchSessionId})\n`,
        );
      }
    }
  }

  // Diagnostic — always echo to main stderr so user can see in the terminal
  // running `npm run gui` what command we're spawning + cwd. webContents.send
  // can drop if the renderer disconnects; this guarantees terminal visibility.
  const spawnArgs = buildArgs(next);
  const repoRoot = resolveRepoRoot();
  process.stderr.write(`[run-queue] spawn node ${spawnArgs.join(' ')} (cwd=${repoRoot})\n`);

  let child: SpawnedChild;
  try {
    // R-T2.2 / INV-7 — `env` deliberately omitted (parent env inherited).
    // The wrapper (scripts/atc.mjs) constructs ATC_INPUT_* env from CLI flags
    // before exec'ing playwright, so D8 input priority works end-to-end.
    // cwd pinned to repoRoot so the wrapper's relative specPath (tests/...)
    // and Playwright's project config resolve correctly regardless of how
    // Electron was launched.
    child = spawn('node', spawnArgs, {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });
  } catch (err) {
    safeRemoveLock(lock);
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[run-queue] spawn error: ${message}\n`);
    sendLog(next.queueId, `[spawn error] ${message}`);
    sendDone(next.queueId, -1, null);
    startNext();
    return;
  }

  // Refresh lock with real child PID for future inspection.
  try {
    writeFileSync(lock, String(child.pid ?? process.pid), { encoding: 'utf8' });
  } catch {
    // Non-fatal — initial lock already holds parent PID.
  }

  next.status = 'running';
  next.pid = child.pid ?? null;

  const proc: ActiveProcess = {
    queueId: next.queueId,
    child,
    stdoutBuffer: '',
    stderrBuffer: '',
    combinedTail: '',
    lockPath: lock,
    runId: null,
    batchSessionId: next.batchSessionId,
  };
  active = proc;
  activeItem = next;

  const appendTail = (line: string): void => {
    // Keep ~64KB tail for post-exit failure-pattern scan (R-T17.2).
    proc.combinedTail =
      proc.combinedTail.length > 65_536
        ? `${proc.combinedTail.slice(-32_768)}\n${line}`
        : `${proc.combinedTail}\n${line}`;
  };

  // Diagnostic mirror — also write child output to main stderr so the user
  // sees full Playwright output in the `npm run gui` terminal even when the
  // renderer is closed or atc:log push silently drops.
  const stdoutReader = makeLineReader((line: string) => {
    if (maybeCaptureRunId(proc, line)) return;
    process.stderr.write(`[atc:stdout] ${line}\n`);
    sendLog(proc.queueId, line);
    appendTail(line);
  });
  const stderrReader = makeLineReader((line: string) => {
    if (maybeCaptureRunId(proc, line)) return;
    process.stderr.write(`[atc:stderr] ${line}\n`);
    sendLog(proc.queueId, line);
    appendTail(line);
  });

  child.stdout.on('data', (chunk: Buffer) => {
    proc.stdoutBuffer = stdoutReader(chunk);
  });
  child.stderr.on('data', (chunk: Buffer) => {
    proc.stderrBuffer = stderrReader(chunk);
  });

  child.on('error', (err: Error) => {
    process.stderr.write(`[run-queue] child error: ${err.message}\n`);
    sendLog(proc.queueId, `[process error] ${err.message}`);
  });

  child.on('close', (code: number | null, signal: NodeJS.Signals | null) => {
    // Flush any trailing partial line that did not end with newline.
    if (proc.stdoutBuffer.length > 0) {
      sendLog(proc.queueId, proc.stdoutBuffer);
      appendTail(proc.stdoutBuffer);
      proc.stdoutBuffer = '';
    }
    if (proc.stderrBuffer.length > 0) {
      sendLog(proc.queueId, proc.stderrBuffer);
      appendTail(proc.stderrBuffer);
      proc.stderrBuffer = '';
    }

    // R-T5.2 — delete lock regardless of exit code.
    safeRemoveLock(proc.lockPath);

    // R-T17.1 / R-T17.2 — classify outcome.
    // exit code: null when killed by signal; treat that as failure.
    let exitCode: number;
    if (typeof code === 'number') {
      exitCode = code;
    } else if (signal !== null) {
      exitCode = -2; // killed by signal
    } else {
      exitCode = -3; // unknown
    }
    // If exitCode === 0 but stdout tail shows "<n> failed", override to 1.
    if (exitCode === 0 && FAILURE_PATTERN.test(proc.combinedTail)) {
      exitCode = 1;
    }

    if (activeItem) {
      activeItem.status = 'done';
      activeItem.pid = null;
    }

    const finishedSessionId = proc.batchSessionId;
    const runId = proc.runId;

    // 같은 batch 안에서 outputs 수확. 성공 / 실패 무관하게 가능한 만큼 파싱
    // (실패한 TC 도 부분 emit 했을 수 있음 — runner 가 모든 return path 에서
    //  outputs 를 채우도록 보장).
    if (
      finishedSessionId !== undefined &&
      runId !== null &&
      exitCode >= 0
    ) {
      try {
        const reportPath = path.join(
          resolveRepoRoot(),
          'reports',
          'runs',
          runId,
          `${runId}.json`,
        );
        if (existsSync(reportPath)) {
          const harvested = harvestOutputsFromReport(reportPath);
          if (Object.keys(harvested).length > 0) {
            const pool = batchOutputs.get(finishedSessionId) ?? {};
            for (const [k, v] of Object.entries(harvested)) pool[k] = v;
            batchOutputs.set(finishedSessionId, pool);
            process.stderr.write(
              `[run-queue] harvest outputs (batch=${finishedSessionId}): ${JSON.stringify(harvested)}\n`,
            );
          }
        }
      } catch (err) {
        // Best-effort: 파싱 실패는 다음 TC 의 from:previous 가 비는 효과만 있음
        const message = err instanceof Error ? err.message : String(err);
        process.stderr.write(`[run-queue] harvest outputs error: ${message}\n`);
      }
    }
    // 이 queueId 의 from:previous 메타는 더 이상 필요 없음.
    fromPreviousByQueueId.delete(proc.queueId);

    active = null;
    activeItem = null;
    sendDone(proc.queueId, exitCode, exitCode >= 0 ? runId : null);

    // batch 종료 GC: 같은 sessionId 의 pending 이 더 없으면 pool 정리.
    if (finishedSessionId !== undefined) gcBatchIfDone(finishedSessionId);

    // Pump the next pending run (R-B6.1 sequential progression).
    startNext();
  });
}

/**
 * `<runId>.json` 에서 첫 ATC 의 outputs 만 꺼낸다. 한 spawn = 1 ATC 가 기본
 * 패턴이라 1개 ATC 만 있으면 충분 — 다중 ATC 가 한 spawn 안에 들어있는 경우는
 * (atc-multi.mjs / composes) GUI 단일 큐 entry 와 의미가 분리되어 있어 후순위.
 *
 * outputs 값은 string | number | boolean | null 이지만 ATC_INPUT_* env 로
 * stringify 해서 넘기므로 여기서도 String() 통일 (run-queue 의 in-memory pool
 * 은 Record<string, string>).
 */
function harvestOutputsFromReport(reportPath: string): Record<string, string> {
  const raw = readFileSync(reportPath, 'utf8');
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || parsed === null) return {};
  const root = parsed as Record<string, unknown>;
  const atcs = root.atcs;
  if (!Array.isArray(atcs) || atcs.length === 0) return {};
  const out: Record<string, string> = {};
  for (const atc of atcs) {
    if (typeof atc !== 'object' || atc === null) continue;
    const result = (atc as Record<string, unknown>).result;
    if (typeof result !== 'object' || result === null) continue;
    const outputs = (result as Record<string, unknown>).outputs;
    if (typeof outputs !== 'object' || outputs === null) continue;
    for (const [k, v] of Object.entries(outputs)) {
      if (typeof k !== 'string' || k.length === 0) continue;
      if (v === null || v === undefined) continue;
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        out[k] = String(v);
      }
    }
  }
  return out;
}

function safeRemoveLock(p: string): void {
  try {
    if (existsSync(p)) unlinkSync(p);
  } catch {
    // Best-effort: a stale lock will be detected at next start and skipped.
  }
}

/**
 * True iff a Playwright spawn is currently running. Used by T18 (close-with-active-run)
 * to decide whether to show the confirm dialog. Pending-only queue items do NOT count
 * as "active" — only the in-flight child process does.
 *
 * Fulfills: R-B6.3 surface, R-T18.1 surface.
 */
export function isActive(): boolean {
  return active !== null;
}

/**
 * Snapshot of the active queueId (for surfacing in the close-confirm dialog).
 * Returns null when nothing is running.
 */
export function activeQueueId(): string | null {
  return active?.queueId ?? null;
}

/**
 * T18 — SIGTERM the active spawn (if any). Resolves once the close event has
 * been processed (lock removed, atc:done sent). Used by the close-with-active-run
 * kill flow before `app.exit()`.
 *
 * Fulfills R-T18.1.
 */
export function cancelActive(): Promise<void> {
  if (active === null) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const proc = active;
    if (proc === null) {
      resolve();
      return;
    }
    proc.child.once('close', () => {
      resolve();
    });
    try {
      proc.child.kill('SIGTERM');
    } catch {
      // Already dead; close handler may still fire or have fired.
      resolve();
    }
  });
}

/**
 * T18 — detach the active spawn so it survives window/app shutdown.
 * Implementation: call child.unref() so the Node event loop does not wait on it.
 * Returns the runId-discoverable queueId so the caller can wire a completion notification.
 *
 * Note: spawn() was started without `detached:true` (so it would inherit cwd cleanly),
 * but unref() alone is sufficient for the Electron process to exit while the child
 * continues — Playwright's child writes its own files; we just stop awaiting it.
 *
 * Fulfills R-T18.2.
 */
export function detachActive(): string | null {
  if (active === null) return null;
  try {
    active.child.unref();
  } catch {
    // unref failures are non-fatal — the child still runs.
  }
  return active.queueId;
}

/**
 * Cancel a run by queueId. Active → SIGTERM; pending → drop from queue.
 * (R-T18.1 / atc:kill channel.)
 */
export function killRun(queueId: string): void {
  if (active && active.queueId === queueId) {
    // SIGTERM lets Playwright clean up; close handler removes lock + pumps next.
    try {
      active.child.kill('SIGTERM');
    } catch {
      // Already dead — close event will fire (or has fired).
    }
    return;
  }
  const idx = pending.findIndex((it) => it.queueId === queueId);
  if (idx >= 0) {
    pending.splice(idx, 1);
  }
}

/**
 * Test/diagnostic snapshot of the queue state. Not exported via IPC.
 */
export function snapshot(): { active: RunQueueItem | null; pending: RunQueueItem[] } {
  return {
    active: activeItem ? { ...activeItem } : null,
    pending: pending.map((it) => ({ ...it })),
  };
}
