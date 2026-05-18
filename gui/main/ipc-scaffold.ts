/**
 * IPC handler registration scaffold.
 *
 * Each invoke/send channel listed in contracts.md §IPC Channels gets a stub
 * binding here so the renderer's `window.atcAPI` is callable from day one.
 * Downstream tasks replace each stub body with real logic:
 *   T5  → catalog:list / catalog:reload  (R-B2.1, R-B6.7)            [SHIPPED]
 *   T7  → atc:run / atc:kill              (R-T2, R-T3, R-T6, R-T17)  [SHIPPED]
 *   T15 → run:history / run:report / run:open  (R-T7, R-T13, R-T18.3)
 *   T17 → schedule:create / schedule:delete / schedule:list  (R-T4, R-T8.1)
 *
 * R-B4.1 (T24): every invoke handler is wrapped by `safeHandler()` which
 * routes synchronous throws + promise rejections through `error-bus` so a
 * single misbehaving handler cannot terminate the main process. Errors are
 * still surfaced to the renderer (the IPC promise rejects with a clean
 * Error.message), but the main process stays alive.
 *
 * Fire-and-forget `ipcMain.on(...)` listeners (atc:kill, run:open) are
 * wrapped in try/catch so a malformed payload from the renderer cannot crash
 * the main process either.
 *
 * INV-3 (gui→lib only): this file imports nothing from tests/recoveries/atcs.
 * INV-4: every channel is Electron IPC — no HTTP/WS fallback path.
 */

