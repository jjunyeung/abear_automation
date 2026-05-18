/**
 * launchd-backed schedule manager (main process).
 *
 * Fulfills:
 *   R-B5.1  — Persist a user-defined schedule and arm it via launchd so the
 *             ATC fires while the GUI is closed.
 *   R-T4.1  — Recurring kind → StartCalendarInterval(Hour/Minute[/Weekday/Day])
 *             plist at `~/Library/LaunchAgents/cc.windly.atc.<id>.plist`,
 *             `launchctl load` after write.
 *   R-T4.2  — Oneshot kind → StartCalendarInterval encoding Month/Day/Hour/Minute
 *             derived from `runAtEpochMs`. Auto-cleanup happens lazily on next
 *             app start via `init()` (no launchd post-exit hook — R-T7.3).
 *   R-T4.3  — `deleteSchedule()` runs `launchctl unload`, removes the plist
 *             file, and updates `schedules.json` atomically via userdata.ts.
 *   R-T8.1  — All persistence routes through `readSchedules/writeSchedules`
 *             so the JSON stays under `<userData>/schedules.json`.
 *
 * Invariants:
 *   INV-3 — imports limited to electron / node stdlib / gui shared/main.
 *           Never reaches into tests/recoveries/atcs/lib runtime modules.
 *   INV-4 — launchctl is a local shell-out; no network port is opened.
 *   INV-8 — macOS only; this module assumes `~/Library/LaunchAgents` exists.
 *   No `any` types (C1 / typescript-strict.md).
 */

import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';
import type {
  CalendarInterval,
  ScheduleCreateInput,
  ScheduleDef,
} from '../shared/ipc';
import {
  getUserDataDir,
  readSchedules,
  writeSchedules,
} from './userdata';

const execFileP = promisify(execFile);

const LABEL_PREFIX = 'cc.windly.atc';
const LAUNCH_AGENTS_DIR = path.join(os.homedir(), 'Library', 'LaunchAgents');

/**
 * Resolve the project repo root by walking up from __dirname looking for
 * package.json. Compiled emit is gui/dist/gui/main/schedule-manager.js
 * (rootDir=../.. preserves the gui/ segment under dist/); source is gui/main/.
 * Walk-up is layout-agnostic and survives both forms.
 *
 * launchd's WorkingDirectory MUST be the repo root so `npx playwright test`
 * resolves the project's `playwright.config.ts` and `package.json`.
 */
function resolveRepoRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 8; i += 1) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(__dirname, '..', '..');
}

function plistLabelFor(id: string): string {
  return `${LABEL_PREFIX}.${id}`;
}

function plistPathFor(id: string): string {
  return path.join(LAUNCH_AGENTS_DIR, `${plistLabelFor(id)}.plist`);
}

// ---------- plist XML serialization ----------

/**
 * Escape the five characters XML requires escaping inside element bodies.
 * launchd plists are XML — every dynamic string in a <string> tag must
 * round-trip through this so input values like `&`, `<` cannot inject markup.
 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function plistString(value: string): string {
  return `<string>${escapeXml(value)}</string>`;
}

function plistInteger(value: number): string {
  return `<integer>${Math.trunc(value)}</integer>`;
}

function plistArray(items: string[], indent: string): string {
  if (items.length === 0) {
    return '<array/>';
  }
  const inner = items.map((line) => `${indent}    ${line}`).join('\n');
  return `<array>\n${inner}\n${indent}</array>`;
}

function plistCalendarIntervalDict(interval: CalendarInterval, indent: string): string {
  const entries: string[] = [
    '<key>Hour</key>',
    plistInteger(interval.Hour),
    '<key>Minute</key>',
    plistInteger(interval.Minute),
  ];
  if (typeof interval.Weekday === 'number') {
    entries.push('<key>Weekday</key>');
    entries.push(plistInteger(interval.Weekday));
  }
  if (typeof interval.Day === 'number') {
    entries.push('<key>Day</key>');
    entries.push(plistInteger(interval.Day));
  }
  const inner = entries.map((e) => `${indent}    ${e}`).join('\n');
  return `<dict>\n${inner}\n${indent}</dict>`;
}

/**
 * Calendar tuple required for a oneshot (Month + Day + Hour + Minute, all
 * mandatory). Distinct from the recurring `CalendarInterval` because launchd
 * needs the date pinned so the job only fires on its target calendar day.
 */
