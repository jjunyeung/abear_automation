#!/usr/bin/env node
/**
 * ATC 실행가능성 리포트 — 엑셀 TC 가 ATC 핸들러로 "실제 실행"되는 정도를 3-tier 로 분류.
 *
 * coverage-report.mjs 는 "번호가 ATC 에 귀속됐나"(커버 100%) 를 본다.
 * 이 스크립트는 한 단계 더 — 그 커버가 (A) 실제 검증인지, (B) 페이지 진입만 하는 noop 인지,
 * (C) 진입조차 없는지 를 가른다.
 *
 *   Tier A  실제 검증   : spec 에 real 핸들러(리터럴/루프) 또는 covers.json 손검증.
 *   Tier B  페이지 진입 : noop/skip 핸들러지만 spec 이 page.goto / goToX() 헬퍼로 해당 페이지 진입.
 *   Tier C  미실행      : 진입 동작조차 없음.
 *
 * 추가로 Tier B 를 ATC step 의 do(동작) 텍스트 기준으로 사유 버킷 분류 (어디부터 실제 핸들러로
 * 채울지 우선순위용).
 *
 * Usage:  node scripts/executability-report.mjs [xlsx-path]
 * Zero deps: unzip(시스템) + 정규식. coverage-report.mjs 와 동일 전략.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_XLSX = '/Users/a1/Downloads/test_cases_export_2026-05-19 (1).xlsx';

function readExcelCaseNos(xlsxPath) {
  const xml = execFileSync('unzip', ['-p', xlsxPath, 'xl/worksheets/sheet1.xml'], {
    maxBuffer: 256 * 1024 * 1024,
  }).toString();
  const set = new Set();
  for (const m of xml.matchAll(/<c r="A\d+"[^>]*><v>(\d+)<\/v>/g)) set.add(Number(m[1]));
  return set;
}

function listFiles(dir, ext) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listFiles(full, ext));
    else if (name.endsWith(ext)) out.push(full);
  }
  return out;
}

const specPathFor = (atcRel) => atcRel.replace(/^atcs\//, 'tests/').replace(/\.atc\.yml$/, '.spec.ts');
const domainOf = (atcRel) => atcRel.split('/')[1];

// noop 핸들러 시그니처 (noopAfter( / noopWithLog( / noop( 등)
const NOOP = /\bnoop\w*\s*\(/;
// spec 이 해당 페이지로 navigate 하는가 (직접 goto + windly-actions 네비 헬퍼)
const NAV = /page\.goto\(|goTo[A-Z]\w*\(|enterHaegudae|searchByProductCode|openFirstSearchResult/;

// do(동작) 텍스트 → 사유 버킷 (우선순위 순)
const REASON_BUCKETS = [
  ['AI/생성', /AI|번역|추천|생성/],
  ['destructive(삭제/결제/발송)', /삭제|결제|발송|환불|취소|발행|제출/],
  ['쓰기(등록/업로드/저장/수정/입력)', /등록|업로드|저장|수정|입력|추가|작성|적용|변경|설정/],
  ['동기화/주문/재고/연동', /동기화|주문|재고|연동|수집|발주/],
  ['표시/확인(쉬움)', /표시|노출|보임|확인|visible|보이|아이콘|배지|색상|텍스트|문구/],
  ['UI상호작용(선택/클릭/탭)', /선택|클릭|열기|탭|드롭다운|토글|버튼|이동|진입|페이지/],
];

function main() {
  const xlsxPath = process.argv[2] || DEFAULT_XLSX;
  if (!existsSync(xlsxPath)) {
    process.stderr.write(`엑셀 파일 없음: ${xlsxPath}\n`);
    process.exit(2);
  }
  const excel = readExcelCaseNos(xlsxPath);

  // tc -> { atcRel, doText }  (ATC step id 기준, do 텍스트 동봉)
  const tcInfo = new Map();
  for (const f of listFiles(join(ROOT, 'atcs'), '.atc.yml')) {
    const rel = relative(ROOT, f);
    const lines = readFileSync(f, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/id:\s*tc(\d+)(?![0-9])/);
      if (!m) continue;
      const cn = Number(m[1]);
      if (!excel.has(cn) || tcInfo.has(cn)) continue;
      let doText = '';
      for (let j = i; j < Math.min(i + 4, lines.length); j++) {
        const d = lines[j].match(/do:\s*(.+)$/);
        if (d) { doText = d[1].trim(); break; }
      }
      tcInfo.set(cn, { atcRel: rel, doText });
    }
  }

  // covers.json (semantic ATC = 손검증 → Tier A)
  const coversDoc = existsSync(join(ROOT, 'covers.json'))
    ? JSON.parse(readFileSync(join(ROOT, 'covers.json'), 'utf8'))
    : { covers: {} };
  const realTc = new Set();
  for (const [rel, nos] of Object.entries(coversDoc.covers || {})) {
    for (const cn of nos) if (excel.has(cn)) {
      realTc.add(cn);
      if (!tcInfo.has(cn)) tcInfo.set(cn, { atcRel: rel, doText: '' });
    }
  }

  // real 핸들러 판정 (리터럴 "tcN": <expr> + 루프 n === N)
  for (const f of listFiles(join(ROOT, 'tests'), '.spec.ts')) {
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      let m = line.match(/^\s*["']?tc(\d+)[^"':]*["']?\s*:\s*(.+?),?\s*$/);
      if (m) { const cn = Number(m[1]); if (excel.has(cn) && !NOOP.test(m[2])) realTc.add(cn); continue; }
      m = line.match(/n\s*===\s*(\d+)/);
      if (m) { const cn = Number(m[1]); if (excel.has(cn) && !NOOP.test(line)) realTc.add(cn); }
    }
  }

  // spec navigate 캐시
  const navCache = new Map();
  const navigates = (atcRel) => {
    const spec = join(ROOT, specPathFor(atcRel));
    if (navCache.has(spec)) return navCache.get(spec);
    const nav = existsSync(spec) ? NAV.test(readFileSync(spec, 'utf8')) : false;
    navCache.set(spec, nav);
    return nav;
  };

  // 3-tier + 도메인 집계
  const dom = new Map();
  const ensure = (d) => { if (!dom.has(d)) dom.set(d, { total: 0, A: 0, B: 0, C: 0 }); return dom.get(d); };
  let A = 0, B = 0, C = 0;
  const bTc = [];
  for (const cn of excel) {
    const info = tcInfo.get(cn);
    if (!info) continue; // 커버 0 (coverage-report 가 잡음)
    const e = ensure(domainOf(info.atcRel));
    e.total++;
    if (realTc.has(cn)) { e.A++; A++; }
    else if (navigates(info.atcRel)) { e.B++; B++; bTc.push(cn); }
    else { e.C++; C++; }
  }

  // Tier B 사유 버킷
  const bucket = new Map(REASON_BUCKETS.map(([n]) => [n, 0]));
  bucket.set('기타', 0);
  const easyByDom = new Map();
  for (const cn of bTc) {
    const { doText, atcRel } = tcInfo.get(cn);
    let bk = '기타';
    for (const [name, re] of REASON_BUCKETS) { if (re.test(doText)) { bk = name; break; } }
    bucket.set(bk, bucket.get(bk) + 1);
    if (bk.startsWith('표시')) easyByDom.set(domainOf(atcRel), (easyByDom.get(domainOf(atcRel)) || 0) + 1);
  }

  const total = A + B + C;
  const pc = (a) => total ? ((a / total) * 100).toFixed(1) : '0.0';
  const w = process.stdout.write.bind(process.stdout);

  w('\n=== ATC 실행가능성 리포트 ===\n');
  w(`엑셀 TC 총        : ${total}\n`);
  w(`✅ 실행 가능 (A+B): ${A + B}  (${pc(A + B)}%)\n`);
  w(`   A 실제 검증    : ${A}  (${pc(A)}%)\n`);
  w(`   B 페이지 진입  : ${B}  (${pc(B)}%)  ← noop 이나 navigate\n`);
  w(`⛔ 실행 불가 (C)  : ${C}  (${pc(C)}%)  ← 진입조차 없음\n`);

  w('\n=== 도메인별 (B = 실제 핸들러로 채울 백로그) ===\n');
  w('도메인'.padEnd(24) + 'TC'.padStart(6) + 'A'.padStart(6) + 'B'.padStart(6) + 'C'.padStart(6) + '  A%\n');
  for (const [d, v] of [...dom.entries()].sort((a, b) => b[1].B - a[1].B)) {
    w(d.padEnd(24) + String(v.total).padStart(6) + String(v.A).padStart(6) + String(v.B).padStart(6) + String(v.C).padStart(6) + '  ' + ((v.A / v.total) * 100).toFixed(0) + '%\n');
  }

  w('\n=== Tier B 사유 버킷 (do 동작 기준) ===\n');
  for (const [n] of REASON_BUCKETS) w(`  ${n.padEnd(30)} : ${bucket.get(n)}\n`);
  w(`  ${'기타'.padEnd(30)} : ${bucket.get('기타')}\n`);

  w('\n=== "표시/확인(쉬움)" 도메인별 — 1순위 백로그 ===\n');
  for (const [d, c] of [...easyByDom.entries()].sort((a, b) => b[1] - a[1])) w(`  ${d.padEnd(24)} : ${c}\n`);
  w('\n');
}

main();