import { ipcMain, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron';
import {
  INVOKE_CHANNELS,
  SEND_CHANNELS,
  type AtcKillArgs,
  type AtcRunArgs,
  type AtcRunResult,
  type PreRunError,
  type BatchReportOpenArgs,
  type ReportMergeArgs,
  type ReportMergeResult,
  type RunOpenArgs,
  type RunReportArgs,
  type RunReportResult,
  type ScheduleCreateInput,
  type ScheduleDeleteArgs,
  type ScheduleUpdateArgs,
  type ScreenshotReadArgs,
  type ScreenshotReadResult,
} from '../shared/ipc';
import { enqueueRun, killRun } from './run-queue';
import {
  getHistorySnapshot,
  readRunReport,
  revealRunInFinder,
} from './run-history';
import {
  createSchedule,
  deleteSchedule,
  listSchedules,
  updateSchedule,
} from './schedule-manager';
import { listScheduleRuns } from './schedule-runs';
import { getCatalogSnapshot, reloadCatalog } from './catalog';
import { mergeReports, openBatchFile } from './report-merge';
import { readScreenshot } from './screenshot';
import { reportError } from './error-bus';

const NOT_IMPLEMENTED = (channel: string, owner: string): Error =>
  new Error(`NOT_IMPLEMENTED: ${channel} — owned by ${owner} (see plan.json)`);

/**
 * R-B4.1 — Wrap an invoke handler so synchronous throws AND promise
 * rejections are routed through `error-bus.reportError(scope, err)` before
 * being re-raised to the renderer. The renderer's `.catch()` still sees a
 * clean `Error.message` (Electron auto-serializes Error.message across the
 * bridge), but the main process logs the original stack via the bus and the
 * `app:uncaught-error` push so the user sees a transient ErrorToast.
 *
 * Returning a structured `{ ok: false, error: ... }` instead would require
 * widening every channel's contract; instead we rethrow a sanitized Error so
 * the existing renderer `try { await window.atcAPI.foo() } catch (e) { ... }`
 * patterns continue to work. The `enqueueRun` path is already structured
 * (AtcRunResult union); other handlers reject on failure as before.
 */
function safeInvoke(
  channel: string,
  handler: (event: IpcMainInvokeEvent, payload: unknown) => Promise<unknown>,
): (event: IpcMainInvokeEvent, payload: unknown) => Promise<unknown> {
  return async (event, payload): Promise<unknown> => {
    try {
      return await handler(event, payload);
    } catch (err: unknown) {
      reportError(`ipc:${channel}`, err);
      // Re-raise so the renderer's invoke promise rejects with a clean message.
      // We construct a fresh Error if the original was not an Error instance so
      // structured-clone over the IPC bridge produces a sensible string.
      if (err instanceof Error) throw err;
      throw new Error(typeof err === 'string' ? err : `IPC handler failed: ${channel}`);
    }
  };
}

/**
 * Register every invoke/send channel referenced in contracts.md.
 * Idempotent: removes any pre-existing handler before re-registering so
 * tests / hot-reload can invoke this multiple times without duplicate-handler errors.
 */
export function registerIpcScaffold(): void {
  // ----- invoke (renderer → main, awaited) -----
  bindInvoke(INVOKE_CHANNELS.catalogList, 'T5', async () => {
    return getCatalogSnapshot();
  });
  bindInvoke(INVOKE_CHANNELS.catalogReload, 'T5', async () => {
    return reloadCatalog();
  });
  bindInvoke(INVOKE_CHANNELS.atcRun, 'T7', async (_event, payload) => {
    const args = payload as AtcRunArgs;
    const result = await enqueueRun(args);
    // Narrow to AtcRunResult union (success → {ok,queueId}, failure → {ok,errors}).
    const out: AtcRunResult = result.ok
      ? { ok: true, queueId: result.queueId }
      : { ok: false, errors: result.errors satisfies PreRunError[] };
    return out;
  });
  bindInvoke(INVOKE_CHANNELS.scheduleCreate, 'T17', async (_event, payload) => {
    const args = payload as ScheduleCreateInput;
    return createSchedule(args);
  });
  bindInvoke(INVOKE_CHANNELS.scheduleDelete, 'T17', async (_event, payload) => {
    const args = payload as ScheduleDeleteArgs;
    await deleteSchedule(args.id);
  });
  bindInvoke(INVOKE_CHANNELS.scheduleUpdate, 'T17', async (_event, payload) => {
    const args = payload as ScheduleUpdateArgs;
    return updateSchedule(args.id, args.changes);
  });
  bindInvoke(INVOKE_CHANNELS.scheduleList, 'T17', async () => {
    return listSchedules();
  });
  bindInvoke(INVOKE_CHANNELS.scheduleRuns, 'schedule-runs', async () => {
    return listScheduleRuns();
  });
  bindInvoke(INVOKE_CHANNELS.runHistory, 'T15', async () => {
    return getHistorySnapshot();
  });
  bindInvoke(INVOKE_CHANNELS.runReport, 'T15', async (_event, payload) => {
    const args = payload as RunReportArgs;
    const out: RunReportResult = readRunReport(args.runId);
    return out;
  });
  bindInvoke(INVOKE_CHANNELS.reportMerge, 'report-merge', async (_event, payload) => {
    const args = payload as ReportMergeArgs;
    const out: ReportMergeResult = mergeReports(args);
    return out;
  });
  // R-U7.1 / R-U7.2 — sandboxed PNG read for in-card thumbnails + lightbox.
  bindInvoke(INVOKE_CHANNELS.screenshotRead, 'T11', async (_event, payload) => {
    const args = payload as ScreenshotReadArgs;
    const out: ScreenshotReadResult = await readScreenshot(args.absPath);
    return out;
  });

  // ----- send (renderer → main, fire-and-forget) -----
  // atc:kill — T7 owns this; wired to run-queue.killRun.
  // R-B4.1 — safeOn() catches any throw so a stray IPC payload cannot crash main.
  safeOn(SEND_CHANNELS.atcKill, (_event, payload: unknown) => {
    const args = payload as AtcKillArgs | null | undefined;
    if (args && typeof args.queueId === 'string') {
      killRun(args.queueId);
    }
  });
  // run:open — T15 basic deep-link surface (opens reports/runs/<runId>/ in Finder).
  // T18 layers renderer-side "activate Report tab" UX on top of this same channel.
  safeOn(SEND_CHANNELS.runOpen, (_event, payload: unknown) => {
    const args = payload as RunOpenArgs | null | undefined;
    if (!args || typeof args.runId !== 'string') return;
    void revealRunInFinder(args.runId).catch((err: unknown) => {
      // Best-effort: a malformed runId or missing directory is non-fatal for a fire-and-forget
      // channel. We still log via the error bus so dev/QA can see what was attempted (R-B4.1).
      reportError('ipc:run:open', err);
    });
  });
  // batch-report:open — 묶음 통합 .md 파일을 OS 기본 앱으로 직접 연다.
  safeOn(SEND_CHANNELS.batchReportOpen, (_event, payload: unknown) => {
    const args = payload as BatchReportOpenArgs | null | undefined;
    if (!args || typeof args.batchId !== 'string') return;
    void openBatchFile(args.batchId).catch((err: unknown) => {
      reportError('ipc:batch-report:open', err);
    });
  });
}

function bindInvoke(
  channel: string,
  owner: string,
  handler: (event: IpcMainInvokeEvent, payload: unknown) => Promise<unknown>,
): void {
  ipcMain.removeHandler(channel);
  // R-B4.1 — every handler is wrapped by safeInvoke so a throw in (e.g.) a
  // catalog reload triggered via IPC cannot terminate the main process.
  ipcMain.handle(channel, safeInvoke(channel, handler));
  void owner; // owner string is captured in NOT_IMPLEMENTED message; reference here keeps it tied to the binding for future diagnostics.
}

/**
 * Wrap a fire-and-forget IPC listener so a thrown error inside the handler
 * (or a malformed payload that triggers a property access throw) is reported
 * via the error-bus rather than propagating up as an unhandled exception
 * (which Electron treats as fatal for main-process listeners).
 */
function safeOn(
  channel: string,
  listener: (event: IpcMainEvent, payload: unknown) => void,
): void {
  ipcMain.removeAllListeners(channel);
  ipcMain.on(channel, (event, payload) => {
    try {
      listener(event, payload);
    } catch (err: unknown) {
      reportError(`ipc:${channel}`, err);
    }
  });
}

function bindSend(channel: string, owner: string): void {
  // R-B4.1 — same hardening as safeOn for unmanaged stubs.
  safeOn(channel, () => {
    // Stub: downstream task (`owner`) will replace this listener with a real handler.
    // We intentionally swallow the message — a fire-and-forget channel should not throw
    // an unhandled error in the main process before its owner ships.
    void owner;
  });
}
