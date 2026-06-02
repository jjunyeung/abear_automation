#!/usr/bin/env node
/**
 * Multi-ATC runner wrapper — launchd 가 schedule 의 N개 ATC 를 순차 실행할 때 호출.
 *
 * 단일 ATC 도 이 wrapper 를 통과한다 (schedule-manager 가 length 무관 모두 atc-multi
 * 로 분기). 이렇게 통일된 이유는 Slack 알림 책임을 한 군데로 모으기 위함 —
 * atc.mjs 자체는 알림 코드를 갖지 않고, atc-multi 가 자식들 결과를 모아 1회 발송.
 *
 * Usage:
 *   node scripts/atc-multi.mjs --tasks=<base64-json>
 *
 * `<base64-json>` 은 다음 모양의 JSON 을 base64 인코딩:
 *   [
 *     { "atcPath": "atcs/collect/foo.atc.yml", "inputs": { "url": "..." } },
 *     { "atcPath": "atcs/upload/bar.atc.yml", "inputs": { "product_id": "123" } }
 *   ]
 *
 * 왜 base64? launchd plist XML 안에 임의 문자열을 박을 때 escape 가 까다롭다.
 * base64 는 영문/숫자/+/=/ 로만 구성되어 plist XML 의 5개 escape 대상과 충돌
 * 가능성이 가장 낮음.
 *
 * Slack 알림: SLACK_WEBHOOK_URL 이 .env 에 있으면 모든 자식 실행이 끝난 뒤
 * 한 번 POST. 없으면 silent skip. 알림 실패는 schedule 의 exit code 에 영향 X.
 */

// launchd 가 plist 의 EnvironmentVariables 에 PATH 만 forward 하므로 (보안 +
// INV-7: GUI 가 .env 를 안 만짐), Slack webhook URL 같은 자격증명은 atc-multi
// 가 cwd (=repo root, plist 의 WorkingDirectory) 의 .env 를 직접 로드해서 얻는다.
// playwright 자식 (atc.mjs 가 spawn) 은 playwright.config.ts 가 별도로 .env
// 를 로드하므로 영향 X.
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const argv = process.argv.slice(2);

let tasksB64 = null;
let headless = false;
for (const a of argv) {
  if (a === '--headless') {
    headless = true;
    continue;
  }
  if (a.startsWith('--tasks=')) {
    tasksB64 = a.slice('--tasks='.length);
    continue;
  }
}

if (tasksB64 === null) {
  process.stderr.write(
    'Usage: atc-multi --tasks=<base64-json>\n' +
      '  base64 of [{"atcPath": "...", "inputs": {...}}, ...]\n',
  );
  process.exit(2);
}

let tasks;
try {
  const decoded = Buffer.from(tasksB64, 'base64').toString('utf8');
  tasks = JSON.parse(decoded);
} catch (err) {
  process.stderr.write(`[atc-multi] --tasks 디코드 실패: ${err.message}\n`);
  process.exit(2);
}

if (!Array.isArray(tasks) || tasks.length === 0) {
  process.stderr.write('[atc-multi] tasks 가 비어있습니다\n');
  process.exit(2);
}

const repoRoot = path.resolve(__dirname, '..');
const atcWrapper = path.join(__dirname, 'atc.mjs');

function pad(n) {
  return String(n).padStart(2, '0');
}

