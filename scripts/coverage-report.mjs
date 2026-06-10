#!/usr/bin/env node
/**
 * ATC 커버리지 리포트 — 엑셀 TC export 대비 ATC 커버율 계산.
 *
 * 커버 판정 = 둘의 합집합:
 *   1) tc<N> step id  — atcs/**.atc.yml 의 step.id 가 `tc<숫자>` 면 그 숫자를 직접 커버.
 *   2) covers.json    — semantic step id 를 쓰는 ATC 가 명시적으로 선언한 Case No (사이드카).
 *
 * 위생 검증:
 *   - covers.json 의 Case No 가 엑셀에 없으면 경고 (유령 번호).
 *   - covers.json 의 ATC 경로가 실존하지 않으면 경고.
 *   - tc<N> step id 가 엑셀에 없으면 경고.
 *
 * Usage:
 *   node scripts/coverage-report.mjs [xlsx-path]
 *   기본 xlsx = '/Users/a1/Downloads/test_cases_export_2026-05-19 (1).xlsx'
 *
 * Zero new deps: unzip(시스템) + 정규식 파싱 (import-tc-from-xlsx.mjs 와 동일 전략).
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_XLSX = '/Users/a1/Downloads/test_cases_export_2026-05-19 (1).xlsx';

/** 엑셀 sheet1.xml 의 A 컬럼(Case No) 숫자 집합 추출. */
function readExcelCaseNos(xlsxPath) {
  const xml = execFileSync('unzip', ['-p', xlsxPath, 'xl/worksheets/sheet1.xml'], {
    maxBuffer: 256 * 1024 * 1024,
  }).toString();
  const set = new Set();
  for (const m of xml.matchAll(/<c r="A\d+"[^>]*><v>(\d+)<\/v>/g)) {
    set.add(Number(m[1]));
  }
  return set;
}

/** atcs/ 재귀 순회하며 *.atc.yml 파일 경로 목록 반환. */
function listAtcFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...listAtcFiles(full));
    } else if (name.endsWith('.atc.yml')) {
      out.push(full);
    }
  }
  return out;
}

/** ATC 본문에서 `id: tc<N>` step id 의 숫자 집합 추출. */
function readTcStepIds(atcFiles) {
  const set = new Set();
  for (const f of atcFiles) {
    const body = readFileSync(f, 'utf8');
    for (const m of body.matchAll(/id:\s*tc(\d+)(?![0-9])/g)) {
      set.add(Number(m[1]));
    }
  }
  return set;
}

function loadCovers() {
  const p = join(ROOT, 'covers.json');
  if (!existsSync(p)) {
    return { covers: {} };
  }
  return JSON.parse(readFileSync(p, 'utf8'));
}

function main() {
  const xlsxPath = process.argv[2] || DEFAULT_XLSX;
  if (!existsSync(xlsxPath)) {
    process.stderr.write(`엑셀 파일 없음: ${xlsxPath}\n`);
    process.exit(2);
  }

  const excel = readExcelCaseNos(xlsxPath);
  const atcFiles = listAtcFiles(join(ROOT, 'atcs'));
  const tcIds = readTcStepIds(atcFiles);
  const coversDoc = loadCovers();
  const coversMap = coversDoc.covers || {};

  // covers.json 합치기 + 위생 검증
  const coversCaseNos = new Set();
  const warnings = [];
  for (const [atcRel, caseNos] of Object.entries(coversMap)) {
    if (!existsSync(join(ROOT, atcRel))) {
      warnings.push(`covers.json: ATC 경로 없음 → ${atcRel}`);
    }
    for (const cn of caseNos) {
      if (!excel.has(cn)) {
        warnings.push(`covers.json: 엑셀에 없는 Case No ${cn} (${atcRel})`);
      }
      coversCaseNos.add(cn);
    }
  }
  for (const cn of tcIds) {
    if (!excel.has(cn)) {
      warnings.push(`tc step id: 엑셀에 없는 Case No tc${cn}`);
    }
  }

  const covered = new Set([...tcIds, ...coversCaseNos].filter((cn) => excel.has(cn)));
  const uncovered = [...excel].filter((cn) => !covered.has(cn)).sort((a, b) => a - b);

  const pct = ((covered.size / excel.size) * 100).toFixed(1);
  const tcOnly = [...tcIds].filter((cn) => excel.has(cn)).length;
  const coversAdded = covered.size - tcOnly;

  process.stdout.write('\n=== ATC 커버리지 리포트 ===\n');
  process.stdout.write(`엑셀 TC          : ${excel.size}\n`);
  process.stdout.write(`ATC 파일         : ${atcFiles.length}\n`);
  process.stdout.write(`커버 (tc<N>)     : ${tcOnly}\n`);
  process.stdout.write(`커버 (covers.json 추가): +${coversAdded}\n`);
  process.stdout.write(`커버 합계        : ${covered.size} / ${excel.size}  (${pct}%)\n`);
  process.stdout.write(`미커버           : ${uncovered.length}\n`);
  if (uncovered.length > 0) {
    process.stdout.write(`미커버 Case No   : ${uncovered.join(', ')}\n`);
  }
  if (warnings.length > 0) {
    process.stdout.write(`\n⚠️  위생 경고 ${warnings.length}건:\n`);
    for (const w of warnings) {
      process.stdout.write(`   - ${w}\n`);
    }
  }
  process.stdout.write('\n');

  // 미커버 0 + 경고 0 이면 exit 0, 아니면 1 (CI/스크립트용 시그널)
  process.exit(uncovered.length === 0 && warnings.length === 0 ? 0 : 1);
}

main();
