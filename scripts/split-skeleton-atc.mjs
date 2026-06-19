/**
 * skeleton 번들 ATC 의 Tier-B(noop·미검증) step 들을 개별 ATC 파일로 분리(추가).
 *
 *   - 대상 = ≥2 step 번들 ATC 안의, real 핸들러 없고 covers.json 에도 없는 tc<N> step.
 *   - 출력 = atcs/<domain>/tc<N>-<slug>.atc.yml (single step, 기존 do/expect 보존).
 *   - skeleton/spec 은 건드리지 않음(추가만). 같은 tc<N> 라 coverage 고유수 불변.
 *   - spec(실행)은 만들지 않음.
 *
 * 사용:
 *   node scripts/split-skeleton-atc.mjs --dry            # 도메인별 생성 예정 수만 출력
 *   node scripts/split-skeleton-atc.mjs --domain=product-collect   # 한 도메인만 실제 생성
 *   node scripts/split-skeleton-atc.mjs                  # 전체 실제 생성
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const domArg = (args.find((a) => a.startsWith('--domain=')) || '').split('=')[1] || null;

function walk(d) {
  let r = [];
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) r = r.concat(walk(p));
    else r.push(p);
  }
  return r;
}

// 1) excel TC set
const xlsxCandidates = [
  '/Users/a1/Downloads/test_cases_export_2026-05-19 (1).xlsx',
];
let excelXml = '';
if (existsSync('/tmp/sheet1.xml')) excelXml = readFileSync('/tmp/sheet1.xml', 'utf8');
else for (const x of xlsxCandidates) if (existsSync(x)) { excelXml = execSync(`unzip -p "${x}" xl/worksheets/sheet1.xml`).toString(); break; }
const excel = new Set();
for (const m of excelXml.matchAll(/<c r="A\d+"[^>]*><v>(\d+)<\/v>/g)) excel.add(Number(m[1]));

// 2) covers.json credited
const covers = new Set();
try {
  const cov = JSON.parse(readFileSync(join(ROOT, 'covers.json'), 'utf8'));
  for (const nos of Object.values(cov.covers || {})) for (const n of nos) covers.add(Number(n));
} catch { /* none */ }

// 3) realTc (spec real handlers)
const NOOP = /\bnoop\w*\s*\(/;
const realTc = new Set();
for (const f of walk(join(ROOT, 'tests')).filter((p) => p.endsWith('.spec.ts'))) {
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    let m = line.match(/^\s*["']?tc(\d+)[^"':]*["']?\s*:\s*(.+?),?\s*$/);
    if (m) { if (!NOOP.test(m[2])) realTc.add(Number(m[1])); continue; }
    m = line.match(/n\s*===\s*(\d+)/);
    if (m && !NOOP.test(line)) realTc.add(Number(m[1]));
  }
}

// 4) skeleton ATC 파싱 → B step 수집
function slug(text) {
  return text
    .replace(/[\\/:*?"<>|]/g, '')          // 파일명 금지 문자
    .replace(/['"`]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 28)
    .replace(/-+$/g, '') || 'tc';
}

const atcFiles = walk(join(ROOT, 'atcs')).filter((p) => p.endsWith('.atc.yml'));
const perDomain = new Map();
const toCreate = [];

for (const f of atcFiles) {
  const rel = relative(ROOT, f);
  const domain = rel.split('/')[1];
  if (domArg && domain !== domArg) continue;
  const text = readFileSync(f, 'utf8');
  // priority
  const prioM = text.match(/^priority:\s*(P[012])/m);
  const priority = prioM ? prioM[1] : null;
  // steps 파싱 (id / do / expect)
  const lines = text.split('\n');
  const steps = [];
  for (let i = 0; i < lines.length; i++) {
    const idm = lines[i].match(/^\s*-\s*id:\s*(\S+)/);
    if (!idm) continue;
    const id = idm[1];
    let doText = '', expectText = '';
    for (let j = i + 1; j < lines.length; j++) {
      if (/^\s*-\s*id:/.test(lines[j])) break;
      const dm = lines[j].match(/^\s*do:\s*(.+)$/);
      if (dm) doText = dm[1].trim();
      const em = lines[j].match(/^\s*expect:\s*(.+)$/);
      if (em) expectText = em[1].trim();
    }
    steps.push({ id, doText, expectText });
  }
  if (steps.length < 2) continue; // 번들만 대상
  for (const s of steps) {
    const nm = s.id.match(/^tc(\d+)/);
    if (!nm) continue;
    const cn = Number(nm[1]);
    if (!excel.has(cn)) continue;
    if (realTc.has(cn) || covers.has(cn)) continue; // 이미 검증/크레딧
    // 개별 파일 경로
    const name = `tc${cn}-${slug(s.doText || s.id)}`;
    const outRel = `atcs/${domain}/${name}.atc.yml`;
    if (existsSync(join(ROOT, outRel))) continue;
    toCreate.push({ outRel, cn, id: s.id, doText: s.doText, expectText: s.expectText, priority, srcRel: rel });
    perDomain.set(domain, (perDomain.get(domain) || 0) + 1);
  }
}

console.log(`총 생성 예정: ${toCreate.length} 파일`);
for (const [d, n] of [...perDomain.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${d.padEnd(24)} : ${n}`);

if (DRY) { console.log('\n(dry-run — 파일 생성 안 함)'); process.exit(0); }

// 5) 생성
// YAML plain scalar 로 안전하지 않으면 single-quote (한글+double-quote 는 parser throw 라 single 만 사용).
function yk(v) {
  const s = String(v).replace(/"/g, "'").trim();
  const unsafe = /^[%@`*&!|>?\-\[\]{},#'"\s]/.test(s) || /:(\s|$)/.test(s) || /\s#/.test(s) || /[\n]/.test(s);
  return unsafe ? `'${s.replace(/'/g, "''")}'` : s;
}

const seen = new Set();
let written = 0;
for (const t of toCreate) {
  if (seen.has(t.outRel)) continue; // 같은 do→같은 슬러그 중복 방지(번호 prefix 로 보통 unique)
  seen.add(t.outRel);
  const doRaw = (t.doText || t.id);
  let y = '';
  y += `# 개별 분리 ATC — 원본 번들: ${t.srcRel}\n`;
  y += `# spec(실행) 미구현. 사용자가 별도 작성 예정.\n\n`;
  y += `title: ${yk(doRaw)}\n`;
  if (t.priority) y += `priority: ${t.priority}\n`;
  y += `inputs: {}\n`;
  y += `steps:\n`;
  y += `  - id: ${t.id}\n`;
  y += `    do: ${yk(doRaw)}\n`;
  if (t.expectText) y += `    expect: ${yk(t.expectText)}\n`;
  if (t.expectText) y += `expected: ${yk(t.expectText)}\n`;
  writeFileSync(join(ROOT, t.outRel), y, 'utf8');
  written++;
}
console.log(`\n생성 완료: ${written} 파일`);
