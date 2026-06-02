/**
 * Shared IPC channel name constants + payload types.
 *
 * Single source of truth consumed by both preload (gui/preload/index.ts)
 * and renderer (gui/renderer/src/**). The main process registers handlers
 * for these exact channel names via gui/main/ipc-scaffold.ts.
 *
 * Fulfills R-T3.3, R-T14.2 (channel whitelist).
 * Contract source: .hoyeon/specs/atc-gui-runner/contracts.md §IPC Channels.
 *
 * INV-4: Electron IPC only. No HTTP/WebSocket equivalents.
 */

// ---------- Domain payload types (mirroring contracts.md New Types) ----------

export type CatalogStatus =
  | 'normal'
  | 'stale'
  | 'running'
  | 'queued'
  | 'failed-recent'
  | 'passed-recent';

// Excel Category 기준 재정렬된 디렉토리 (atc-consolidation-log.md §11):
//   일반 Category → Main Category 별 (collected-product / product-collect / 등)
//   비-일반 Category → Category 자체 (smartstore-customs-tax 등)
//   cross-cutting → e2e
export type Domain =
  | 'collected-product'
  | 'product-collect'
  | 'registered-product'
  | 'delivery-agency'
  | 'base-setting'
  | 'upload'
  | 'order-mgmt'
  | 'windly-shell'
  | 'smartstore-customs-tax'
  | 'e2e';

export interface CatalogItem {
  atcPath: string;
  specPath: string;
  domain: Domain;
  isFragment: boolean;
  // ATC body (lib/atc-schema). Renderer treats it as opaque metadata at form render time.
  atc: unknown;
  handlerKeys: string[];
  status: CatalogStatus;
  queuePosition: number | null;
  staleMismatches: string[];
}

export type RunQueueStatus = 'pending' | 'running' | 'done' | 'skipped';

export interface RunQueueItem {
  queueId: string;
  atcPath: string;
  domain: string;
  specPath: string;
  inputs: Record<string, string>;
  /** true 면 spawn 시 wrapper 에 --headless flag 가 추가됨. 기본 false (D7). */
  headless: boolean;
  status: RunQueueStatus;
  skipReason: string | null;
  runId: string | null;
  pid: number | null;
  /** 같은 batch 안의 TC 들끼리 outputs → inputs 자동 주입을 묶는 id. */
  batchSessionId?: string;
}

export interface CalendarInterval {
  Hour: number;
  Minute: number;
  Weekday?: number;
  Day?: number;
}

export type ScheduleKind = 'recurring' | 'oneshot';

export interface ScheduleDef {
  id: string;
  /**
   * 단건 스케줄 호환 필드. 다중 ATC 스케줄은 `atcPaths[0]` 과 동일하게 채워
   * legacy reader 가 깨지지 않도록 한다 (display fallback only).
   */
  atcPath: string;
  /**
   * 다중 ATC 지원. 정의되어 있으면 launchd 가 발화 시 atc-multi.mjs 로 spawn 되어
   * 배열 순서대로 ATC 가 sequential 실행된다. 없거나 length=1 이면 legacy 단건
   * 흐름 (atc.mjs + atcPath/inputs) 그대로.
   */
  atcPaths?: string[];
  domain: string;
  specPath: string;
  /**
   * 단건 호환 필드. 다중일 때는 `perAtcInputs[atcPaths[0]]` 와 동일.
   */
  inputs: Record<string, string>;
  /**
   * 다중 ATC 의 각 ATC 별 입력값. key = atcPath. 없으면 모든 ATC 에 빈 inputs 적용.
   */
  perAtcInputs?: Record<string, Record<string, string>>;
  kind: ScheduleKind;
  calendarInterval?: CalendarInterval;
  runAtEpochMs: number | null;
  plistPath: string;
  active: boolean;
  /**
   * true 면 schedule 발화 시 wrapper 에 --headless 가 추가되어 자식 Playwright
   * 가 WINDLY_HEADLESS=1 환경에서 돈다. D7 주의 — 윈들리 Chrome 확장 의존
   * ATC 는 headless 에서 실패할 수 있다. 기본 false (안전한 기본).
   */
  headless?: boolean;
}

export type ScheduleCreateInput = Omit<ScheduleDef, 'id' | 'plistPath'>;

export type PreRunError =
  | { code: 'ENV_FILE_MISSING'; path: string }
  | { code: 'VAR_MISSING'; varName: string }
  | { code: 'VAR_INVALID_PATH'; varName: string; resolvedPath: string };

export interface PreRunValidation {
  ok: boolean;
  errors: PreRunError[];
}

export interface RunHistoryEntry {
  runId: string;
  atcTitle: string;
  overall: 'success' | 'failed' | 'unhandled';
  // ISO 8601 — Date is not structured-clonable across IPC reliably; renderer parses.
  completedAt: string;
  reportMdPath: string;
  reportJsonPath: string;
}