interface OneshotCalendar {
  Month: number;
  Day: number;
  Hour: number;
  Minute: number;
}

/**
 * Convert a unix epoch (ms) to a launchd calendar tuple. Month is 1-12,
 * Day 1-31, Hour 0-23, Minute 0-59 (Date.getMonth() is 0-indexed).
 */
function oneshotToCalendarInterval(epochMs: number): OneshotCalendar {
  const d = new Date(epochMs);
  return {
    Month: d.getMonth() + 1,
    Day: d.getDate(),
    Hour: d.getHours(),
    Minute: d.getMinutes(),
  };
}

function plistOneshotCalendarDict(
  ci: OneshotCalendar,
  indent: string,
): string {
  const entries: string[] = [
    '<key>Month</key>',
    plistInteger(ci.Month),
    '<key>Day</key>',
    plistInteger(ci.Day),
    '<key>Hour</key>',
    plistInteger(ci.Hour),
    '<key>Minute</key>',
    plistInteger(ci.Minute),
  ];
  const inner = entries.map((e) => `${indent}    ${e}`).join('\n');
  return `<dict>\n${inner}\n${indent}</dict>`;
}

/**
 * Build the `ProgramArguments` argv for a schedule. Mirrors run-queue.ts
 * buildArgs() so a launchd-fired run and a GUI-driven run hit Playwright
 * with the same shape (contracts.md §SpawnArgs).
 *
 * 단/다중 무관 모두 atc-multi.mjs wrapper 를 경유한다 — Slack 알림 책임을 한
 * 군데로 모으기 위함 (단건 분기를 따로 두면 atc.mjs 에 알림 코드를 또 박아야
 * 하고 책임 분산). atc-multi 가 length=1 도 처리하고, 자식 종료 후 한 번
 * Slack 으로 POST 한다. tasks 는 base64-인코딩된 JSON 으로 한 줄에 박아
 * plist XML escape 부담을 줄임.
 */
function buildProgramArguments(def: {
  atcPath: string;
  atcPaths?: string[];
  inputs: Record<string, string>;
  perAtcInputs?: Record<string, Record<string, string>>;
  headless?: boolean;
}): string[] {
  const repoRoot = resolveRepoRoot();
  const paths = def.atcPaths && def.atcPaths.length > 0
    ? def.atcPaths
    : [def.atcPath];

  const wrapper = path.join(repoRoot, 'scripts', 'atc-multi.mjs');
  const tasks = paths.map((p) => ({
    atcPath: p,
    // perAtcInputs 가 우선, 없으면 legacy single inputs (단건 호환).
    inputs:
      def.perAtcInputs?.[p] ??
      (paths.length === 1 ? def.inputs : {}),
  }));
  const b64 = Buffer.from(JSON.stringify(tasks), 'utf8').toString('base64');
  // ProgramArguments[0] = '/usr/bin/env' 로 박는 이유 — launchd 는 첫 인자
  // (program) 을 자체 PATH (`/usr/bin:/bin:/usr/sbin:/sbin`) 에서 찾고
  // EnvironmentVariables 의 PATH 는 적용 안 함. Homebrew/nvm 으로 설치한 node
  // 는 `/opt/homebrew/bin` 또는 `~/.nvm/...` 라 launchd 가 못 찾아 spawn 실패
  // (exit 78 = EX_CONFIG). `/usr/bin/env` 는 표준 위치에 항상 있고, env 가
  // 자식의 PATH (= 우리 EnvironmentVariables 의 PATH) 에서 `node` 를 찾는다.
  const argv: string[] = ['/usr/bin/env', 'node', wrapper, `--tasks=${b64}`];
  if (def.headless === true) argv.push('--headless');
  return argv;
}

