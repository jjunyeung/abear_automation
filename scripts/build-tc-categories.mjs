/**
 * 엑셀 TC export → tc-categories.json 생성.
 * 각 Case No 의 카테고리 트리(Category / Main Category / Sub-category / Sub-function) 를
 * 그대로 박제. GUI catalog 가 이걸 읽어 "엑셀처럼" 분류한다.
 *
 *   node scripts/build-tc-categories.mjs [xlsx경로]
 *   기본 xlsx = /Users/a1/Downloads/test_cases_export_2026-05-19 (1).xlsx
 */
import { writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const xlsx = process.argv[2] || '/Users/a1/Downloads/test_cases_export_2026-05-19 (1).xlsx';
if (!existsSync(xlsx)) { console.error('xlsx 없음:', xlsx); process.exit(1); }

const xml = execSync(`unzip -p "${xlsx}" xl/worksheets/sheet1.xml`, { maxBuffer: 64 * 1024 * 1024 }).toString();
const dec = (s) => String(s || '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

const out = {};
let n = 0;
for (const r of xml.split('<row ').slice(1)) {
  const c = {};
  for (const m of r.matchAll(/<c r="([A-J])\d+"[^>]*>(?:<v>([\s\S]*?)<\/v>)?<\/c>/g)) c[m[1]] = m[2] !== undefined ? m[2] : '';
  if (!c.A || c.A === 'Case No') continue;
  out[Number(c.A)] = {
    category: dec(c.B).trim(),     // B: Category (일반/스스관부가세/…)
    main: dec(c.C).trim(),         // C: Main Category (수집상품/상품수집/…)
    sub: dec(c.D).trim(),          // D: Sub-category (상품 상세페이지/톡스토어/…)
    fn: dec(c.E).trim(),           // E: Sub-function
  };
  n += 1;
}
writeFileSync('tc-categories.json', JSON.stringify(out, null, 0) + '\n', 'utf8');
console.log(`tc-categories.json 생성: ${n} TC`);
