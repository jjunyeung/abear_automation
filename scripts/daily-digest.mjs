#!/usr/bin/env node
/**
 * Daily digest — 그날의 모든 batch 를 모아 통합 md + 요약 통계를 Slack 으로 1회 발송.
 *
 * 사용:
 *   node scripts/daily-digest.mjs               # 오늘 (00:00 ~ 현재) digest
 *   node scripts/daily-digest.mjs --date=YYYY-MM-DD  # 특정 날짜
 *   node scripts/daily-digest.mjs --dry-run     # 발송 X, 통합 md 만 stdout
 *
 * 동작:
 *   1. reports/batches/batch-<YYYY-MM-DD>_*.md 파일 그날치 모두 수집
 *   2. 각 batch md 의 헤드 (목차) 에서 PASS/FAIL 카운트 추출
 *   3. 통합 요약 md 작성: 총 batch/ATC/PASS/FAIL + 실패 리스트 + 본문 inline
 *   4. Slack 발송 (Bot Token 우선, webhook fallback) — atc-multi 와 같은 구조
 *
 * launchd 로 매일 12:30 발화 → 그날 누적분 일괄 요약.
 */

import 'dotenv/config';
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const BATCHES_DIR = path.join(REPO_ROOT, 'reports', 'batches');
const DIGEST_DIR = path.join(REPO_ROOT, 'reports', 'digests');