function buildRunIdFor(idx) {
  const now = new Date();
  const base = `result_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  // 같은 second 안에 여러 자식이 spawn 되면 atc.mjs 의 default buildRunId 와 collision.
  // idx 를 suffix 로 붙여 충돌 방지. (single 일 때는 idx=0 → suffix 안 붙임)
  return tasks.length === 1 ? base : `${base}_${idx + 1}`;
}

// ── inputs 자동 주입 (pool / previous) ────────────────────────────
//
// 배경: GUI 큐 (gui/main/run-queue.ts) 는 spawn 직전에 다음 두 가지를 자동
// 주입한다 — (a) `inputs.<name>.from === 'pool'` 키는 `lib/url-pool.headPop()`
// 으로 한 개씩 consume, (b) `inputs.<name>.from === 'previous'` 키는 같은
// batch 안 앞 TC 의 outputs.json 에서 머지.  launchd 스케줄 spawn 은 GUI
// 메인을 거치지 않으므로 그 hook 이 빠져 있었다 → 매 fire 마다 inputs 가
// 빈 채로 spawn 되어 spec 의 requireFreshUrlFromEnv() 가 throw 하던 버그.
//
// 여기서는 동일 로직을 mjs 로 inline 재구현한다 (lib/url-pool.ts +
// run-queue.ts harvestOutputsFromReport 와 동기화 유지 필요 — 변경 시 둘 다).
// 한 번의 atc-multi 호출 = 한 batch 로 간주: batchOutputs 는 메모리 1회 누적.
const POOL_FILE = path.join(repoRoot, 'data', 'url-pool.txt');

function listPoolUrls() {
  if (!existsSync(POOL_FILE)) return [];
  const raw = readFileSync(POOL_FILE, 'utf8');
  const out = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    if (trimmed.startsWith('#')) continue;
    out.push(trimmed);
  }
  return out;
}

function writePoolUrls(urls) {
  mkdirSync(path.dirname(POOL_FILE), { recursive: true });
  const body = urls.length === 0 ? '' : `${urls.join('\n')}\n`;
  writeFileSync(POOL_FILE, body, 'utf8');
}

/** 풀의 첫 URL 을 꺼내 반환. 비어있으면 null. */
function poolHeadPop() {
  const urls = listPoolUrls();
  if (urls.length === 0) return null;
  const head = urls[0];
  writePoolUrls(urls.slice(1));
  return head;
}

/** ATC YAML 의 inputs 섹션만 읽어 { name: { from?: 'pool'|'previous' } } 반환. */
function readAtcInputsSpec(atcPathArg) {
  const abs = path.isAbsolute(atcPathArg)
    ? atcPathArg
    : path.join(repoRoot, atcPathArg);
  if (!existsSync(abs)) return {};
  try {
    const doc = YAML.parse(readFileSync(abs, 'utf8'));
    if (!doc || typeof doc !== 'object') return {};
    const inputs = doc.inputs;
    if (!inputs || typeof inputs !== 'object') return {};
    return inputs;
  } catch (err) {
    process.stderr.write(
      `[atc-multi] ATC YAML inputs 파싱 실패 (${atcPathArg}): ${err.message}\n`,
    );
    return {};
  }
}

/**
 * gui/main/run-queue.ts:704 harvestOutputsFromReport 와 동일 — 자식 종료 후
 * outputs 를 batchOutputs 에 머지하기 위해 사용.
 */
function harvestOutputsFromReport(reportPath) {
  if (!existsSync(reportPath)) return {};
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(reportPath, 'utf8'));
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== 'object') return {};
  const atcs = parsed.atcs;
  if (!Array.isArray(atcs)) return {};
  const out = {};
  for (const atc of atcs) {
    if (!atc || typeof atc !== 'object') continue;
    const outputs = atc.result?.outputs;
    if (!outputs || typeof outputs !== 'object') continue;
    for (const [k, v] of Object.entries(outputs)) {
      if (typeof k !== 'string' || k.length === 0) continue;
      if (v === null || v === undefined) continue;
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        out[k] = String(v);
      }
    }
  }
  return out;
}

/**
 * task.inputs 의 빈 칸을 자동 주입.
 * 우선순위: 사용자 직접 입력 > from:previous (batchOutputs) > from:pool (headPop).
 * 사용자 입력이 이미 있으면 무엇도 덮어쓰지 않는다 — D8 + run-queue.ts:471~ 와 동일.
 */
function fillInputs(rawInputs, atcPathArg, batchOutputs, taskIdx) {
  const inputs = { ...rawInputs };
  const spec = readAtcInputsSpec(atcPathArg);
  for (const [name, defNode] of Object.entries(spec)) {
    if (!defNode || typeof defNode !== 'object') continue;
    const current = inputs[name];
    if (typeof current === 'string' && current.length > 0) continue;
    const from = defNode.from;
    if (from === 'previous') {
      const prev = batchOutputs[name];
      if (typeof prev === 'string' && prev.length > 0) {
        inputs[name] = prev;
        process.stderr.write(
          `[atc-multi] task ${taskIdx + 1}: inject from:previous ${name}=${prev}\n`,
        );
      }
    } else if (from === 'pool') {
      const popped = poolHeadPop();
      if (popped !== null) {
        inputs[name] = popped;
        process.stderr.write(
          `[atc-multi] task ${taskIdx + 1}: inject from:pool ${name}=${popped}\n`,
        );
      } else {
        process.stderr.write(
          `[atc-multi] task ${taskIdx + 1}: from:pool ${name} — url-pool 비어있음, 빈 채로 spawn (spec 에서 fail 할 가능성)\n`,
        );
      }
    }
  }
  return inputs;
}

const batchOutputs = {};        // 같은 atc-multi 호출 = 1 batch
const childOutcomes = [];       // { task, runId, exitCode, reportJsonPath? }

for (let i = 0; i < tasks.length; i += 1) {
  const t = tasks[i];
  if (
    typeof t !== 'object' ||
    t === null ||
    typeof t.atcPath !== 'string'
  ) {
    process.stderr.write(
      `[atc-multi] task #${i + 1} 모양이 잘못됨 — atcPath 누락\n`,
    );
    childOutcomes.push({ task: t, runId: null, exitCode: 2 });
    continue;
  }
  const rawInputs = (t.inputs && typeof t.inputs === 'object') ? t.inputs : {};
  const inputs = fillInputs(rawInputs, t.atcPath, batchOutputs, i);
  const args = [atcWrapper, t.atcPath];
  for (const key of Object.keys(inputs)) {
    args.push(`--${key}=${inputs[key]}`);
  }
  if (headless) args.push('--headless');

  const runId = buildRunIdFor(i);
  process.stderr.write(
    `[atc-multi] ${i + 1}/${tasks.length} → ${t.atcPath} (runId=${runId})\n`,
  );
  // WINDLY_RUN_ID 를 미리 주입 — atc.mjs 가 이 값을 우선 사용 (없으면 자체 생성).
  // 이렇게 해야 atc-multi 가 자식 결과 JSON 의 경로를 미리 알 수 있음.
  const childEnv = { ...process.env, WINDLY_RUN_ID: runId };
  const result = spawnSync('node', args, { stdio: 'inherit', env: childEnv });
  const reportJsonPath = path.join(repoRoot, 'reports', 'runs', runId, `${runId}.json`);
  childOutcomes.push({
    task: t,
    runId,
    exitCode: result.status ?? 1,
    reportJsonPath,
  });
  if (result.status !== 0) {
    process.stderr.write(
      `[atc-multi] ${i + 1}/${tasks.length} 실패 (exit=${result.status}) — 계속 진행\n`,
    );
  }
  // 다음 task 의 from:previous 를 위해 outputs 머지 (실패해도 시도 — 일부 step
  // 까지 진행했다면 부분 outputs 가 있을 수 있음).
  const harvested = harvestOutputsFromReport(reportJsonPath);
  if (Object.keys(harvested).length > 0) {
    Object.assign(batchOutputs, harvested);
    process.stderr.write(
      `[atc-multi] task ${i + 1}: harvest outputs → ${JSON.stringify(harvested)}\n`,
    );
  }
}

