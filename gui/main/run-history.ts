/**
 * Run history discovery (main process).
 *
 * Fulfills:
 *   R-T7.1  — startup glob scan of reports/runs/*<runId>.json → RunHistoryEntry[]
 *   R-T7.2  — chokidar watch on reports/runs/; new <runId>.json → push run:history-updated
 *   R-T7.3  — pure filesystem watch, no launchd post-exit hook required
 *   R-T13.1 — consume reporter's frozen .json schema unchanged (atc_title/steps/overall/inputs_used)
 *   R-B4.2  — schedule-fired runs (GUI off) are picked up on relaunch via R-T7.1 indexing
 *
 * Invariants:
 *   INV-2 / R-T8.2 — reports/runs/ is read-only here. No move/copy/rename/delete.
 *   INV-3         — imports: electron, node stdlib, chokidar, ../shared/ipc only.
 *   INV-4         — chokidar fs.watch only. No HTTP/WS.
 *   INV-8         — macOS-only project; chokidar's fsevents path is the default.
 *
 * On-disk JSON shape (per `reporters/atc-reporter.ts:237-251`):
 *   { run_id, started_at, ended_at, overall_status,
 *     atcs: [{ test_title, spec_file, result: RunResultJson }] }
 *
 * Each historical run currently emits exactly one ATC entry (see vertical slice
 * convention — one spec per Playwright invocation). We surface that inner
 * `result` as the canonical RunResultJson for `run:report` (R-T13.1) and derive
 * `overall` here by inspecting steps so `'unhandled'` is distinguished from
 * `'failed'`, since the reporter's `RunResult.overall` only emits success/failed
 * but contracts.md mandates the tri-state for RunHistoryEntry.overall.
 */

import { shell, type BrowserWindow } from 'electron';
import chokidar, { type FSWatcher } from 'chokidar';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import * as path from 'node:path';
import {
  PUSH_CHANNELS,
  type RunHistoryEntry,
  type RunResultJson,
} from '../shared/ipc';

const RUNS_DIR_REL = path.join('reports', 'runs');
// Reporter writes runIds like `result_2026-04-29_17-56-48`.
// `_N` suffix 는 atc-multi.mjs 가 동일 second 내 충돌 방지로 붙임 (scripts/atc-multi.mjs:90).
const RUN_ID_REGEX = /^result_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}(_\d+)?$/;

/** Project root — where the Playwright reporter writes `reports/runs/`. */
function runsRoot(): string {
  return path.resolve(process.cwd(), RUNS_DIR_REL);
}

/** Absolute path to the JSON report for a given runId. */
function jsonPathFor(runId: string): string {
  return path.join(runsRoot(), runId, `${runId}.json`);
}

/** Absolute path to the Markdown report for a given runId. */
function mdPathFor(runId: string): string {
  return path.join(runsRoot(), runId, `${runId}.md`);
}

/** Type-guarded parse of the reporter's wrapped JSON. */
interface ReporterFileShape {
  run_id: string;
  atcs: Array<{
    test_title: string;
    spec_file: string;
    result: RunResultJson;
  }>;
}

function isStepStatus(v: unknown): v is RunResultJson['steps'][number]['status'] {
  return (
    v === 'success' ||
    v === 'failed' ||
    v === 'recovered' ||
    v === 'unhandled' ||
    v === 'skipped'
  );
}

function isRunResult(v: unknown): v is RunResultJson {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  if (typeof r.atc_title !== 'string') return false;
  if (r.overall !== 'success' && r.overall !== 'failed' && r.overall !== 'unhandled') {
    return false;
  }
  if (!Array.isArray(r.steps)) return false;
  for (const s of r.steps) {
    if (typeof s !== 'object' || s === null) return false;
    const step = s as Record<string, unknown>;
    if (typeof step.step_id !== 'string') return false;
    if (typeof step.duration_ms !== 'number') return false;
    if (!isStepStatus(step.status)) return false;
  }
  if (typeof r.inputs_used !== 'object' || r.inputs_used === null) return false;
  return true;
}

function isReporterFile(v: unknown): v is ReporterFileShape {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  if (typeof r.run_id !== 'string') return false;
  if (!Array.isArray(r.atcs)) return false;
  for (const a of r.atcs) {
    if (typeof a !== 'object' || a === null) return false;
    const atc = a as Record<string, unknown>;
    if (typeof atc.test_title !== 'string') return false;
    if (typeof atc.spec_file !== 'string') return false;
    if (!isRunResult(atc.result)) return false;
  }
  return true;
}

/**
 * Read & parse a single `<runId>.json` file into a RunHistoryEntry.
 * Returns null when the file is missing, malformed, or has zero atcs.
 */