/**
 * Serialize a ScheduleDef to a launchd plist XML document.
 *
 * Notes:
 *  - WorkingDirectory is the repo root so `npx` resolves the project bin.
 *  - EnvironmentVariables forwards only PATH so `npx`/`node` are findable.
 *    Credentials are NOT injected here; the spec's own dotenv flow loads
 *    `.env` at runtime (R-T14.3 keeps env access out of the GUI layer).
 *  - RunAtLoad is intentionally absent — we do not want the schedule to
 *    fire the instant `launchctl load` runs.
 *  - StandardOutPath / StandardErrorPath are omitted because Playwright
 *    writes results into `reports/runs/` directly (D6) and T15's chokidar
 *    picks them up (R-T7.3 forbids launchd post-hooks).
 */
function buildPlistXml(def: ScheduleDef, workingDir: string): string {
  const indent = '    ';
  const args = buildProgramArguments(def);
  const argEntries = args.map((a) => plistString(a));

  let calendarBlock: string;
  if (def.kind === 'recurring') {
    if (!def.calendarInterval) {
      throw new Error(
        `schedule-manager: recurring schedule ${def.id} missing calendarInterval`,
      );
    }
    calendarBlock = plistCalendarIntervalDict(def.calendarInterval, indent);
  } else {
    if (def.runAtEpochMs === null) {
      throw new Error(
        `schedule-manager: oneshot schedule ${def.id} missing runAtEpochMs`,
      );
    }
    const ci = oneshotToCalendarInterval(def.runAtEpochMs);
    calendarBlock = plistOneshotCalendarDict(ci, indent);
  }

  const pathEnv = process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin';

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    '<dict>',
    `${indent}<key>Label</key>`,
    `${indent}${plistString(plistLabelFor(def.id))}`,
    `${indent}<key>ProgramArguments</key>`,
    `${indent}${plistArray(argEntries, indent)}`,
    `${indent}<key>WorkingDirectory</key>`,
    `${indent}${plistString(workingDir)}`,
    `${indent}<key>StartCalendarInterval</key>`,
    `${indent}${calendarBlock}`,
    `${indent}<key>EnvironmentVariables</key>`,
    `${indent}<dict>`,
    `${indent}${indent}<key>PATH</key>`,
    `${indent}${indent}${plistString(pathEnv)}`,
    // schedule_id 를 자식에게 전달 — atc-multi 가 끝나고 reports/schedule-runs.json
    // 에 fire 기록을 append 할 때 어느 schedule 인지 식별하기 위함.
    `${indent}${indent}<key>WINDLY_SCHEDULE_ID</key>`,
    `${indent}${indent}${plistString(def.id)}`,
    `${indent}</dict>`,
    `${indent}<key>RunAtLoad</key>`,
    `${indent}<false/>`,
    '</dict>',
    '</plist>',
    '',
  ].join('\n');
}

// ---------- launchctl shell-outs ----------

interface LaunchctlError extends Error {
  stderr?: string;
  stdout?: string;
  code?: number;
}

async function launchctlLoad(plistPath: string): Promise<void> {
  try {
    await execFileP('launchctl', ['load', plistPath]);
  } catch (err) {
    const e = err as LaunchctlError;
    const detail = e.stderr?.trim() || e.message || 'unknown launchctl error';
    throw new Error(`launchctl load failed for ${plistPath}: ${detail}`);
  }
}

async function launchctlUnload(plistPath: string): Promise<void> {
  // Idempotent: "Could not find specified service" is acceptable — caller
  // wants the end state, not a particular path to it.
  try {
    await execFileP('launchctl', ['unload', plistPath]);
  } catch {
    // Swallow: unload of an already-unloaded or missing-file plist is a no-op
    // for our purposes (deletion is the next step).
  }
}

// ---------- public API ----------

/**
 * Create a schedule: persist, write plist, load via launchctl.
 *
 * On launchctl failure the persisted JSON entry + plist file are rolled back
 * so the user does not end up with a half-armed schedule.
 */