// ── reports/schedule-runs.json append ──────────────────────────
// schedule-manager 가 plist EnvironmentVariables 에 WINDLY_SCHEDULE_ID 를 박아
// 자식에게 전달. 그게 있으면 schedule 발화 컨텍스트이므로 fire 기록 남김 (GUI
// 의 SchedulePanel 이 카드별 최근 실행을 보여줄 수 있도록).
const scheduleId = process.env.WINDLY_SCHEDULE_ID?.trim();
if (scheduleId) {
  try {
    appendScheduleRunEntry(repoRoot, scheduleId, childOutcomes);
  } catch (err) {
    process.stderr.write(`[atc-multi] schedule-runs.json 갱신 실패: ${err.message}\n`);
  }
}

// ── Slack 알림 ─────────────────────────────────────────────────
// 우선순위:
//   1. SLACK_BOT_TOKEN + SLACK_TARGET_CHANNEL (chat.postMessage) — DM/임의 채널 가능
//   2. SLACK_WEBHOOK_URL — 발급 시 고정된 채널
const botToken = process.env.SLACK_BOT_TOKEN?.trim();
const targetChannel = process.env.SLACK_TARGET_CHANNEL?.trim();
const webhook = process.env.SLACK_WEBHOOK_URL?.trim();
if (botToken && targetChannel) {
  try {
    await postSlackSummaryViaBot(botToken, targetChannel, childOutcomes);
  } catch (err) {
    process.stderr.write(`[atc-multi] Slack Bot 알림 실패: ${err.message}\n`);
    // Bot 실패 시 webhook 으로 fallback (있으면).
    if (webhook) {
      try {
        await postSlackSummary(webhook, childOutcomes);
      } catch (e2) {
        process.stderr.write(`[atc-multi] Slack webhook fallback 도 실패: ${e2.message}\n`);
      }
    }
  }
} else if (webhook) {
  try {
    await postSlackSummary(webhook, childOutcomes);
  } catch (err) {
    process.stderr.write(`[atc-multi] Slack 알림 실패: ${err.message}\n`);
  }
} else {
  process.stderr.write('[atc-multi] SLACK_BOT_TOKEN/SLACK_TARGET_CHANNEL 또는 SLACK_WEBHOOK_URL 미설정 — Slack 알림 skip\n');
}

