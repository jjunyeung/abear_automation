/**
 * Electron main process entry.
 *
 * Fulfills:
 *   R-T1.1 / R-U10.1 — `app.requestSingleInstanceLock()` ensures the second launch quits.
 *   R-T14.1          — every BrowserWindow has contextIsolation:true, nodeIntegration:false.
 *   R-T14.2          — preload exposes only whitelisted channels (via gui/preload/index.ts).
 *   R-T14.3          — main never reads .env directly; pre-run validation (T8) uses lib/config:loadEnv.
 *   R-T15.1          — no http/ws server is started here.
 *   R-T15.2          — production loads file://; dev loads localhost Vite only.
 *   R-T3.3           — IPC channel scaffold registered before window create (ipc-scaffold).
 *   R-B4.1           — top-level uncaughtException / unhandledRejection handlers route through
 *                      error-bus so a stray throw in any subsystem cannot crash the app; per-
 *                      subsystem init failures are swallowed-with-log so a broken history watcher
 *                      doesn't take catalog + scheduler down with it. Also: macOS-baseline app
 *                      menu installed so Cmd+Q/Cmd+W/Edit shortcuts behave like a normal app.
 *
 * Invariants enforced here:
 *   INV-3 (gui→lib only) — this file imports `electron`, node stdlib, and gui/* only.
 *   INV-4 (no network port) — no `createServer`, `ws`, `express`, `socket.io` import.
 *   INV-5 (webPreferences) — see `createMainWindow` below.
 *   INV-7 (no .env access) — `process.env` is read only for NODE_ENV dev/prod branching.
 */

import {
  app,
  BrowserWindow,
  Menu,
  Notification,
  ipcMain,
  type IpcMainEvent,
  type MenuItemConstructorOptions,
} from 'electron';
import * as path from 'node:path';
import {
  PUSH_CHANNELS,
  SEND_CHANNELS,
  type AppCloseAttemptEvent,
  type AppCloseConfirmArgs,
  type AtcDoneEvent,
} from '../shared/ipc';
import { registerIpcScaffold } from './ipc-scaffold';
import {
  activeQueueId,
  bindWindow as bindRunQueueWindow,
  cancelActive,
  detachActive,
  isActive,
  onDone as onRunQueueDone,
} from './run-queue';
import { initRunHistory, stopWatcher as stopRunHistoryWatcher } from './run-history';
import { init as initSchedules } from './schedule-manager';
import { startScheduleRunsWatcher, stopScheduleRunsWatcher } from './schedule-runs';
import { initCatalog } from './catalog';
import { bindErrorBusWindow, reportError, safeInit, safeInitAsync } from './error-bus';
import { clearPendingSkips, readPendingSkips } from './userdata';

const isDev = process.env.NODE_ENV !== 'production';
const VITE_DEV_URL = 'http://localhost:5273';

let mainWindow: BrowserWindow | null = null;

function bindAndInitWindow(win: BrowserWindow): void {
  bindErrorBusWindow(win);
  bindRunQueueWindow(win);
  safeInit('run-history', () => {
    initRunHistory(win);
  });
  safeInit('catalog', () => {
    initCatalog(win);
  });
  safeInit('replay-pending-skips', () => {
    replayPendingSkipsOnReady();
  });
}

function ensureMainWindow(): BrowserWindow {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow;
  }
  mainWindow = createMainWindow();
  bindAndInitWindow(mainWindow);
  return mainWindow;
}

// ---------- R-B4.1: top-level process error handlers ----------
//
// Without these, an unexpected throw inside any subsystem (catalog reload
// triggered by a YAML edit, chokidar watcher synthetic event, schedule
// launchctl invocation, IPC handler, etc.) would terminate the Electron main
// process and the user would see the GUI vanish mid-task. We route every
// such failure through `error-bus.reportError(scope, err)` which logs to
// stderr AND, when a window is bound, pushes `app:uncaught-error` so the
// ErrorToast surfaces the problem.
//
// Registered as early as possible — BEFORE app.whenReady — so even
// initialization-phase throws are caught.
process.on('uncaughtException', (err) => {
  reportError('uncaughtException', err);
});
process.on('unhandledRejection', (reason) => {
  reportError('unhandledRejection', reason);
});

/**
 * Flips to `true` after the user's CloseConfirmDialog choice has been processed
 * (kill: after cancelActive resolves; detach: immediately after detachActive).
 * A subsequent win.close() then bypasses the 'close' interceptor.
 *
 * Reset to false when the window is actually destroyed so a re-opened window
 * does not skip its first interception.
 */
let awaitingCloseChoice = false;