function readEntry(runId: string): RunHistoryEntry | null {
  const jsonPath = jsonPathFor(runId);
  let raw: string;
  try {
    raw = readFileSync(jsonPath, 'utf8');
  } catch {
    return null;
  }
  if (raw.trim() === '') return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isReporterFile(parsed)) return null;
  if (parsed.atcs.length === 0) return null;

  const first = parsed.atcs[0].result;
  // unhandled step presence overrides reporter's binary success/failed.
  const hasUnhandled = first.steps.some((s) => s.status === 'unhandled');
  const overall: RunHistoryEntry['overall'] = hasUnhandled
    ? 'unhandled'
    : first.overall;

  // Derive completedAt from the runId stamp (YYYY-MM-DD_HH-MM-SS local time).
  // Format: `result_2026-04-29_18-56-46` → 2026-04-29T18:56:46 (local).
  const stampMatch = runId.match(
    /^result_(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})$/,
  );
  let completedAt: string;
  if (stampMatch) {
    const [, y, mo, d, h, mi, s] = stampMatch;
    // Local-time interpretation matches buildRunId() in lib/config.ts.
    completedAt = new Date(
      Number(y),
      Number(mo) - 1,
      Number(d),
      Number(h),
      Number(mi),
      Number(s),
    ).toISOString();
  } else {
    // Fall back to file mtime if the runId failed the stamp regex
    // (defensive — production runIds always match).
    try {
      completedAt = statSync(jsonPath).mtime.toISOString();
    } catch {
      completedAt = new Date().toISOString();
    }
  }

  return {
    runId,
    atcTitle: first.atc_title,
    overall,
    completedAt,
    reportMdPath: mdPathFor(runId),
    reportJsonPath: jsonPath,
  };
}

/**
 * Glob-scan `reports/runs/*` at startup, parse each `<runId>.json`, return
 * the resulting entries sorted newest-first by runId (lexicographic on the
 * timestamp stamp == chronological).
 *
 * R-T7.1 — invoked once during main process initialisation.
 */
export function indexExistingRuns(): RunHistoryEntry[] {
  const root = runsRoot();
  let dirents: string[];
  try {
    dirents = readdirSync(root);
  } catch {
    // reports/runs/ may not exist yet on a fresh checkout — no entries.
    return [];
  }

  const entries: RunHistoryEntry[] = [];
  for (const name of dirents) {
    if (!RUN_ID_REGEX.test(name)) continue;
    const entry = readEntry(name);
    if (entry) entries.push(entry);
  }
  // Lexicographic descending == chronological newest-first for `result_YYYY-MM-DD_HH-MM-SS`.
  entries.sort((a, b) => (a.runId < b.runId ? 1 : a.runId > b.runId ? -1 : 0));
  return entries;
}

/**
 * Read both `<runId>.md` and `<runId>.json` for the renderer's Report tab.
 *
 * R-T13.1 — JSON returned unchanged (the inner RunResult of the first atc).
 * Throws when files are missing or malformed so the IPC invoke rejects and
 * the renderer surfaces the error inline.
 */
