#!/usr/bin/env node
/**
 * URL pool 정리 — validateProductUrl 통과 못하는 URL 제거.
 *
 * 사용:
 *   node scripts/clean-url-pool.mjs           # dry-run (출력만, 변경 X)
 *   node scripts/clean-url-pool.mjs --apply   # 실제 변경
 *
 * 정리 대상:
 *   - 광고/추적 (click.mz.simba.taobao.com 등)
 *   - 검색 (s.taobao.com 등)
 *   - host 화이트리스트 미일치
 */

import { readFileSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const POOL_FILE = path.join(REPO_ROOT, 'data', 'url-pool.txt');

function validateProductUrl(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    return { ok: false, reason: '유효한 URL 아님' };
  }
  const host = u.hostname.toLowerCase();
  const path = u.pathname;
  if (host === 'item.taobao.com' && (path === '/item.htm' || path.startsWith('/item.htm'))) {
    return { ok: true };
  }
  if (host === 'detail.tmall.com' && (path === '/item.htm' || path.startsWith('/item.htm'))) {
    return { ok: true };
  }
  if (host === 'item.rakuten.co.jp' && /^\/[^/]+\/[^/]+\/?$/.test(path)) {
    return { ok: true };
  }
  return { ok: false, reason: `${host}${path}` };
}

const raw = readFileSync(POOL_FILE, 'utf8');
const lines = raw.split(/\r?\n/);
const keep = [];
const drop = [];
for (const line of lines) {
  const t = line.trim();
  if (t.length === 0 || t.startsWith('#')) continue;
  const v = validateProductUrl(t);
  if (v.ok) keep.push(t);
  else drop.push({ url: t.slice(0, 80) + (t.length > 80 ? '...' : ''), reason: v.reason });
}

const apply = process.argv.includes('--apply');
const byReason = {};
for (const d of drop) {
  byReason[d.reason] = (byReason[d.reason] ?? 0) + 1;
}

console.log(`풀 파일: ${POOL_FILE}`);
console.log(`전체: ${keep.length + drop.length}개`);
console.log(`KEEP: ${keep.length}개`);
console.log(`DROP: ${drop.length}개`);
console.log('');
console.log('DROP 사유별 분포:');
for (const [reason, count] of Object.entries(byReason).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${count}개  ${reason}`);
}

if (drop.length > 0 && drop.length <= 10) {
  console.log('');
  console.log('DROP 샘플:');
  for (const d of drop.slice(0, 10)) console.log(`  ✗ ${d.url}`);
}

if (apply) {
  const body = keep.length === 0 ? '' : keep.join('\n') + '\n';
  writeFileSync(POOL_FILE, body, 'utf8');
  console.log('');
  console.log('✓ 변경 적용 — 풀에 KEEP 만 남음.');
} else {
  console.log('');
  console.log('dry-run 모드. 실제 변경하려면: node scripts/clean-url-pool.mjs --apply');
}