const anyFailed = childOutcomes.some((o) => o.exitCode !== 0);
process.exit(anyFailed ? 1 : 0);

// ───────────────────────────────────────────────────────────────
// schedule-runs.json append (lock-free atomic write)
// ───────────────────────────────────────────────────────────────

/**
 * reports/schedule-runs.json 에 한 발화 entry 를 append.
 *
 * Entry 모양:
 *   {
 *     scheduleId: "...",
 *     firedAt: "2026-05-18T07:15:00.000Z",
 *     completedAt: "2026-05-18T07:16:23.123Z",
 *     overall: "success" | "failed" | "unhandled",
 *     runs: [{ atcPath, runId, exitCode, overall }, ...]
 *   }
 *
 * 동시 발화 충돌은 R-B6.8 의 SingletonLock 으로 사전 차단되므로 lock-free 로 충분.
 * Read-modify-write 사이 race 는 이론상 가능하지만 schedule 발화는 최소 분 단위라
 * 실질적으로 발생 불가.
 */
function appendScheduleRunEntry(repoRoot, scheduleId, outcomes) {
  const filePath = path.join(repoRoot, 'reports', 'schedule-runs.json');
  const dir = path.dirname(filePath);
  mkdirSync(dir, { recursive: true });

  // 기존 파일 읽기 (없거나 깨졌으면 빈 배열).
  let entries = [];
  if (existsSync(filePath)) {
    try {
      const raw = readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) entries = parsed;
    } catch {
      /* 깨진 파일 — 새로 시작 */
    }
  }

  // 각 자식의 reports json 을 한 번 더 읽어 overall 도 함께 박음.
  const runs = outcomes.map((o) => {
    const report = readReportJson(o.reportJsonPath);
    const overall = report?.overall_status ?? (o.exitCode === 0 ? 'success' : 'failed');
    return {
      atcPath: o.task?.atcPath ?? null,
      runId: o.runId,
      exitCode: o.exitCode,
      overall,
    };
  });

  const anyFail = outcomes.some((o) => o.exitCode !== 0);
  const entry = {
    scheduleId,
    firedAt: outcomes[0]?.runId
      ? runIdToIsoBestEffort(outcomes[0].runId)
      : new Date().toISOString(),
    completedAt: new Date().toISOString(),
    overall: anyFail ? 'failed' : 'success',
    runs,
  };

  entries.push(entry);

  // 최근 500개까지만 유지 (오랜 기간 누적 시 파일 비대화 방지).
  const MAX = 500;
  if (entries.length > MAX) {
    entries = entries.slice(entries.length - MAX);
  }

  // atomic write: tmp → rename.
  const tmpPath = `${filePath}.tmp`;
  writeFileSync(tmpPath, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');
  renameSync(tmpPath, filePath);
}

/** `result_2026-05-18_16-15-00` 형식 → ISO. 실패 시 현재 시각. */
function runIdToIsoBestEffort(runId) {
  const m = runId.match(
    /^result_(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})/,
  );
  if (!m) return new Date().toISOString();
  const [, y, mo, d, h, mi, s] = m;
  // 로컬 시각으로 해석 (atc.mjs 의 buildRunId 도 로컬 시각 기반).
  const dt = new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    Number(s),
  );
  return Number.isFinite(dt.getTime()) ? dt.toISOString() : new Date().toISOString();
}

// ───────────────────────────────────────────────────────────────
// Slack 메시지 빌더 + POST
// ───────────────────────────────────────────────────────────────

function readReportJson(jsonPath) {
  if (!jsonPath || !existsSync(jsonPath)) return null;
  try {
    return JSON.parse(readFileSync(jsonPath, 'utf8'));
  } catch {
    return null;
  }
}

