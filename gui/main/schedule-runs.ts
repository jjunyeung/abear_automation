/**
 * schedule-runs.json reader + watcher.
 *
 * `reports/schedule-runs.json` 은 atc-multi.mjs 가 schedule 발화 시 append 하는
 * fire log. GUI 는 read-only 로 조회 (INV-2 / INV-10 — reports/ 는 read-only).
 *
 * watch: chokidar 로 파일 변경 감지 → 렌더러에 `schedule:runs-updated` push.
 * 새 발화 결과가 즉시 SchedulePanel 카드에 반영되게 한다.
 *
 * INV-3: imports limited to electron / node stdlib / chokidar / gui shared.
 *        atc-multi.mjs 와 직접 import 관계 X — JSON 파일 한 장이 contract.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import chokidar, { type FSWatcher } from 'chokidar';
import { BrowserWindow } from 'electron';
import type { ScheduleRunEntry } from '../shared/ipc';
import { PUSH_CHANNELS } from '../shared/ipc';
import { reportError } from './error-bus';

function projectRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 8; i += 1) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(__dirname, '..', '..');
}

function scheduleRunsPath(): string {
  return path.join(projectRoot(), 'reports', 'schedule-runs.json');
}

/**
 * Read all schedule fire entries. Missing or malformed file → empty array
 * (atc-multi 가 첫 schedule 발화 전에는 파일 자체가 없다 — 이게 정상).
 */
export function listScheduleRuns(): ScheduleRunEntry[] {
  const filePath = scheduleRunsPath();
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch {
    return [];
  }
  if (raw.trim() === '') return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Light shape narrowing — fields we actually need.
    return parsed.filter((e): e is ScheduleRunEntry => {
      return (
        typeof e === 'object' &&
        e !== null &&
        typeof (e as ScheduleRunEntry).scheduleId === 'string' &&
        Array.isArray((e as ScheduleRunEntry).runs)
      );
    });
  } catch {
    return [];
  }
}

let watcher: FSWatcher | null = null;

/**
 * Start watching reports/schedule-runs.json. On any change → push full list to
 * all open BrowserWindows. Idempotent: a second call no-ops.
 */
export function startScheduleRunsWatcher(): void {
  if (watcher) return;
  const filePath = scheduleRunsPath();
  // chokidar 가 파일 미존재 시에도 폴더만 있으면 add 이벤트 캐치 가능.
  watcher = chokidar.watch(filePath, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
  });

  const broadcast = (): void => {
    try {
      const entries = listScheduleRuns();
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send(PUSH_CHANNELS.scheduleRunsUpdated, entries);
      }
    } catch (err: unknown) {
      reportError('schedule-runs-watcher', err);
    }
  };

  watcher.on('add', broadcast);
  watcher.on('change', broadcast);
  watcher.on('error', (err: unknown) => reportError('schedule-runs-watcher', err));
}

export function stopScheduleRunsWatcher(): void {
  if (watcher) {
    void watcher.close();
    watcher = null;
  }
}
