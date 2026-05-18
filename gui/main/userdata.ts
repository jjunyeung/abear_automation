/**
 * userData persistence layer for the Electron main process.
 *
 * Single source of truth for path resolution + safe JSON IO of files that
 * MUST live under `app.getPath('userData')`:
 *   - `<userData>/schedules.json`     — ScheduleDef[]            (R-T8.1)
 *   - `<userData>/.gui-run.lock`      — current spawn PID        (R-T8.3, INV-6)
 *   - `<userData>/recent-skips.json`  — Lock-collision skip log  (R-T5.3, R-B6.8)
 *
 * INV-2 / R-T8.2 boundary: `reports/runs/` is read-only for the GUI and lives
 * OUTSIDE userData (project repo). This module intentionally exports no
 * helper that moves, copies, renames, or deletes anything under reports/runs/.
 * Report read access is owned by T15 via `run:report` IPC.
 *
 * INV-3: imports limited to electron + node stdlib + gui/shared/* — never
 * pulls from tests/recoveries/atcs/lib.
 */

import { app } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ScheduleDef, ScheduleSkippedEvent } from '../shared/ipc';

const SCHEDULES_FILENAME = 'schedules.json';
const LOCK_FILENAME = '.gui-run.lock';
const RECENT_SKIPS_FILENAME = 'recent-skips.json';
// Skips older than this are dropped on next read — keeps the banner queue
// from accumulating ancient entries across many cold starts (R-T5.3 says
// "일정 시간"; 24h is a reasonable upper bound for "최근").
const RECENT_SKIPS_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Returns the absolute userData directory for this Electron app.
 *
 * Thin wrapper so downstream callers (T7 lock IO, T17 schedule IO) reach a
 * single resolution site — making future test injection a one-line swap.
 *
 * Must only be invoked after `app.whenReady()`; Electron raises otherwise.
 */
export function getUserDataDir(): string {
  return app.getPath('userData');
}

/**
 * Absolute path to `<userData>/schedules.json` (R-T8.1).
 */
export function getSchedulesPath(): string {
  return path.join(getUserDataDir(), SCHEDULES_FILENAME);
}

/**
 * Absolute path to `<userData>/.gui-run.lock` (R-T8.3, INV-6).
 *
 * T7 owns the create/delete lifecycle; this module only resolves the path so
 * the location stays under userData and never leaks into the repo root.
 */
export function getLockPath(): string {
  return path.join(getUserDataDir(), LOCK_FILENAME);
}

/**
 * Read `<userData>/schedules.json`.
 *
 * Safe defaults: returns `[]` when the file is missing, empty, malformed JSON,
 * or not an array. T17 owns the higher-level validation against ScheduleDef
 * shape — this function is the IO boundary only.
 */
export function readSchedules(): ScheduleDef[] {
  const filePath = getSchedulesPath();
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch {
    return [];
  }
  if (raw.trim() === '') {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed as ScheduleDef[];
}

/**
 * Write `<userData>/schedules.json` atomically.
 *
 * Strategy: write to a sibling `.tmp` file, then `fs.renameSync` over the
 * target. Avoids leaving a half-written schedules.json if the process is
 * killed mid-write (T17 will round-trip this on every create/delete).
 *
 * Ensures the userData directory exists (Electron typically creates it on
 * first launch, but a custom userData path or fresh test invocation may not).
 */
export function writeSchedules(defs: ScheduleDef[]): void {
  const dir = getUserDataDir();
  fs.mkdirSync(dir, { recursive: true });
  const filePath = getSchedulesPath();
  const tmpPath = `${filePath}.tmp`;
  const payload = `${JSON.stringify(defs, null, 2)}\n`;
  fs.writeFileSync(tmpPath, payload, 'utf8');
  fs.renameSync(tmpPath, filePath);
}

// ---------- Lock-collision skip log (R-T5.3 / R-B6.8) ----------

/**
 * Absolute path to `<userData>/recent-skips.json`.
 *
 * The file persists `ScheduleSkippedEvent[]` so that lock-collision skips
 * recorded while the renderer window was closed (e.g. detached run still
 * holding the lock, or launchd job racing the GUI's own run) can be
 * surfaced as banners the next time the GUI window opens (R-T5.3 "다음 GUI
 * 열림 시 상단 배너로도 표시").
 *
 * Owned exclusively by `recordSkip` / `readPendingSkips` / `clearPendingSkips`
 * below — callers MUST NOT read or write this path directly so the TTL and
 * atomic-write invariants stay enforced.
 */
export function getRecentSkipsPath(): string {
  return path.join(getUserDataDir(), RECENT_SKIPS_FILENAME);
}

function isScheduleSkippedEvent(v: unknown): v is ScheduleSkippedEvent {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.scheduleId === 'string' &&
    typeof r.atcTitle === 'string' &&
    typeof r.skippedAt === 'string'
  );
}

/**
 * Append one skip event to `<userData>/recent-skips.json` atomically.
 *
 * Used by `run-queue` when a Run request hits an existing lock — the lock
 * may be held by either the GUI's own in-flight spawn OR by a launchd-fired
 * Playwright process that landed first. Either way, the user gets one
 * persisted record they will see on the next GUI launch.
 *
 * `scheduleId` is the empty string when the skip originated from a manual
 * Run trigger inside the GUI (rare — only happens if multiple Electron
 * processes shared `<userData>` somehow); for launchd-derived skips it is
 * the schedule UUID.
 */
export function recordSkip(event: ScheduleSkippedEvent): void {
  const existing = readPendingSkips();
  existing.push(event);
  writeSkips(existing);
}

/**
 * Read the persisted skip log, dropping any entries older than the TTL.
 *
 * Safe defaults: missing file / empty / malformed / non-array → `[]`. The
 * returned array is already filtered by TTL so callers can render every
 * entry without further checks.
 */
export function readPendingSkips(): ScheduleSkippedEvent[] {
  const filePath = getRecentSkipsPath();
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch {
    return [];
  }
  if (raw.trim() === '') return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const now = Date.now();
  const fresh: ScheduleSkippedEvent[] = [];
  for (const entry of parsed) {
    if (!isScheduleSkippedEvent(entry)) continue;
    const ts = Date.parse(entry.skippedAt);
    if (Number.isFinite(ts) && now - ts <= RECENT_SKIPS_TTL_MS) {
      fresh.push(entry);
    }
  }
  return fresh;
}

/**
 * Wipe the persisted skip log. Called from `index.ts` after the startup
 * banner-emission has pushed every pending entry to the renderer so they
 * are not re-shown on the next launch (R-T5.3 says "일정 시간 노출" — one
 * surfacing per skip is the intended contract).
 */
export function clearPendingSkips(): void {
  const filePath = getRecentSkipsPath();
  try {
    fs.unlinkSync(filePath);
  } catch {
    // Best-effort: a missing file (already cleared) is the success state.
  }
}

function writeSkips(events: ScheduleSkippedEvent[]): void {
  const dir = getUserDataDir();
  fs.mkdirSync(dir, { recursive: true });
  const filePath = getRecentSkipsPath();
  const tmpPath = `${filePath}.tmp`;
  const payload = `${JSON.stringify(events, null, 2)}\n`;
  fs.writeFileSync(tmpPath, payload, 'utf8');
  fs.renameSync(tmpPath, filePath);
}