// ── 인자 ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
let targetDate = null;
for (const a of argv) {
  const m = a.match(/^--date=(\d{4}-\d{2}-\d{2})$/);
  if (m) targetDate = m[1];
}
if (targetDate === null) {
  const now = new Date();
  targetDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// ── 그날 batch md 수집 ────────────────────────────────────────────────────────
if (!existsSync(BATCHES_DIR)) {
  process.stderr.write(`[digest] batches dir 없음: ${BATCHES_DIR}\n`);
  process.exit(0);
}
const allFiles = readdirSync(BATCHES_DIR).filter((f) => f.endsWith('.md'));
const prefix = `batch-${targetDate}_`;
const todayBatches = allFiles
  .filter((f) => f.startsWith(prefix))
  .sort();

if (todayBatches.length === 0) {
  process.stderr.write(`[digest] ${targetDate} batch 없음 — digest skip\n`);
  process.exit(0);
}

// ── 각 batch 파싱 + 요약 추출 ─────────────────────────────────────────────────
const batches = [];
for (const f of todayBatches) {
  const full = path.join(BATCHES_DIR, f);
  const body = readFileSync(full, 'utf8');
  // 헤더 첫 줄: "# 묶음 실행 리포트 (N건)" 또는 "## ATC: ..." 행에서 카운트.
  const totalMatch = body.match(/묶음\s*실행\s*리포트\s*\((\d+)건\)/);
  const total = totalMatch ? parseInt(totalMatch[1], 10) : 0;
  // 목차 line 별 PASS/FAIL.
  const tocLines = body.split('\n').filter((l) => /^\d+\.\s+.+—\s+`result_[\d\-_]+`/.test(l));
  let pass = 0, fail = 0;
  const failed = [];
  for (const line of tocLines) {
    if (line.includes('✅')) pass += 1;
    else if (line.includes('❌')) {
      fail += 1;
      const m = line.match(/\d+\.\s+(.+?)\s+—/);
      if (m) failed.push(m[1]);
    }
  }
  batches.push({ file: f, total, pass, fail, failed, body });
}

// ── 통합 요약 md 작성 ────────────────────────────────────────────────────────
const totalAtc = batches.reduce((s, b) => s + b.total, 0);
const totalPass = batches.reduce((s, b) => s + b.pass, 0);
const totalFail = batches.reduce((s, b) => s + b.fail, 0);
const allFailed = batches.flatMap((b) => b.failed);

const summary = [];
summary.push(`# 일일 다이제스트 — ${targetDate}`);
summary.push('');
summary.push(`- 총 batch: **${batches.length}**`);
summary.push(`- 총 ATC: **${totalAtc}**`);
summary.push(`- ✅ PASS: **${totalPass}**`);
summary.push(`- ❌ FAIL: **${totalFail}**`);
summary.push('');
if (allFailed.length > 0) {
  summary.push(`## 실패 ATC (${allFailed.length}건)`);
  for (const name of allFailed) summary.push(`- ${name}`);
  summary.push('');
}
summary.push('## 배치 목록');
for (let i = 0; i < batches.length; i += 1) {
  const b = batches[i];
  const icon = b.fail === 0 ? '✅' : '❌';
  summary.push(`${i + 1}. ${icon} ${b.file} — ${b.pass}/${b.total} 성공`);
}
summary.push('');
summary.push('---');
summary.push('');
summary.push('## 통합 본문');
summary.push('');
for (const b of batches) {
  summary.push(`### ${b.file}`);
  summary.push('');
  summary.push(b.body);
  summary.push('');
  summary.push('---');
  summary.push('');
}
const digestMd = summary.join('\n');

// ── digest md 파일 저장 ──────────────────────────────────────────────────────
mkdirSync(DIGEST_DIR, { recursive: true });
const digestFile = path.join(DIGEST_DIR, `digest-${targetDate}.md`);
writeFileSync(digestFile, digestMd, 'utf8');
process.stderr.write(`[digest] 통합 md 저장: ${digestFile}\n`);

if (dryRun) {
  process.stdout.write(digestMd);
  process.exit(0);
}

// ── Slack 발송 ───────────────────────────────────────────────────────────────
const allOk = totalFail === 0;
const headerEmoji = allOk ? ':large_green_circle:' : ':red_circle:';
const headerText = `${headerEmoji} *일일 다이제스트 ${targetDate}* — ${totalPass}/${totalAtc} 성공 (${batches.length} batch)`;

const trimmedMd = digestMd.length > 7500
  ? digestMd.slice(0, 7400) + '\n\n... (잘림 — 전체는 reports/digests/digest-' + targetDate + '.md)'
  : digestMd;

const attachments = [{
  color: allOk ? '#36a64f' : '#dc3545',
  title: `digest-${targetDate}.md`,
  text: '```\n' + trimmedMd + '\n```',
  footer: `reports/digests/digest-${targetDate}.md`,
  mrkdwn_in: ['text'],
}];

async function sendBot(token, channel) {
  const payload = JSON.stringify({ channel, text: headerText, attachments });
  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${token}`,
    },
    body: payload,
  });
  const j = await res.json();
  if (!j.ok) throw new Error(`Slack API: ${j.error}`);
}

async function sendWebhook(url) {
  const payload = JSON.stringify({ text: headerText, attachments });
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  });
  if (!res.ok) throw new Error(`Webhook HTTP ${res.status}`);
}

const botToken = process.env.SLACK_BOT_TOKEN?.trim();
const targetChannel = process.env.SLACK_TARGET_CHANNEL?.trim();
const webhook = process.env.SLACK_WEBHOOK_URL?.trim();

let sent = false;
if (botToken && targetChannel) {
  try {
    await sendBot(botToken, targetChannel);
    process.stderr.write(`[digest] Slack Bot 발송 완료 (channel=${targetChannel})\n`);
    sent = true;
  } catch (err) {
    process.stderr.write(`[digest] Slack Bot 실패: ${err.message}\n`);
  }
}
if (!sent && webhook) {
  try {
    await sendWebhook(webhook);
    process.stderr.write('[digest] Slack webhook 발송 완료\n');
    sent = true;
  } catch (err) {
    process.stderr.write(`[digest] Slack webhook 실패: ${err.message}\n`);
  }
}
if (!sent) {
  process.stderr.write('[digest] Slack 발송 채널 없음 — skip\n');
}
