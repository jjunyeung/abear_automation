#!/usr/bin/env node
/**
 * Regression launchd installer — Tier 1 (매일) + Weekly Sweep (토요일) schedule 생성.
 *
 * GUI 호환 형식:
 *   - Label: cc.windly.atc.<uuid>  ← GUI 의 schedules.json 과 같은 prefix
 *   - schedules.json 에 ScheduleDef append → GUI 의 스케줄 목록에 자동 표시
 *
 * 사용:
 *   node scripts/install-regression-launchd.mjs           # install + load (idempotent)
 *   node scripts/install-regression-launchd.mjs uninstall # unload + plist 삭제 + schedules.json 정리
 *   node scripts/install-regression-launchd.mjs status    # 현재 등록 상태
 *
 * Identity:
 *   schedules.json 안에서 같은 regression 묶음을 다시 install 해도 중복 등록 안 되도록
 *   ScheduleDef 의 `name` 필드로 식별. 같은 name 있으면 기존 entry 갱신.
 */

import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TIER1_DAILY,
  WEEKLY_FULL_SWEEP,
  encodeTasks,
} from './regression-tasks.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const LAUNCH_AGENTS_DIR = path.join(homedir(), 'Library', 'LaunchAgents');
const SCHEDULES_JSON = path.join(homedir(), 'Library', 'Application Support', 'Electron', 'schedules.json');
const ATC_MULTI = path.join(REPO_ROOT, 'scripts', 'atc-multi.mjs');
const DAILY_DIGEST = path.join(REPO_ROOT, 'scripts', 'daily-digest.mjs');

const SCHEDULES = [
  {
    name: 'regression-tier1-daily',
    desc: 'Tier 1 — 매일 회귀 (13 ATC, ≈18분)',
    type: 'atc-tasks',
    tasks: TIER1_DAILY,
    calendar: { Hour: 5, Minute: 0 }, // 매일 05:00 KST
  },
  {
    name: 'regression-weekly-sweep',
    desc: 'Weekly Sweep — Tier 1 + Tier 2 (31 ATC, ≈32분)',
    type: 'atc-tasks',
    tasks: WEEKLY_FULL_SWEEP,
    calendar: { Weekday: 6, Hour: 4, Minute: 0 }, // 토요일 04:00 KST
  },
  {
    name: 'regression-digest-daily',
    desc: 'Daily Digest — 그날 모든 batch 통합 요약 Slack 발송 (12:30)',
    type: 'digest',
    calendar: { Hour: 12, Minute: 30 }, // 매일 12:30 KST
  },
];

function plistLabelFor(id) {
  return `cc.windly.atc.${id}`;
}

function plistPathFor(id) {
  return path.join(LAUNCH_AGENTS_DIR, `${plistLabelFor(id)}.plist`);
}