/**
 * Tracks which queueId was detached so the next atc:done from run-queue
 * fires a macOS notification instead of the usual renderer push (R-B6.4 / R-T18.2).
 */
let detachedQueueId: string | null = null;

function createMainWindow(): BrowserWindow {
  const preloadPath = path.join(__dirname, '..', 'preload', 'index.js');

  const win = new BrowserWindow({
    // 사용자 지정 — 1800×1280. LNB + sidebar(catalog 610) + form + right panel
    // 까지 표시되는 작업 영역.
    width: 1800,
    height: 1280,
    minWidth: 960,
    minHeight: 600,
    show: false,
    webPreferences: {
      // INV-5 / R-T14.1 — hard-coded; do not parametrise.
      contextIsolation: true,
      nodeIntegration: false,
      // sandbox:false (was true) — sandboxed preload cannot resolve relative
      // require('../shared/ipc'); R-T14.1/INV-5 only mandate contextIsolation
      // + nodeIntegration=false. Proper fix = bundle preload into a single
      // file (esbuild/vite) so sandbox:true can be re-enabled. Follow-up.
      sandbox: false,
      preload: preloadPath,
    },
  });

  // R-U10.3 — block any attempt to open a second renderer context
  // (window.open, target=_blank, etc). Downstream tasks may upgrade to
  // an in-renderer toast; the structural block lives here.
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // R-B6.3 / R-T18.1 / R-T18.2 — intercept window-close while a run is active.
  // When the user clicks the close button (and a Playwright spawn is in flight),
  // we prevent the default close, push `app:close-attempt` to the renderer,
  // and let the user pick kill / detach / cancel via CloseConfirmDialog.
  // Once a non-cancel choice arrives, `awaitingCloseChoice` flips to true so a
  // follow-up close() actually closes (kill flow waits for cancelActive() first).
  win.on('close', (event) => {
    if (awaitingCloseChoice) return; // second close after choice — allow.
    if (!isActive()) return; // no run in flight — normal close.
    event.preventDefault();
    const payload: AppCloseAttemptEvent = { queueId: activeQueueId() ?? '' };
    win.webContents.send(PUSH_CHANNELS.appCloseAttempt, payload);
  });

  if (isDev) {
    // R-T15.2 — dev uses Vite localhost ONLY. No remote host.
    void win.loadURL(VITE_DEV_URL);
  } else {
    // R-T15.2 — prod uses local file:// only.
    const indexHtml = path.join(__dirname, '..', 'renderer', 'index.html');
    void win.loadFile(indexHtml);
  }

  win.once('ready-to-show', () => {
    win.show();
  });

  win.on('closed', () => {
    if (mainWindow === win) {
      mainWindow = null;
    }
  });

  return win;
}