export async function createSchedule(
  input: ScheduleCreateInput,
): Promise<ScheduleDef> {
  const id = randomUUID();
  const plistPath = plistPathFor(id);
  const def: ScheduleDef = {
    ...input,
    id,
    plistPath,
    // Force the persisted active flag on at create time — caller may have
    // omitted it (Omit<ScheduleDef, 'id' | 'plistPath'> still includes active,
    // but defensive normalization keeps the contract obvious).
    active: input.active !== false,
  };

  fs.mkdirSync(LAUNCH_AGENTS_DIR, { recursive: true });
  const workingDir = resolveRepoRoot();
  const xml = buildPlistXml(def, workingDir);

  // Write plist atomically: tmp → rename.
  const tmpPath = `${plistPath}.tmp`;
  fs.writeFileSync(tmpPath, xml, 'utf8');
  fs.renameSync(tmpPath, plistPath);

  // Persist BEFORE launchctl load so a crash mid-load still leaves a
  // recoverable record; init() will reconcile on next startup.
  const existing = readSchedules();
  writeSchedules([...existing, def]);

  try {
    await launchctlLoad(plistPath);
  } catch (err) {
    // Roll back persistence + plist on load failure so the user can retry.
    writeSchedules(existing);
    try {
      fs.unlinkSync(plistPath);
    } catch {
      /* best-effort */
    }
    throw err;
  }

  return def;
}

/**
 * Update an existing schedule in place: unload + remove old plist, regenerate
 * with the new fields, reload via launchctl, and replace the schedules.json
 * entry (id 와 plistPath 는 보존 — 같은 launchd label 을 재사용해야 사용자가
 * "같은 스케줄을 고친 것" 으로 인식).
 *
 * 실패 시 원본 상태로 best-effort 복구 — 새 plist 작성에 실패하면 원본을
 * 다시 써서 unload 직전 상태로 되돌림. launchctl load 자체가 실패하면
 * 호출자에게 throw (사용자가 UI 에서 에러 인지하고 재시도 가능).
 */
export async function updateSchedule(
  id: string,
  changes: ScheduleCreateInput,
): Promise<ScheduleDef> {
  const existing = readSchedules();
  const target = existing.find((s) => s.id === id);
  if (!target) {
    throw new Error(`updateSchedule: schedule ${id} not found`);
  }

  // 원본 plist 보존 — 새 plist 작성 실패 시 복구용 백업.
  const plistPath = target.plistPath;
  let backupXml: string | null = null;
  try {
    backupXml = fs.readFileSync(plistPath, 'utf8');
  } catch {
    // 원본 plist 가 이미 사라진 상태 (사용자가 외부에서 지운 경우) — 백업 없음.
  }

  // 1) 기존 plist unload (idempotent — 이미 unload 된 상태도 OK).
  await launchctlUnload(plistPath);

  // 2) 새 def 만들기 (id / plistPath 보존, active 는 changes.active 우선 적용).
  const nextDef: ScheduleDef = {
    ...changes,
    id,
    plistPath,
    active: changes.active !== false,
  };

  const workingDir = resolveRepoRoot();
  let newXml: string;
  try {
    newXml = buildPlistXml(nextDef, workingDir);
  } catch (err) {
    // plist 빌드 실패 — 원본 복구 시도.
    if (backupXml !== null) {
      try {
        fs.writeFileSync(plistPath, backupXml, 'utf8');
        await launchctlLoad(plistPath);
      } catch {
        /* best-effort */
      }
    }
    throw err;
  }

  // 3) 새 plist 작성 (atomic).
  const tmpPath = `${plistPath}.tmp`;
  fs.writeFileSync(tmpPath, newXml, 'utf8');
  fs.renameSync(tmpPath, plistPath);

  // 4) schedules.json 의 해당 entry 만 교체. 저장 BEFORE launchctl load —
  // launchctl 실패 시 rollback 대상이 분명해짐.
  const updatedList = existing.map((s) => (s.id === id ? nextDef : s));
  writeSchedules(updatedList);

  try {
    await launchctlLoad(plistPath);
  } catch (err) {
    // Rollback: schedules.json + plist 모두 원복 시도.
    writeSchedules(existing);
    if (backupXml !== null) {
      try {
        fs.writeFileSync(plistPath, backupXml, 'utf8');
        await launchctlLoad(plistPath);
      } catch {
        /* best-effort — 원본 plist 도 load 실패면 schedule 이 비활성 상태로 남음 */
      }
    } else {
      try {
        fs.unlinkSync(plistPath);
      } catch {
        /* best-effort */
      }
    }
    throw err;
  }

  return nextDef;
}