// Frozen .json report root (INV-10). Defined here only as the shape returned by run:report.
export interface RunResultJson {
  atc_title: string;
  steps: Array<{
    step_id: string;
    status: 'success' | 'failed' | 'recovered' | 'unhandled' | 'skipped';
    duration_ms: number;
    error_key?: string | null;
    recovery_id?: string | null;
    message?: string | null;
  }>;
  overall: 'success' | 'failed' | 'unhandled';
  inputs_used: Record<string, string>;
}

// ---------- Invoke channel signatures (renderer → main, awaited) ----------

export interface AtcRunArgs {
  atcPath: string;
  domain: string;
  specPath: string;
  inputs: Record<string, string>;
  /**
   * true 이면 wrapper 에 `--headless` flag 가 추가되고, 자식 Playwright 가
   * `WINDLY_HEADLESS=1` 환경에서 돈다. lib/test-fixture.ts 가 그 변수를
   * 보고 `launchPersistentContext({ headless: true })` 로 띄움.
   *
   * 주의: 윈들리 Chrome 확장(MV3)이 headless 에서 service worker 등록을
   * 못 할 수 있음 (D7). UI 확장에 의존하는 ATC 는 실패할 수 있다. 기본값
   * 은 false (headed) — D7 의 안전한 기본을 깨지 않는다.
   */
  headless?: boolean;
  /**
   * 한 batch (= 큐 "전체 실행" 한 묶음) 안에서 같은 id 를 공유하는 TC 들끼리
   * outputs → inputs.from='previous' 자동 주입이 동작한다. 단일 실행 (InputForm)
   * 이나 스케줄러 spawn 등은 미설정 — 미설정이면 자동 주입 X.
   */
  batchSessionId?: string;
}
/**
 * `atc:run` returns the queueId on success, or a structured preflight-failure
 * payload so the renderer can render inline messages without throw/catch.
 * (R-U3.1 / R-U3.2 — preflight gates spawn; we never throw across IPC here.)
 */
export type AtcRunResult =
  | { ok: true; queueId: string }
  | { ok: false; errors: PreRunError[] };

export interface ScheduleDeleteArgs {
  id: string;
}

export interface ScheduleUpdateArgs {
  id: string;
  /** 새 값. id/plistPath 외 모든 필드 교체. */
  changes: ScheduleCreateInput;
}

export interface RunReportArgs {
  runId: string;
}
export interface RunReportResult {
  md: string;
  // null 일 때 = reporter 가 atcs: [] 로 기록한 케이스 (테스트가 runATC() 의
  // atc-result attachment 전에 실패. e.g. auth.setup 실패 / spec 모듈 로딩 에러).
  // md 는 여전히 유효 ("ATC 수: 0" 정도) 하므로 표시는 가능.
  json: RunResultJson | null;
}

/**
 * Merge N per-TC `.md` reports into a single batch report file under
 * `reports/batches/batch-<batchId>.md`. The batchId is derived from the first
 * runId. Existing per-TC files stay untouched (INV-2 — reports/runs/ 는 read-only).
 * Returns the absolute path of the merged file for the renderer's "Finder 열기" link.
 */
export interface ReportMergeArgs {
  runIds: readonly string[];
}
export interface ReportMergeResult {
  batchId: string;
  absPath: string;
}

/**
 * Read a PNG screenshot from `reports/runs/` and return it as a base64 data URL
 * so the renderer can embed `<img src={dataUrl} />` without exposing a file://
 * loader to the sandboxed renderer.
 *
 * Main process enforces a sandbox: the requested path MUST resolve inside the
 * project's `reports/runs/` tree (INV-2 / R-T8.2 — reports are read-only).
 * Requests outside that tree throw and the IPC invoke rejects so the renderer
 * can surface the failure inline.
 *
 * R-U7.1: thumbnails embedded inside step cards.
 * R-U7.2: the same data URL drives the lightbox overlay at full resolution.
 */
export interface ScreenshotReadArgs {
  absPath: string;
}
export interface ScreenshotReadResult {
  dataUrl: string;
}

/**
 * URL pool — data/url-pool.txt 에 보관된 URL 큐. 매 ATC 실행마다 새 URL 이
 * 필요한 시나리오 (e2e/url-collect-and-ai-fix 등) 가 자동으로 head 1개 consume.
 *
 * 모든 응답은 갱신된 전체 풀 (= 사용자에게 보여줄 latest 상태) 을 함께 반환 —
 * 별도 query 없이 한 번의 IPC 만으로 UI 가 새로 그려지도록.
 */