function focusExistingWindow(): void {
  if (!mainWindow) {
    return;
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
}

// ---------- R-T1.1 / R-U10.1: single-instance lock ----------

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  // Second invocation — quit immediately. The already-running primary
  // instance receives the 'second-instance' event below.
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      ensureMainWindow();
    }
    // R-U10.1: bring the existing window forefront.
    focusExistingWindow();
    // R-U10.2: notify renderer to show the informational toast (T14 wires the UI).
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(PUSH_CHANNELS.appSecondInstance);
    }
  });

  // R-B6.3 / R-T18.1 / R-T18.2 — handle the renderer's CloseConfirmDialog reply.
  // Registered once outside whenReady so it is available before the first window
  // emits 'close' (Electron processes IPC events on the main message queue regardless).
  ipcMain.on(
    SEND_CHANNELS.appCloseConfirm,
    (_event: IpcMainEvent, args: AppCloseConfirmArgs) => {
      void handleCloseConfirm(args);
    },
  );

  app.whenReady().then(() => {
    // R-B4.1 — IPC scaffold registration MUST NOT itself throw at app start.
    // If a handler binding fails, the renderer's IPC calls will reject and the
    // user sees an inline error rather than a crashed app.
    safeInit('ipc-scaffold', () => {
      registerIpcScaffold();
    });

    mainWindow = ensureMainWindow();
    //  - R-T4.2 / R-T4.3 — reconcile past-due oneshot schedules.
    void safeInitAsync('schedule-manager', async () => {
      await initSchedules();
    });
    // schedule fire 결과가 reports/schedule-runs.json 에 append 될 때마다 렌더러에 push.
    safeInit('schedule-runs-watcher', () => {
      startScheduleRunsWatcher();
    });

    // R-B6.4 / R-T18.2 — when a detached run completes (after the window was closed),
    // surface a macOS native notification instead of a renderer push.
    // We intercept atc:done by subscribing to the same channel in main via a webContents-less
    // route: run-queue sends atc:done to `mainWindow.webContents` only when bound. If we
    // null-bound the window during detach close, run-queue's `sendDone` would no-op.
    // Instead we keep the window bound (so renderer log accumulators stay accurate if the
    // window is re-opened) and observe atc:done via a forwarded ipcMain listener.
    // Electron does not provide direct "tap" into webContents.send, so run-queue must call
    // a hook. We expose `setOnDone` here so this concern stays in main/index.ts.
    safeInit('detach-notification-hook', () => {
      setupDetachNotificationHook();
    });

    // R-B4.1 — install the macOS-baseline application menu (Cmd+Q quit,
    // Edit copy/paste, View reload-in-dev, Window minimize) so the user gets
    // a native menu surface instead of Electron's empty default.
    safeInit('app-menu', () => {
      installApplicationMenu();
    });

    app.on('activate', () => {
      // macOS: re-create the window when the dock icon is clicked while no windows are open.
      if (BrowserWindow.getAllWindows().length === 0) {
        ensureMainWindow();
      } else {
        focusExistingWindow();
      }
    });
  }).catch((err: unknown) => {
    // app.whenReady() itself should never reject in practice; if it does, log
    // the failure rather than letting it bubble as an unhandled promise.
    reportError('app.whenReady', err);
  });

  app.on('before-quit', (event) => {
    // R-B6.3 — if a run is still active and the user has not yet picked
    // kill/detach via the dialog, intercept quit so the dialog can fire.
    // (Cmd+Q / app menu Quit bypasses the BrowserWindow 'close' interceptor.)
    if (!awaitingCloseChoice && isActive() && mainWindow && !mainWindow.isDestroyed()) {
      event.preventDefault();
      const payload: AppCloseAttemptEvent = { queueId: activeQueueId() ?? '' };
      try {
        mainWindow.webContents.send(PUSH_CHANNELS.appCloseAttempt, payload);
      } catch (err: unknown) {
        // R-B4.1 — webContents.send can fail if the window was destroyed
        // between the isDestroyed() check and the send. Log + continue so a
        // user double-Cmd+Q press doesn't crash the quit sequence.
        reportError('before-quit.close-attempt', err);
      }
      return;
    }
    // Best-effort close so chokidar's fsevents listener does not outlive the
    // process during dev hot-reload. Fire-and-forget — the await happens
    // implicitly via Electron's quit sequence.
    void stopRunHistoryWatcher().catch((err: unknown) => {
      // R-B4.1 — chokidar.close() rejection cannot block quit, but we still
      // log it via the bus so the user (and the next dev) sees it.
      reportError('run-history.stopWatcher', err);
    });
    stopScheduleRunsWatcher();
  });

  app.on('window-all-closed', () => {
    if (detachedQueueId !== null && isActive()) {
      return;
    }
    // macOS-only project (INV-8); we still quit when all windows close so the
    // single-instance lock is released cleanly on app exit.
    app.quit();
  });
}

/**
 * Process the CloseConfirmDialog user choice (R-T18.1 / R-T18.2 / R-B6.4).
 *
 *  - 'cancel' → reset state; window stays open, run continues.
 *  - 'kill'   → SIGTERM the active spawn, await close, then close window + quit.
 *  - 'detach' → unref the child; remember queueId so the next atc:done fires
 *               a macOS Notification (R-B6.4 — click → activate + Report deep-link).
 */
async function handleCloseConfirm(args: AppCloseConfirmArgs): Promise<void> {
  if (args.choice === 'cancel') {
    awaitingCloseChoice = false;
    return;
  }

  if (args.choice === 'kill') {
    awaitingCloseChoice = true;
    await cancelActive();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
    } else {
      app.quit();
    }
    return;
  }

  // 'detach' — let the child keep running, close the window only.
  detachedQueueId = detachActive();
  awaitingCloseChoice = true;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
}

/**
 * Replay any persisted lock-collision skip records as `schedule:skipped`
 * pushes to the renderer (R-B6.8 / R-T5.3: "다음 GUI 열림 시 상단 배너로도
 * 표시"). Idempotent — `clearPendingSkips()` wipes the file after pushing so
 * the same skip is never replayed twice.
 *
 * Defers the push until the renderer has finished loading so the
 * `useEffect(() => atcAPI.onScheduleSkipped(...))` subscription on the
 * renderer side is already wired. Without the defer, a fast cold-start
 * would push to a window whose React tree has not mounted yet, and the
 * skip would silently disappear.
 */