/**
 * Delete a schedule: launchctl unload, remove plist, drop from schedules.json.
 * Idempotent: missing plist or absent JSON entry is treated as success since
 * the caller wants "this schedule no longer exists".
 */
export async function deleteSchedule(id: string): Promise<void> {
  const existing = readSchedules();
  const target = existing.find((s) => s.id === id);

  // Always attempt unload + delete using the canonical path, even if no JSON
  // record exists, so an orphaned plist gets cleaned up too.
  const plistPath = target?.plistPath ?? plistPathFor(id);
  await launchctlUnload(plistPath);
  try {
    fs.unlinkSync(plistPath);
  } catch {
    // Already gone — fine.
  }

  if (target) {
    writeSchedules(existing.filter((s) => s.id !== id));
  }
}

/**
 * Return the persisted schedule list. Thin pass-through over userdata.ts so
 * callers do not have to know the JSON path.
 */
export function listSchedules(): ScheduleDef[] {
  return readSchedules();
}

/**
 * Mark a oneshot schedule as fired: unload + delete plist + flip active.
 * Exported so T15's reports/runs/ watcher can also call this when it sees
 * the run land on disk (charter for T17 mentions this hook).
 */
export async function markOneshotFired(id: string): Promise<void> {
  const existing = readSchedules();
  const target = existing.find((s) => s.id === id);
  if (!target || target.kind !== 'oneshot') return;

  await launchctlUnload(target.plistPath);
  try {
    fs.unlinkSync(target.plistPath);
  } catch {
    /* best-effort */
  }
  const updated = existing.map((s) =>
    s.id === id ? { ...s, active: false } : s,
  );
  writeSchedules(updated);
}

/**
 * Reconcile schedules at app start (R-T4.2 lazy cleanup, R-T4.3 housekeeping).
 *
 * For every oneshot whose `runAtEpochMs` is in the past AND `active === true`,
 * unload + delete the plist and flip active=false. Safe because T15's chokidar
 * watcher (R-T7.3) has already picked up any results landed in reports/runs/
 * during the GUI's downtime.
 */
export async function init(): Promise<void> {
  const existing = readSchedules();
  const now = Date.now();
  const stale = existing.filter(
    (s) =>
      s.kind === 'oneshot' &&
      s.active &&
      typeof s.runAtEpochMs === 'number' &&
      s.runAtEpochMs < now,
  );
  if (stale.length === 0) return;

  for (const s of stale) {
    await launchctlUnload(s.plistPath);
    try {
      fs.unlinkSync(s.plistPath);
    } catch {
      /* best-effort */
    }
  }
  const staleIds = new Set(stale.map((s) => s.id));
  const updated = existing.map((s) =>
    staleIds.has(s.id) ? { ...s, active: false } : s,
  );
  writeSchedules(updated);
}

// ---------- internal helpers exported for test/diagnostic use only ----------

/**
 * Render the plist XML for an arbitrary ScheduleDef without touching disk.
 * Exposed so an in-process verification step (or future unit test) can
 * `plutil -lint` the output. Not registered on any IPC channel.
 */
export function renderPlistXmlForTest(
  def: ScheduleDef,
  workingDir: string,
): string {
  return buildPlistXml(def, workingDir);
}

/**
 * Canonical plist file path for a given schedule id. Useful for diagnostics.
 */
export function plistPathForId(id: string): string {
  return plistPathFor(id);
}

/**
 * Get the user-data dir without going through electron.app — useful for
 * tests that spin up this module without a full Electron context. Thin
 * pass-through so the userdata.ts boundary stays single-sourced.
 */
export function userDataDir(): string {
  return getUserDataDir();
}