export interface PoolAddArgs {
  urls: readonly string[];
}
export interface PoolRemoveArgs {
  url: string;
}
export interface PoolMutationResult {
  /** 작업 직후 풀 전체 (FIFO 순서 유지). */
  urls: string[];
  /** add 시 새로 추가된 개수 / remove 시 삭제된 개수. 0 면 no-op. */
  affected: number;
}

// ---------- Send channel signatures (renderer → main, fire-and-forget) ----------

export interface AtcKillArgs {
  queueId: string;
}

export interface RunOpenArgs {
  runId: string;
}

/** 묶음 통합 리포트 (`reports/batches/<batchId>.md`) 를 Finder 로 reveal. */
export interface BatchReportOpenArgs {
  batchId: string;
}

/**
 * Renderer → main: user dismissed the second-instance toast or close-attempt cancel.
 * Reserved for future need; for now `appCloseConfirm` is the active send channel for T18.
 */

// ---------- Push channel signatures (main → renderer) ----------

export interface AtcLogEvent {
  queueId: string;
  line: string;
}

export interface AtcDoneEvent {
  queueId: string;
  exitCode: number;
  runId: string | null;
}

export interface ScheduleSkippedEvent {
  scheduleId: string;
  atcTitle: string;
  skippedAt: string;
}

/**
 * 한 schedule 발화의 결과 — atc-multi.mjs 가 reports/schedule-runs.json 에 append.
 * GUI 는 read-only 로 IPC 통해 조회 (INV-2 / INV-10).
 */
export interface ScheduleRunChildEntry {
  atcPath: string | null;
  runId: string | null;
  exitCode: number;
  /** reports/runs/<runId>/<runId>.json 의 overall_status (없으면 exitCode 기반 추정). */
  overall: 'success' | 'passed' | 'failed' | 'unhandled' | string;
}

export interface ScheduleRunEntry {
  scheduleId: string;
  /** 발화 시작 시각 (ISO). */
  firedAt: string;
  /** 모든 자식 종료 시각 (ISO). */
  completedAt: string;
  overall: 'success' | 'failed';
  runs: ScheduleRunChildEntry[];
}

/**
 * Main → renderer: user clicked window close while a run is active.
 * Renderer shows CloseConfirmDialog and replies via `app:close-confirm`.
 * Fulfills R-B6.3, R-T18.1, R-T18.2.
 */
export interface AppCloseAttemptEvent {
  /** queueId of the in-flight run, surfaced for log/UI context. */
  queueId: string;
}

/**
 * Renderer → main: user's choice from CloseConfirmDialog.
 * - 'kill'   → SIGTERM the active run, then quit (R-T18.1).
 * - 'detach' → leave the active run running, close window only, fire OS notification on completion (R-T18.2).
 * - 'cancel' → abort the close attempt, keep window open.
 */
export type CloseConfirmChoice = 'kill' | 'detach' | 'cancel';

export interface AppCloseConfirmArgs {
  choice: CloseConfirmChoice;
}

/**
 * Main → renderer: an uncaught exception, unhandled rejection, or subsystem
 * init failure was observed in the main process. Routed through
 * `gui/main/error-bus.ts` so the renderer can surface a transient toast
 * instead of letting the app crash silently. R-B4.1.
 *
 * `scope` identifies the subsystem (e.g. `'catalog'`, `'run-history'`,
 * `'schedule-manager'`, `'ipc:atc:run'`, `'uncaughtException'`,
 * `'unhandledRejection'`) so the toast/log can be triaged.
 *
 * `detail` is the first stack-trace line (when available) — never the full
 * trace, since the toast is transient and the full trace lives in the
 * stderr log.
 */
export interface AppUncaughtErrorEvent {
  scope: string;
  message: string;
  detail: string | null;
}

// ---------- Channel name constants (the whitelist) ----------

export const INVOKE_CHANNELS = {
  atcRun: 'atc:run',
  catalogList: 'catalog:list',
  catalogReload: 'catalog:reload',
  scheduleCreate: 'schedule:create',
  scheduleDelete: 'schedule:delete',
  scheduleUpdate: 'schedule:update',
  scheduleList: 'schedule:list',
  scheduleRuns: 'schedule:runs',
  runHistory: 'run:history',
  runReport: 'run:report',
  // 묶음 실행의 N개 .md 를 단일 batch .md 로 병합 후 디스크에 저장.
  reportMerge: 'report:merge',
  // R-U7.1 — main process resolves a sandboxed PNG path to a base64 data URL.
  screenshotRead: 'screenshot:read',
  // URL pool — data/url-pool.txt 의 read/add/remove. headPop 은 run-queue 가 직접 호출 (IPC X).
  poolList: 'pool:list',
  poolAdd: 'pool:add',
  poolRemove: 'pool:remove',
} as const;

export const SEND_CHANNELS = {
  atcKill: 'atc:kill',
  runOpen: 'run:open',
  batchReportOpen: 'batch-report:open',
  appCloseConfirm: 'app:close-confirm',
} as const;