function replayPendingSkipsOnReady(): void {
  const win = mainWindow;
  if (win === null || win.isDestroyed()) return;

  const flush = (): void => {
    const pending = readPendingSkips();
    if (pending.length === 0) {
      return;
    }
    if (win.isDestroyed()) return;
    for (const entry of pending) {
      try {
        win.webContents.send(PUSH_CHANNELS.scheduleSkipped, entry);
      } catch (err: unknown) {
        reportError('replay-skips.send', err);
      }
    }
    // R-T5.3 — one surfacing per skip. Wipe AFTER successful push so a
    // partial-failure does not lose records (next launch would replay).
    try {
      clearPendingSkips();
    } catch (err: unknown) {
      reportError('replay-skips.clear', err);
    }
  };

  // `did-finish-load` fires every time a URL finishes loading. We only want
  // one replay per window — `once` guarantees that. If the renderer was
  // already loaded by the time we got here (e.g. activate path with a still-
  // bound but reloaded window), schedule the flush on next tick so the
  // listener registration order matches.
  if (win.webContents.isLoading()) {
    win.webContents.once('did-finish-load', flush);
  } else {
    setImmediate(flush);
  }
}

/**
 * Wire run-queue's onDone observer to fire a macOS notification for detached runs.
 * R-B6.4: notification click activates GUI window + opens Report tab (deep-link).
 * R-T18.3: clicking the notification re-activates the window (recreating if closed)
 *          and the renderer's atc:done listener handles the Report-tab switch.
 */
function setupDetachNotificationHook(): void {
  onRunQueueDone((event: AtcDoneEvent) => {
    if (event.queueId !== detachedQueueId) return;
    // Reset so duplicate done events (shouldn't happen) only fire once.
    detachedQueueId = null;

    if (!Notification.isSupported()) return;
    const success = event.exitCode === 0;
    const title = success ? 'ATC 완료' : 'ATC 실패';
    const body = success
      ? '백그라운드 실행이 성공했습니다. 클릭하여 리포트를 보세요.'
      : `백그라운드 실행이 실패했습니다 (exit ${event.exitCode}). 클릭하여 리포트를 보세요.`;
    const notification = new Notification({ title, body });
    notification.on('click', () => {
      // R-T18.3 — re-activate the app. If the window was closed, recreate it.
      // R-B4.1 — each re-init step isolated so one failure cannot crash the
      // notification handler. The user can still see the toast and re-launch.
      if (!mainWindow || mainWindow.isDestroyed()) {
        try {
          mainWindow = ensureMainWindow();
        } catch (err: unknown) {
          reportError('notification.click.createWindow', err);
          return;
        }
      } else {
        focusExistingWindow();
      }
      // Re-emit atc:done to the (possibly newly-created) window so RunView and
      // ReportPanel can activate the Report tab once the runId is available.
      if (event.runId !== null && mainWindow && !mainWindow.isDestroyed()) {
        try {
          mainWindow.webContents.send(PUSH_CHANNELS.atcDone, event);
        } catch (err: unknown) {
          reportError('notification.click.send-atc-done', err);
        }
      }
    });
    notification.show();
  });
}

/**
 * Install a macOS-baseline application menu (R-B4.1 — task T24 charter:
 * "ensure the Electron app menu baseline is present"). Without an explicit
 * Menu.setApplicationMenu call, packaged Electron apps inherit a sparse
 * default with no Quit shortcut, no Edit copy/paste, and no Window minimize —
 * which makes the app feel broken to anyone trying Cmd+Q or pasting an ATC
 * input URL. We install the standard macOS template:
 *
 *   App menu  → About / Hide / Quit
 *   Edit      → Undo / Redo / Cut / Copy / Paste / Select All
 *   View      → Reload (dev only) / Toggle DevTools (dev only) / Full Screen
 *   Window    → Minimize / Close
 *
 * Strictly UI scaffolding — no business logic lives in menu items.
 */
function installApplicationMenu(): void {
  const isMac = process.platform === 'darwin';
  const appMenu: MenuItemConstructorOptions = {
    label: app.name,
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideOthers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' },
    ],
  };

  const editMenu: MenuItemConstructorOptions = {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' },
    ],
  };

  // View menu — reload/devtools only enabled in dev so packaged users cannot
  // accidentally pop devtools and edit privileged state. R-T14.x context.
  const viewSubmenu: MenuItemConstructorOptions[] = isDev
    ? [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ]
    : [{ role: 'togglefullscreen' }];
  const viewMenu: MenuItemConstructorOptions = {
    label: 'View',
    submenu: viewSubmenu,
  };

  const windowMenu: MenuItemConstructorOptions = {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'close' },
    ],
  };

  const template: MenuItemConstructorOptions[] = isMac
    ? [appMenu, editMenu, viewMenu, windowMenu]
    : [editMenu, viewMenu, windowMenu];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