export function readRunReport(runId: string): { md: string; json: RunResultJson | null } {
  if (!RUN_ID_REGEX.test(runId)) {
    throw new Error(`Invalid runId format: ${runId}`);
  }
  const md = readFileSync(mdPathFor(runId), 'utf8');
  const rawJson = readFileSync(jsonPathFor(runId), 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Malformed JSON for runId ${runId}: ${msg}`);
  }
  if (!isReporterFile(parsed)) {
    throw new Error(`Unexpected report shape for runId ${runId}`);
  }
  // atcs.length === 0 = 테스트가 runATC() 의 atc-result attachment 전에 실패한
  // 케이스 (auth.setup 실패 / spec 로딩 에러 등). md 는 'ATC 수: 0' 으로 유효
  // 하므로 throw 하지 않고 json=null 로 통과시킨다. 렌더러는 md 만 사용.
  const json = parsed.atcs.length > 0 ? parsed.atcs[0].result : null;
  return { md, json };
}

/**
 * Opens the report folder for the given runId in macOS Finder.
 * Used by the `run:open` deep-link surface. T18 wires the renderer-side
 * "activate Report tab" UX; this main-process surface only resolves the
 * filesystem path. Throws when the runId is malformed or the directory is
 * absent so the caller can surface the failure.
 */
export async function revealRunInFinder(runId: string): Promise<void> {
  if (!RUN_ID_REGEX.test(runId)) {
    throw new Error(`Invalid runId format: ${runId}`);
  }
  const dir = path.join(runsRoot(), runId);
  const errMessage = await shell.openPath(dir);
  if (errMessage !== '') {
    throw new Error(`shell.openPath failed for ${dir}: ${errMessage}`);
  }
}

let watcher: FSWatcher | null = null;
// In-memory ordered (newest-first) snapshot served via `run:history` invoke.
// Mutated by initRunHistory()'s initial scan AND by watcher emissions; the
// renderer also subscribes to `run:history-updated` push events so its store
// stays in sync without re-invoking.
let snapshot: RunHistoryEntry[] = [];
// Tracks runIds we've already integrated to avoid duplicate emissions when
// both the addDir event AND the add(json) event fire for the same run.
const known: Set<string> = new Set();

/**
 * Read-only snapshot of every RunHistoryEntry currently known to main.
 * Returned newest-first (lexicographic-descending runId == chronological).
 * Returns a shallow copy so the IPC handler cannot accidentally mutate the
 * internal cache.
 */
export function getHistorySnapshot(): RunHistoryEntry[] {
  return snapshot.slice();
}

function insertNewestFirst(entry: RunHistoryEntry): void {
  // Replace any existing entry with the same runId (e.g. content rewritten),
  // then re-sort. Snapshots stay small (<= one entry per ATC run), so an
  // O(n log n) sort per insert is acceptable for the watch lifetime.
  snapshot = snapshot.filter((e) => e.runId !== entry.runId);
  snapshot.push(entry);
  snapshot.sort((a, b) =>
    a.runId < b.runId ? 1 : a.runId > b.runId ? -1 : 0,
  );
}

function emitIfReady(runId: string, mainWindow: BrowserWindow): void {
  if (known.has(runId)) return;
  const entry = readEntry(runId);
  // Reporter writes the directory first then the JSON. Skip emission until
  // the JSON has materialised; the next watcher event for the JSON path
  // re-triggers this check.
  if (!entry) return;
  known.add(runId);
  insertNewestFirst(entry);
  if (mainWindow.isDestroyed()) return;
  mainWindow.webContents.send(PUSH_CHANNELS.runHistoryUpdated, entry);
}

/**
 * Start a chokidar watch on `reports/runs/` and push `run:history-updated`
 * for every new runId whose JSON has been written. Idempotent — calling
 * twice closes the previous watcher first.
 *
 * R-T7.2 / R-T7.3 — fs watch only; no launchd post-hook.
 */
export function startWatcher(mainWindow: BrowserWindow): void {
  void stopWatcher();
  const root = runsRoot();
  watcher = chokidar.watch(root, {
    persistent: true,
    ignoreInitial: false,
    // Depth 2 = root → <runId>/ → <runId>.{md,json} (we don't care about html/).
    depth: 2,
    awaitWriteFinish: {
      stabilityThreshold: 250,
      pollInterval: 100,
    },
  });

  watcher.on('addDir', (dir: string) => {
    const name = path.basename(dir);
    if (!RUN_ID_REGEX.test(name)) return;
    // JSON may not exist yet at addDir; emitIfReady gracefully returns null.
    emitIfReady(name, mainWindow);
  });

  watcher.on('add', (filePath: string) => {
    const base = path.basename(filePath);
    const dirName = path.basename(path.dirname(filePath));
    if (!RUN_ID_REGEX.test(dirName)) return;
    if (base !== `${dirName}.json`) return;
    emitIfReady(dirName, mainWindow);
  });

  watcher.on('change', (filePath: string) => {
    const base = path.basename(filePath);
    const dirName = path.basename(path.dirname(filePath));
    if (!RUN_ID_REGEX.test(dirName)) return;
    if (base !== `${dirName}.json`) return;
    // Allow re-emission if a run was retried with new contents.
    known.delete(dirName);
    emitIfReady(dirName, mainWindow);
  });
}

/**
 * Close the chokidar watcher. Called on `before-quit` / window close so the
 * fsevents listener doesn't outlive the process during dev hot-reload.
 */
export async function stopWatcher(): Promise<void> {
  if (watcher) {
    await watcher.close();
    watcher = null;
  }
}

/**
 * Initialise run-history discovery for the current Electron session:
 *   1. Glob-scan `reports/runs/` and seed the snapshot (R-T7.1).
 *   2. Pre-seed the dedupe set so the initial chokidar `add` burst does not
 *      re-emit pre-existing runs as if they were new.
 *   3. Start the chokidar watcher and stream new runs (R-T7.2).
 *
 * Must be called from `app.whenReady().then(...)` after mainWindow exists so
 * the watcher has a valid window for push emissions. Idempotent: each call
 * closes the previous watcher first.
 */
export function initRunHistory(mainWindow: BrowserWindow): void {
  const initial = indexExistingRuns();
  snapshot = initial;
  known.clear();
  for (const entry of initial) {
    known.add(entry.runId);
  }
  startWatcher(mainWindow);
}
