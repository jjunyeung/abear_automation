/**
 * Electron preload — exposes a strictly-whitelisted IPC surface to the renderer.
 *
 * Fulfills:
 *   R-T3.3 (channel whitelist)
 *   R-T14.2 (preload contextBridge — no raw ipcRenderer in renderer)
 *   R-T14.1 (works under contextIsolation:true / nodeIntegration:false — main enforces)
 *
 * INV-4: only Electron IPC. No `fetch`/`ws`/HTTP exposed to renderer.
 * INV-7: no .env access; no env strings exposed.
 */

import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import {
  ALL_PUSH_CHANNELS,
  INVOKE_CHANNELS,
  PUSH_CHANNELS,
  SEND_CHANNELS,
  type AppCloseAttemptEvent,
  type AppCloseConfirmArgs,
  type AppUncaughtErrorEvent,
  type AtcAPI,
  type AtcDoneEvent,
  type AtcKillArgs,
  type AtcLogEvent,
  type AtcRunArgs,
  type AtcRunResult,
  type CatalogItem,
  type PushChannel,
  type RunHistoryEntry,
  type BatchReportOpenArgs,
  type ReportMergeArgs,
  type ReportMergeResult,
  type RunOpenArgs,
  type RunReportArgs,
  type RunReportResult,
  type ScheduleCreateInput,
  type ScheduleDef,
  type ScheduleDeleteArgs,
  type ScheduleRunEntry,
  type ScheduleSkippedEvent,
  type ScheduleUpdateArgs,
  type ScreenshotReadArgs,
  type ScreenshotReadResult,
} from '../shared/ipc';

/**
 * Subscribe to a push channel. Strips the IpcRendererEvent before invoking
 * the renderer handler so renderer code never sees the raw event object.
 */
function subscribe<T>(
  channel: PushChannel,
  handler: (payload: T) => void,
): () => void {
  if (!ALL_PUSH_CHANNELS.includes(channel)) {
    throw new Error(`preload: refusing to subscribe to non-whitelisted channel "${channel}"`);
  }
  const wrapped = (_event: IpcRendererEvent, payload: T): void => {
    handler(payload);
  };
  ipcRenderer.on(channel, wrapped);
  return (): void => {
    ipcRenderer.off(channel, wrapped);
  };
}

const api: AtcAPI = {
  catalogList: (): Promise<CatalogItem[]> => ipcRenderer.invoke(INVOKE_CHANNELS.catalogList),
  catalogReload: (): Promise<CatalogItem[]> => ipcRenderer.invoke(INVOKE_CHANNELS.catalogReload),
  atcRun: (args: AtcRunArgs): Promise<AtcRunResult> =>
    ipcRenderer.invoke(INVOKE_CHANNELS.atcRun, args),
  scheduleCreate: (args: ScheduleCreateInput): Promise<ScheduleDef> =>
    ipcRenderer.invoke(INVOKE_CHANNELS.scheduleCreate, args),
  scheduleDelete: (args: ScheduleDeleteArgs): Promise<void> =>
    ipcRenderer.invoke(INVOKE_CHANNELS.scheduleDelete, args),
  scheduleUpdate: (args: ScheduleUpdateArgs): Promise<ScheduleDef> =>
    ipcRenderer.invoke(INVOKE_CHANNELS.scheduleUpdate, args),
  scheduleList: (): Promise<ScheduleDef[]> => ipcRenderer.invoke(INVOKE_CHANNELS.scheduleList),
  scheduleRuns: (): Promise<ScheduleRunEntry[]> =>
    ipcRenderer.invoke(INVOKE_CHANNELS.scheduleRuns),
  runHistory: (): Promise<RunHistoryEntry[]> => ipcRenderer.invoke(INVOKE_CHANNELS.runHistory),
  runReport: (args: RunReportArgs): Promise<RunReportResult> =>
    ipcRenderer.invoke(INVOKE_CHANNELS.runReport, args),
  reportMerge: (args: ReportMergeArgs): Promise<ReportMergeResult> =>
    ipcRenderer.invoke(INVOKE_CHANNELS.reportMerge, args),
  screenshotRead: (args: ScreenshotReadArgs): Promise<ScreenshotReadResult> =>
    ipcRenderer.invoke(INVOKE_CHANNELS.screenshotRead, args),

  atcKill: (args: AtcKillArgs): void => {
    ipcRenderer.send(SEND_CHANNELS.atcKill, args);
  },
  runOpen: (args: RunOpenArgs): void => {
    ipcRenderer.send(SEND_CHANNELS.runOpen, args);
  },
  batchReportOpen: (args: BatchReportOpenArgs): void => {
    ipcRenderer.send(SEND_CHANNELS.batchReportOpen, args);
  },
  appCloseConfirm: (args: AppCloseConfirmArgs): void => {
    ipcRenderer.send(SEND_CHANNELS.appCloseConfirm, args);
  },

  onAtcLog: (handler: (e: AtcLogEvent) => void): (() => void) =>
    subscribe<AtcLogEvent>(PUSH_CHANNELS.atcLog, handler),
  onAtcDone: (handler: (e: AtcDoneEvent) => void): (() => void) =>
    subscribe<AtcDoneEvent>(PUSH_CHANNELS.atcDone, handler),
  onCatalogUpdated: (handler: (items: CatalogItem[]) => void): (() => void) =>
    subscribe<CatalogItem[]>(PUSH_CHANNELS.catalogUpdated, handler),
  onRunHistoryUpdated: (handler: (entry: RunHistoryEntry) => void): (() => void) =>
    subscribe<RunHistoryEntry>(PUSH_CHANNELS.runHistoryUpdated, handler),
  onScheduleSkipped: (handler: (e: ScheduleSkippedEvent) => void): (() => void) =>
    subscribe<ScheduleSkippedEvent>(PUSH_CHANNELS.scheduleSkipped, handler),
  onScheduleRunsUpdated: (handler: (entries: ScheduleRunEntry[]) => void): (() => void) =>
    subscribe<ScheduleRunEntry[]>(PUSH_CHANNELS.scheduleRunsUpdated, handler),
  onAppSecondInstance: (handler: () => void): (() => void) =>
    subscribe<void>(PUSH_CHANNELS.appSecondInstance, () => handler()),
  onAppCloseAttempt: (handler: (e: AppCloseAttemptEvent) => void): (() => void) =>
    subscribe<AppCloseAttemptEvent>(PUSH_CHANNELS.appCloseAttempt, handler),
  onAppUncaughtError: (handler: (e: AppUncaughtErrorEvent) => void): (() => void) =>
    subscribe<AppUncaughtErrorEvent>(PUSH_CHANNELS.appUncaughtError, handler),
};

contextBridge.exposeInMainWorld('atcAPI', api);