function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildPlistXml(id, programArgs, calendar) {
  const calEntries = Object.entries(calendar)
    .map(([k, v]) => `        <key>${k}</key>\n        <integer>${v}</integer>`)
    .join('\n');
  const PATH = process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin';
  const argLines = programArgs.map((a) => `        <string>${escapeXml(a)}</string>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${plistLabelFor(id)}</string>
    <key>ProgramArguments</key>
    <array>
${argLines}
    </array>
    <key>WorkingDirectory</key>
    <string>${REPO_ROOT}</string>
    <key>StartCalendarInterval</key>
    <dict>
${calEntries}
    </dict>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>${escapeXml(PATH)}</string>
        <key>WINDLY_SCHEDULE_ID</key>
        <string>${id}</string>
    </dict>
    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>
`;
}

function programArgsFor(s) {
  if (s.type === 'digest') {
    return ['/usr/bin/env', 'node', DAILY_DIGEST];
  }
  // atc-tasks 기본.
  const b64 = encodeTasks(s.tasks);
  return ['/usr/bin/env', 'node', ATC_MULTI, `--tasks=${b64}`];
}

function readSchedules() {
  if (!existsSync(SCHEDULES_JSON)) return [];
  try {
    return JSON.parse(readFileSync(SCHEDULES_JSON, 'utf8'));
  } catch {
    return [];
  }
}

function writeSchedules(list) {
  mkdirSync(path.dirname(SCHEDULES_JSON), { recursive: true });
  const tmp = `${SCHEDULES_JSON}.tmp`;
  writeFileSync(tmp, JSON.stringify(list, null, 2), 'utf8');
  renameSync(tmp, SCHEDULES_JSON);
}

function launchctl(args) {
  const r = spawnSync('launchctl', args, { encoding: 'utf8' });
  return { code: r.status ?? 0, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

/** schedules.json 의 ScheduleDef shape — GUI 의 gui/shared/ipc.ts ScheduleDef 와 호환. */
function toScheduleDef(s, id) {
  if (s.type === 'digest') {
    // digest 는 ATC 실행 아니라 sentinel path 로 GUI 에서 인식만 되게.
    return {
      id,
      name: s.name,
      atcPath: '<digest>',
      atcPaths: [],
      perAtcInputs: {},
      domain: 'digest',
      specPath: '',
      inputs: {},
      kind: 'recurring',
      calendarInterval: s.calendar,
      runAtEpochMs: null,
      plistPath: plistPathFor(id),
      active: true,
      headless: false,
      description: s.desc,
    };
  }
  const firstTask = s.tasks[0];
  const atcPath = firstTask.atcPath;
  const m = atcPath.match(/\/atcs\/([^/]+)\//);
  const domain = m ? m[1] : 'e2e';
  const specPath = atcPath.replace(/\/atcs\//, '/tests/').replace(/\.atc\.yml$/, '.spec.ts');
  const perAtcInputs = {};
  for (const t of s.tasks) perAtcInputs[t.atcPath] = t.inputs ?? {};
  return {
    id,
    name: s.name,
    atcPath,
    atcPaths: s.tasks.map((t) => t.atcPath),
    perAtcInputs,
    domain,
    specPath,
    inputs: firstTask.inputs ?? {},
    kind: 'recurring',
    calendarInterval: s.calendar,
    runAtEpochMs: null,
    plistPath: plistPathFor(id),
    active: true,
    headless: false,
    description: s.desc,
  };
}

function findByName(list, name) {
  return list.findIndex((d) => d.name === name);
}

function install() {
  mkdirSync(LAUNCH_AGENTS_DIR, { recursive: true });
  mkdirSync(path.join(REPO_ROOT, 'reports', 'launchd'), { recursive: true });

  const existing = readSchedules();
  for (const s of SCHEDULES) {
    const idx = findByName(existing, s.name);
    const id = idx >= 0 ? existing[idx].id : randomUUID();
    const plistPath = plistPathFor(id);

    // 기존 plist (있으면) unload 후 재작성.
    launchctl(['unload', plistPath]);

    const progArgs = programArgsFor(s);
    const xml = buildPlistXml(id, progArgs, s.calendar);
    writeFileSync(plistPath, xml, 'utf8');

    const def = toScheduleDef(s, id);
    if (idx >= 0) existing[idx] = def;
    else existing.push(def);

    const r = launchctl(['load', plistPath]);
    const loadOk = r.code === 0;
    console.log(`[install] ${s.name} (id=${id.slice(0, 8)}…)`);
    console.log(`           ${s.desc}`);
    console.log(`           plist:     ${plistPath}`);
    console.log(`           launchctl: ${loadOk ? '✓ loaded' : `✗ ${r.stderr.trim()}`}`);
  }
  writeSchedules(existing);
  console.log('');
  console.log('✓ schedules.json 업데이트 → GUI 재시작 시 목록에 표시됨.');
  console.log(`  ${SCHEDULES_JSON}`);
  console.log('');
  for (const s of SCHEDULES) {
    console.log(`  ${s.name}: 다음 발화 ${nextFireTime(s.calendar)}`);
  }
}

function uninstall() {
  const existing = readSchedules();
  const remaining = [];
  for (const d of existing) {
    const isOurs = SCHEDULES.some((s) => s.name === d.name);
    if (!isOurs) {
      remaining.push(d);
      continue;
    }
    launchctl(['unload', d.plistPath]);
    if (existsSync(d.plistPath)) {
      try { unlinkSync(d.plistPath); } catch { /* best-effort */ }
    }
    console.log(`[uninstall] ${d.name} (id=${d.id.slice(0, 8)}…) — 제거됨`);
  }
  writeSchedules(remaining);
  // 옛 (legacy prefix cc.windly.regression.*) plist 도 정리.
  for (const legacyLabel of ['cc.windly.regression.tier1.daily', 'cc.windly.regression.weekly-sweep']) {
    const p = path.join(LAUNCH_AGENTS_DIR, `${legacyLabel}.plist`);
    if (existsSync(p)) {
      launchctl(['unload', p]);
      unlinkSync(p);
      console.log(`[uninstall] legacy ${legacyLabel} → 제거됨`);
    }
  }
}

function status() {
  const existing = readSchedules();
  for (const s of SCHEDULES) {
    const idx = findByName(existing, s.name);
    if (idx < 0) {
      console.log(`${s.name}: ✗ 미설치`);
      continue;
    }
    const d = existing[idx];
    const plistOk = existsSync(d.plistPath);
    const r = launchctl(['list', plistLabelFor(d.id)]);
    const loaded = r.code === 0;
    console.log(`${s.name}:`);
    console.log(`  id:        ${d.id}`);
    console.log(`  label:     ${plistLabelFor(d.id)}`);
    console.log(`  plist:     ${plistOk ? '✓' : '✗'} ${d.plistPath}`);
    console.log(`  launchctl: ${loaded ? '✓ loaded' : '✗ unloaded'}`);
    console.log(`  next fire: ${nextFireTime(d.calendarInterval)}`);
    console.log(`  tasks:     ${(d.atcPaths ?? [d.atcPath]).length} ATC`);
  }
}

function nextFireTime(cal) {
  const now = new Date();
  const next = new Date(now);
  next.setSeconds(0, 0);
  if ('Hour' in cal) next.setHours(cal.Hour);
  if ('Minute' in cal) next.setMinutes(cal.Minute);
  if ('Weekday' in cal) {
    const targetDow = cal.Weekday === 7 ? 0 : cal.Weekday;
    while (next.getDay() !== targetDow || next <= now) {
      next.setDate(next.getDate() + 1);
    }
  } else if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next.toLocaleString('ko-KR', { hour12: false });
}

const cmd = process.argv[2] ?? 'install';
switch (cmd) {
  case 'install': install(); break;
  case 'uninstall': uninstall(); break;
  case 'status': status(); break;
  default:
    console.error(`Unknown command: ${cmd}. Use install | uninstall | status`);
    process.exit(2);
}