function shortTitleFor(outcome, report) {
  if (report && Array.isArray(report.atcs) && report.atcs.length > 0) {
    const first = report.atcs[0];
    const t = first?.result?.atc_title ?? first?.test_title;
    if (typeof t === 'string' && t.trim() !== '') return t;
  }
  if (outcome.task && typeof outcome.task.atcPath === 'string') {
    const parts = outcome.task.atcPath.split('/');
    return parts[parts.length - 1] ?? outcome.task.atcPath;
  }
  return '(unknown ATC)';
}

function statusEmoji(status, exitCode) {
  if (status === 'passed' || status === 'success') return ':white_check_mark:';
  if (status === 'unhandled') return ':rotating_light:';
  if (status === 'failed' || exitCode !== 0) return ':x:';
  return ':grey_question:';
}

function durationOf(report) {
  if (!report || !report.started_at || !report.ended_at) return null;
  const s = Date.parse(report.started_at);
  const e = Date.parse(report.ended_at);
  if (!Number.isFinite(s) || !Number.isFinite(e)) return null;
  const sec = Math.round((e - s) / 1000);
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const rem = sec % 60;
  return rem === 0 ? `${m}m` : `${m}m${rem}s`;
}

/** reports/runs/<runId>/<runId>.md 내용 읽기 — 없으면 null. */
function readReportMd(jsonPath) {
  if (!jsonPath) return null;
  const mdPath = jsonPath.replace(/\.json$/, '.md');
  if (!existsSync(mdPath)) return null;
  try {
    return readFileSync(mdPath, 'utf8');
  } catch {
    return null;
  }
}

/**
 * GUI 의 mergeReports (gui/main/report-merge.ts) 와 동일 형식의 통합 md 생성.
 * 다른 점: schedule 발화 컨텍스트라 entries 가 outcomes 에서 직접 도출됨.
 */
function buildMergedMd(outcomes) {
  const lines = [];
  lines.push(`# 묶음 실행 리포트 (${outcomes.length}건)`);
  lines.push('');
  lines.push(`생성 시각: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## 목차');
  outcomes.forEach((o, i) => {
    const r = readReportJson(o.reportJsonPath);
    const title = shortTitleFor(o, r);
    const overall = r?.overall_status ?? (o.exitCode === 0 ? 'success' : 'failed');
    const badge =
      overall === 'success' || overall === 'passed'
        ? '✅ 성공'
        : overall === 'failed'
          ? '❌ 실패'
          : `· ${overall}`;
    lines.push(`${i + 1}. ${title} — \`${o.runId ?? '?'}\` ${badge}`);
  });
  lines.push('');
  lines.push('---');
  lines.push('');
  outcomes.forEach((o, i) => {
    const r = readReportJson(o.reportJsonPath);
    const title = shortTitleFor(o, r);
    const overall = r?.overall_status ?? (o.exitCode === 0 ? 'success' : 'failed');
    const badge =
      overall === 'success' || overall === 'passed'
        ? '✅ 성공'
        : overall === 'failed'
          ? '❌ 실패'
          : `· ${overall}`;
    lines.push(`## #${i + 1}. ${title}  ${badge}`);
    lines.push('');
    lines.push(`runId: \`${o.runId ?? '?'}\``);
    lines.push('');
    const md = readReportMd(o.reportJsonPath);
    if (md) {
      lines.push(md.trim());
    } else {
      lines.push(`_(리포트 .md 없음 — exit code ${o.exitCode})_`);
    }
    if (i < outcomes.length - 1) {
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  });
  return lines.join('\n') + '\n';
}

/**
 * 통합 md 를 reports/batches/<batchId>.md 에 작성. batchId 는 첫 runId 의
 * `result_` → `batch-` 치환 (GUI 의 mergeReports 와 동일 규칙).
 */
