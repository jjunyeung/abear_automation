/**
 * 묶음 실행 (batch) 의 N개 per-TC `.md` 를 단일 batch report 로 병합 후 디스크 저장.
 *
 * 출력 위치: `reports/batches/batch-<firstRunId>.md`
 *  - `reports/runs/` 는 read-only (INV-2 / R-T8.2). 별도 디렉토리에 쓴다.
 *  - batchId = 첫 runId 의 timestamp 부분. 동일 묶음을 다시 요청해도 같은 파일에 덮어씀 (idempotent).
 *
 * INV-3: imports node:fs / node:path 만. lib/ 미사용 (renderer↔main IPC 만 다룸).
 * INV-4: 파일시스템만. 네트워크 X.
 */

import { shell } from 'electron';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import type {
  ReportMergeArgs,
  ReportMergeResult,
  RunResultJson,
} from '../shared/ipc';

// `_N` suffix 는 atc-multi.mjs 가 동일 second 내 충돌 방지로 붙임 (scripts/atc-multi.mjs:90).
// batchId 는 runIds[0] 에서 `result_` 를 `batch-` 로 치환해 만들므로 동일하게 suffix 허용.
const BATCH_ID_REGEX = /^batch-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}(_\d+)?$/;

const RUN_ID_REGEX = /^result_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}(_\d+)?$/;

function projectRoot(): string {
  return path.resolve(process.cwd());
}

function runsRoot(): string {
  return path.join(projectRoot(), 'reports', 'runs');
}

function batchesRoot(): string {
  return path.join(projectRoot(), 'reports', 'batches');
}

function ensureBatchesDir(): void {
  const dir = batchesRoot();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

interface ReporterFileShape {
  run_id?: string;
  started_at?: string;
  ended_at?: string;
  overall_status?: string;
  atcs?: Array<{
    test_title?: string;
    spec_file?: string;
    result?: RunResultJson;
  }>;
}

function readJsonSafe(absPath: string): ReporterFileShape | null {
  try {
    const raw = readFileSync(absPath, 'utf8');
    return JSON.parse(raw) as ReporterFileShape;
  } catch {
    return null;
  }
}

function titleOf(runId: string, json: ReporterFileShape | null): string {
  if (json !== null && Array.isArray(json.atcs) && json.atcs.length > 0) {
    const t = json.atcs[0]?.test_title;
    if (typeof t === 'string' && t.length > 0) return t;
  }
  return runId;
}

function statusBadge(json: ReporterFileShape | null): string {
  if (json === null) return '⚠ 불명';
  const overall = json.overall_status;
  if (overall === 'success' || overall === 'passed') return '✅ 성공';
  if (overall === 'skipped') return '⏭️ 미실행';
  if (overall === 'failed') return '❌ 실패';
  return `· ${overall ?? '불명'}`;
}

/**
 * 묶음 .md 본문 생성.
 * 형식:
 *   # 묶음 실행 리포트 (N건)
 *   <목차>
 *   ---
 *   ## #1. <title>  ✅
 *   `<runId>`
 *   <원본 .md 본문>
 *   ---
 *   ## #2. ...
 */
function buildMerged(
  entries: Array<{
    runId: string;
    md: string;
    json: ReporterFileShape | null;
  }>,
): string {
  const lines: string[] = [];
  lines.push(`# 묶음 실행 리포트 (${entries.length}건)`);
  lines.push('');
  lines.push(`생성 시각: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## 목차');
  entries.forEach((e, i) => {
    const title = titleOf(e.runId, e.json);
    const badge = statusBadge(e.json);
    lines.push(`${i + 1}. ${title} — \`${e.runId}\` ${badge}`);
  });
  lines.push('');
  lines.push('---');
  lines.push('');
  entries.forEach((e, i) => {
    const title = titleOf(e.runId, e.json);
    const badge = statusBadge(e.json);
    lines.push(`## #${i + 1}. ${title}  ${badge}`);
    lines.push('');
    lines.push(`runId: \`${e.runId}\``);
    lines.push('');
    lines.push(e.md.trim());
    if (i < entries.length - 1) {
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  });
  return lines.join('\n') + '\n';
}

/**
 * 외부 진입점 — IPC handler 에서 호출.
 * 잘못된 runId / 파일 누락은 throw → IPC 가 reject.
 */
export function mergeReports(args: ReportMergeArgs): ReportMergeResult {
  if (!Array.isArray(args.runIds) || args.runIds.length === 0) {
    throw new Error('reportMerge: runIds is empty');
  }
  for (const id of args.runIds) {
    if (typeof id !== 'string' || !RUN_ID_REGEX.test(id)) {
      throw new Error(`reportMerge: invalid runId format — ${String(id)}`);
    }
  }
  const entries: Array<{
    runId: string;
    md: string;
    json: ReporterFileShape | null;
  }> = [];
  for (const runId of args.runIds) {
    const mdPath = path.join(runsRoot(), runId, `${runId}.md`);
    const jsonPath = path.join(runsRoot(), runId, `${runId}.json`);
    if (!existsSync(mdPath)) {
      throw new Error(`reportMerge: missing md for ${runId} (${mdPath})`);
    }
    const md = readFileSync(mdPath, 'utf8');
    const json = existsSync(jsonPath) ? readJsonSafe(jsonPath) : null;
    entries.push({ runId, md, json });
  }

  const batchId = args.runIds[0].replace(/^result_/, 'batch-');
  ensureBatchesDir();
  const absPath = path.join(batchesRoot(), `${batchId}.md`);
  writeFileSync(absPath, buildMerged(entries), 'utf8');
  return { batchId, absPath };
}

/**
 * `reports/batches/<batchId>.md` 를 OS 기본 앱으로 직접 연다.
 * 잘못된 batchId 형식이거나 파일 부재 시 throw.
 * `shell.openPath` 는 실패 시 비어있지 않은 문자열을 반환 → throw 로 변환.
 */
export async function openBatchFile(batchId: string): Promise<void> {
  if (!BATCH_ID_REGEX.test(batchId)) {
    throw new Error(`Invalid batchId format: ${batchId}`);
  }
  const file = path.join(batchesRoot(), `${batchId}.md`);
  if (!existsSync(file)) {
    throw new Error(`batch report not found: ${file}`);
  }
  const err = await shell.openPath(file);
  if (err !== '') {
    throw new Error(`shell.openPath failed: ${err}`);
  }
}
