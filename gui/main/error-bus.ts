/**
 * Main process error bus.
 *
 * Fulfills:
 *   R-B4.1 — daily-use crash hardening: every subsystem (catalog / history /
 *            schedule / IPC handler) routes failures through `reportError()`
 *            so an exception in one subsystem cannot bring the Electron app
 *            down. The bus logs the error with a scope tag and, when a
 *            renderer window is bound, pushes `app:uncaught-error` so the
 *            renderer's ErrorToast can surface a transient banner.
 *
 * Invariants:
 *   INV-3 — imports limited to electron / node stdlib / ../shared/ipc.
 *           Never imports tests/, recoveries/, atcs/, or lib/ runtime code.
 *   INV-4 — no network port; renderer notification is pushed via Electron IPC
 *           on the existing whitelisted `app:uncaught-error` channel.
 *   INV-7 — does NOT read .env or expose environment variables to the
 *           renderer; the error payload contains only scope + message.
 *   C1   — strict TS, no `any`.
 *
 * Contract notes:
 *   - `reportError(scope, err)` NEVER throws (it's the last line of defense).
 *   - When the bound window has not been created yet (early-startup failures
 *     during `app.whenReady().then(...)`), the error is logged to stderr but
 *     not pushed; the toast still appears for any subsequent failures once
 *     the window is bound.
 *   - The bus is a pure logger + relay; it does NOT decide whether the app
 *     should quit. Callers (e.g., individual init() wrappers) keep the
 *     "swallow + continue" responsibility so a single subsystem can fail
 *     while others stay healthy (per task T24 charter).
 */

import type { BrowserWindow } from 'electron';
import { PUSH_CHANNELS, type AppUncaughtErrorEvent } from '../shared/ipc';

let boundWindow: BrowserWindow | null = null;

/**
 * Bind the main BrowserWindow so future `reportError()` calls can push the
 * `app:uncaught-error` event to the renderer. Calling with a fresh window
 * after a previous window was destroyed simply swaps the reference.
 */
export function bindErrorBusWindow(window: BrowserWindow): void {
  boundWindow = window;
}

/**
 * Best-effort error serialization that survives Electron's IPC structured
 * clone. `Error` objects do not always cross the bridge intact (especially
 * with custom prototypes), so we extract `message` + first stack line for the
 * renderer's toast. Type-narrowed via `instanceof`/`typeof`.
 */
function toMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message || err.name || 'Unknown error';
  }
  if (typeof err === 'string') return err;
  if (err === null || err === undefined) return 'Unknown error';
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function toDetail(err: unknown): string | null {
  if (err instanceof Error && typeof err.stack === 'string') {
    // First non-empty stack line gives the most actionable context for the
    // toast tooltip without overwhelming the renderer with a full trace.
    const lines = err.stack.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    // Skip the first line if it duplicates the message (typical Error.toString prefix).
    const candidate = lines.find((l) => !l.startsWith(err.message) || lines.length === 1);
    return candidate ?? null;
  }
  return null;
}

/**
 * Log + relay an error from any main-process subsystem.
 *
 * `scope` is a short stable string (`'catalog'`, `'run-history'`,
 * `'schedule-manager'`, `'ipc:atc:run'`, `'uncaughtException'`, etc.) used as
 * the structured log prefix and surfaced in the renderer toast so the user
 * knows which subsystem reported the problem.
 *
 * This function NEVER throws — failures inside the bus itself are swallowed
 * because they are the last line of defense before the app would crash.
 */
export function reportError(scope: string, err: unknown): void {
  const message = toMessage(err);
  const detail = toDetail(err);

  // Structured stderr log — visible in `npm run gui:dev`, in packaged-app
  // Console.app output, and in any CI/log capture. Prefix lets log greps
  // filter by subsystem.
  try {
    // eslint-disable-next-line no-console
    console.error(`[error-bus] scope=${scope} :: ${message}`);
    if (detail !== null && detail !== message) {
      // eslint-disable-next-line no-console
      console.error(`[error-bus] scope=${scope} :: at ${detail}`);
    }
  } catch {
    /* never throw from the bus */
  }

  // Push to renderer when a window is alive. Wrapped because webContents.send
  // can throw if the window was destroyed between the isDestroyed() check and
  // the actual send (very rare race during shutdown).
  if (boundWindow !== null && !boundWindow.isDestroyed()) {
    const payload: AppUncaughtErrorEvent = { scope, message, detail };
    try {
      boundWindow.webContents.send(PUSH_CHANNELS.appUncaughtError, payload);
    } catch {
      /* swallow — renderer push must not crash the bus */
    }
  }
}

/**
 * Run an init function (catalog / history / schedule) and route any
 * synchronous OR rejection-based failure through `reportError(scope, err)`
 * without rethrowing. Returns true on success so callers can flag a partial
 * boot in their own state if useful (currently unused — fire-and-forget).
 */
export function safeInit(scope: string, fn: () => void): boolean {
  try {
    fn();
    return true;
  } catch (err) {
    reportError(scope, err);
    return false;
  }
}

/**
 * Async variant of `safeInit` — awaits the promise and routes both sync
 * throws and async rejections through `reportError`.
 */
export async function safeInitAsync(
  scope: string,
  fn: () => Promise<void>,
): Promise<boolean> {
  try {
    await fn();
    return true;
  } catch (err) {
    reportError(scope, err);
    return false;
  }
}