function writeBatchMd(repoRoot, mergedMd, firstRunId) {
  const batchesDir = path.join(repoRoot, 'reports', 'batches');
  mkdirSync(batchesDir, { recursive: true });
  const batchId = firstRunId
    ? firstRunId.replace(/^result_/, 'batch-')
    : `batch-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const absPath = path.join(batchesDir, `${batchId}.md`);
  const tmpPath = `${absPath}.tmp`;
  writeFileSync(tmpPath, mergedMd, 'utf8');
  renameSync(tmpPath, absPath);
  return { batchId, absPath };
}

/**
 * Slack attachment text 한도는 약 3000자 (mrkdwn 코드블록 포함). 그보다 길면
 * head + tail 형태로 트림 + 중간 생략 안내.
 */
function trimMdForSlack(md, maxChars = 2800) {
  if (md.length <= maxChars) return md;
  const headLen = Math.floor(maxChars * 0.7);
  const tailLen = maxChars - headLen - 60; // 생략 안내 line 여유
  return (
    md.slice(0, headLen).trimEnd() +
    `\n\n... [중간 ${md.length - headLen - tailLen}자 생략 — 전체는 reports/runs/ 확인] ...\n\n` +
    md.slice(-tailLen).trimStart()
  );
}

/**
 * Slack Bot Token + chat.postMessage 로 임의 채널 (DM 포함) 에 알림.
 * 사용 자격: Bot Token Scopes 에 `chat:write`. private 채널이면 Bot invite 필요.
 */
async function postSlackSummaryViaBot(botToken, channel, outcomes) {
  const total = outcomes.length;
  const failedCount = outcomes.filter((o) => o.exitCode !== 0).length;
  const okCount = total - failedCount;
  const allOk = failedCount === 0;

  const headerEmoji = allOk ? ':large_green_circle:' : ':red_circle:';
  const headerText = `${headerEmoji} *스케줄 작업 완료* (${okCount}/${total} 성공)`;

  const mergedMd = buildMergedMd(outcomes);
  const firstRunId = outcomes.find((o) => o.runId !== null)?.runId ?? null;
  const { batchId, absPath } = writeBatchMd(process.cwd(), mergedMd, firstRunId);
  process.stderr.write(`[atc-multi] 통합 리포트 작성: ${absPath}\n`);

  const trimmedMd = trimMdForSlack(mergedMd, 7500);
  const attachments = [{
    color: allOk ? '#36a64f' : '#dc3545',
    title: `${batchId}.md`,
    text: '```\n' + trimmedMd + '\n```',
    footer: `reports/batches/${batchId}.md`,
    mrkdwn_in: ['text'],
  }];

  const payload = JSON.stringify({
    channel,
    text: headerText,
    attachments,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${botToken}`,
      },
      body: payload,
      signal: controller.signal,
    });
    const body = await res.json();
    if (!body.ok) {
      throw new Error(`Slack API error: ${body.error ?? 'unknown'} (response: ${JSON.stringify(body).slice(0, 200)})`);
    }
  } finally {
    clearTimeout(timer);
  }
  process.stderr.write(`[atc-multi] Slack Bot 알림 전송 완료 (channel=${channel})\n`);
}

async function postSlackSummary(webhookUrl, outcomes) {
  const total = outcomes.length;
  const failedCount = outcomes.filter((o) => o.exitCode !== 0).length;
  const okCount = total - failedCount;
  const allOk = failedCount === 0;

  // 헤더 한 줄만 — 상세는 attachment 의 .md 본문에 다 들어있음.
  const headerEmoji = allOk ? ':large_green_circle:' : ':red_circle:';
  const headerText = `${headerEmoji} *스케줄 작업 완료* (${okCount}/${total} 성공)`;

  // 통합 md 생성 + reports/batches/<batchId>.md 에 작성 (GUI mergeReports 와 동일 형식).
  const mergedMd = buildMergedMd(outcomes);
  const firstRunId = outcomes.find((o) => o.runId !== null)?.runId ?? null;
  const { batchId, absPath } = writeBatchMd(
    process.cwd(), // = repoRoot (launchd plist WorkingDirectory)
    mergedMd,
    firstRunId,
  );
  process.stderr.write(`[atc-multi] 통합 리포트 작성: ${absPath}\n`);

  // Slack 첨부 — 통합 md 본문 inline. 한도 (~7500자) 넘으면 트림.
  const trimmedMd = trimMdForSlack(mergedMd, 7500);

  const attachments = [{
    color: allOk ? '#36a64f' : '#dc3545',
    title: `${batchId}.md`,
    text: '```\n' + trimmedMd + '\n```',
    footer: `reports/batches/${batchId}.md`,
    mrkdwn_in: ['text'],
  }];

  const payload = JSON.stringify({
    text: headerText,
    attachments,
  });

  // Node 18+ 의 built-in fetch + AbortController.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
  } finally {
    clearTimeout(timer);
  }
  process.stderr.write('[atc-multi] Slack 알림 전송 완료\n');
}