export const PUSH_CHANNELS = {
  atcLog: 'atc:log',
  atcDone: 'atc:done',
  catalogUpdated: 'catalog:updated',
  runHistoryUpdated: 'run:history-updated',
  scheduleSkipped: 'schedule:skipped',
  scheduleRunsUpdated: 'schedule:runs-updated',
  appSecondInstance: 'app:second-instance',
  appCloseAttempt: 'app:close-attempt',
  // R-B4.1 — uncaught exceptions / unhandled rejections / subsystem init
  // failures relayed from `gui/main/error-bus.ts` to the renderer's
  // ErrorToast so the app reports problems instead of crashing silently.
  appUncaughtError: 'app:uncaught-error',
  // URL pool — run-queue 의 headPop 이후 풀이 변경됐음을 알린다.
  poolUpdated: 'pool:updated',
} as const;

export type InvokeChannel = (typeof INVOKE_CHANNELS)[keyof typeof INVOKE_CHANNELS];
export type SendChannel = (typeof SEND_CHANNELS)[keyof typeof SEND_CHANNELS];
export type PushChannel = (typeof PUSH_CHANNELS)[keyof typeof PUSH_CHANNELS];

export const ALL_INVOKE_CHANNELS: InvokeChannel[] = Object.values(INVOKE_CHANNELS);
export const ALL_SEND_CHANNELS: SendChannel[] = Object.values(SEND_CHANNELS);
export const ALL_PUSH_CHANNELS: PushChannel[] = Object.values(PUSH_CHANNELS);

// ---------- The contextBridge-exposed API surface ----------
//
// The renderer accesses these as `window.atcAPI.<method>`.
// preload wires each method to a single matching channel.

export interface AtcAPI {
  // invoke
  catalogList(): Promise<CatalogItem[]>;
  catalogReload(): Promise<CatalogItem[]>;
  atcRun(args: AtcRunArgs): Promise<AtcRunResult>;
  scheduleCreate(args: ScheduleCreateInput): Promise<ScheduleDef>;
  scheduleDelete(args: ScheduleDeleteArgs): Promise<void>;
  scheduleUpdate(args: ScheduleUpdateArgs): Promise<ScheduleDef>;
  scheduleList(): Promise<ScheduleDef[]>;
  /** reports/schedule-runs.json 의 모든 fire entry 반환. 최신순 정렬은 호출자 책임. */
  scheduleRuns(): Promise<ScheduleRunEntry[]>;
  runHistory(): Promise<RunHistoryEntry[]>;
  runReport(args: RunReportArgs): Promise<RunReportResult>;
  reportMerge(args: ReportMergeArgs): Promise<ReportMergeResult>;
  screenshotRead(args: ScreenshotReadArgs): Promise<ScreenshotReadResult>;
  /** URL pool 전체 (FIFO 순서). */
  poolList(): Promise<string[]>;
  /** URL 들을 풀 뒤에 append. 중복은 자동 제거. 갱신된 전체 풀 + 추가 개수 반환. */
  poolAdd(args: PoolAddArgs): Promise<PoolMutationResult>;
  /** 정확 매치되는 URL 을 풀에서 제거. 갱신된 전체 풀 + 제거 개수 반환. */
  poolRemove(args: PoolRemoveArgs): Promise<PoolMutationResult>;
  // send (fire-and-forget)
  atcKill(args: AtcKillArgs): void;
  runOpen(args: RunOpenArgs): void;
  batchReportOpen(args: BatchReportOpenArgs): void;
  appCloseConfirm(args: AppCloseConfirmArgs): void;
  // push subscriptions — return an unsubscribe callback
  onAtcLog(handler: (e: AtcLogEvent) => void): () => void;
  onAtcDone(handler: (e: AtcDoneEvent) => void): () => void;
  onCatalogUpdated(handler: (items: CatalogItem[]) => void): () => void;
  onRunHistoryUpdated(handler: (entry: RunHistoryEntry) => void): () => void;
  onScheduleSkipped(handler: (e: ScheduleSkippedEvent) => void): () => void;
  /** reports/schedule-runs.json 변동 시 push. payload 는 full list (덮어쓰기 모델). */
  onScheduleRunsUpdated(handler: (entries: ScheduleRunEntry[]) => void): () => void;
  onAppSecondInstance(handler: () => void): () => void;
  onAppCloseAttempt(handler: (e: AppCloseAttemptEvent) => void): () => void;
  onAppUncaughtError(handler: (e: AppUncaughtErrorEvent) => void): () => void;
  /** URL pool 이 run-queue 의 headPop 으로 변경됐을 때 push. */
  onPoolUpdated(handler: (urls: string[]) => void): () => void;
}
