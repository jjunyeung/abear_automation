/**
 * URL pool — 매 ATC 실행마다 새 URL 이 필요한 시나리오 (e.g. e2e/url-collect-and-ai-fix) 를
 * 자동화하기 위한 파일 백엔드 큐.
 *
 * 모델:
 *   - 저장: `data/url-pool.txt` (프로젝트 루트). 한 줄 = 한 URL.
 *   - 코멘트 (`#` 시작) / 빈 줄 / 앞뒤 공백은 무시.
 *   - 순서 = FIFO (위에서 아래로 consume).
 *   - 같은 URL 중복은 add 시점에 1차로 제거 (대소문자 sensitive 비교).
 *
 * 동시성:
 *   - 단일 사용자 / Electron 메인 1 프로세스 / spawn 1 active (INV-6) 라 spec 이
 *     동시에 둘이 같은 URL 을 pop 하는 race 는 발생하지 않는다. 단 GUI 메인이
 *     읽기/쓰기 사이에 user 가 GUI 에서 추가하는 등은 race 가 있지만 마지막 write
 *     가 이김 (acceptable — 사용자 수동 액션이라 손실 시 즉시 인지).
 *
 * 의도적으로 lib 핵심에만 의존하지 않음 — INV-3 단방향 (`gui → lib`) 유지.
 * GUI 메인은 `lib/url-pool` 만 import (renderer/preload 직접 사용 금지 — IPC 경유).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';

/**
 * 프로젝트 루트 (= package.json 가 있는 디렉토리) 를 walk-up 으로 찾는다.
 * 다른 lib 모듈 (test-fixture 등) 과 같은 패턴.
 */
function resolveRepoRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(__dirname, '..');
}

const POOL_FILE = path.join(resolveRepoRoot(), 'data', 'url-pool.txt');

function ensureDir(): void {
  const dir = path.dirname(POOL_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function readLines(): string[] {
  if (!existsSync(POOL_FILE)) return [];
  const raw = readFileSync(POOL_FILE, 'utf8');
  return raw.split(/\r?\n/);
}

/** 코멘트/빈 줄 제외한 의미 있는 URL 목록을 반환. */
export function listPool(): string[] {
  const lines = readLines();
  const out: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    if (trimmed.startsWith('#')) continue;
    out.push(trimmed);
  }
  return out;
}

function writeAll(urls: readonly string[]): void {
  ensureDir();
  const body = urls.length === 0 ? '' : `${urls.join('\n')}\n`;
  writeFileSync(POOL_FILE, body, { encoding: 'utf8' });
}

/**
 * 실제 상품 페이지 URL 호스트 화이트리스트. 광고/추적/검색 URL 은 거부.
 * Tier 3 e2e (A1 taobao, A2 tmall, A3 rakuten) 가 의도한 상품 URL 만 풀에 들어가도록.
 *
 * 패턴 매칭 (URL 의 origin + pathname prefix 검증):
 *   - 타오바오:  item.taobao.com/item.htm
 *   - 티몰:      detail.tmall.com/item.htm
 *   - 라쿠텐:    item.rakuten.co.jp/<shop>/<sku>/
 *
 * 차단되는 대표 패턴:
 *   - click.mz.simba.taobao.com (광고 추적)
 *   - s.taobao.com (검색)
 *   - tmall.com 의 다른 경로
 */
export interface UrlValidation {
  ok: boolean;
  reason?: string;
}

export function validateProductUrl(raw: string): UrlValidation {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { ok: false, reason: '유효한 URL 아님' };
  }
  const host = u.hostname.toLowerCase();
  const pathStartsWith = (p: string) => u.pathname === p || u.pathname.startsWith(p);

  if (host === 'item.taobao.com' && pathStartsWith('/item.htm')) return { ok: true };
  if (host === 'detail.tmall.com' && pathStartsWith('/item.htm')) return { ok: true };
  if (host === 'item.rakuten.co.jp' && /^\/[^/]+\/[^/]+\/?$/.test(u.pathname)) return { ok: true };

  return {
    ok: false,
    reason: `지원 host 아님: ${host}${u.pathname} (item.taobao.com/item.htm | detail.tmall.com/item.htm | item.rakuten.co.jp/<shop>/<sku>/ 만 허용)`,
  };
}

/**
 * 새 URL 들을 풀 뒤에 append. 빈 줄/공백/중복/잘못된 host 자동 거름.
 *
 * 반환의 rejected 는 호출자 (GUI) 에서 사용자에게 표시.
 */
export function addToPool(
  urls: readonly string[],
): { added: number; total: number; rejected: Array<{ url: string; reason: string }> } {
  const cleaned = urls
    .map((u) => u.trim())
    .filter((u) => u.length > 0 && !u.startsWith('#'));
  if (cleaned.length === 0) {
    return { added: 0, total: listPool().length, rejected: [] };
  }
  const existing = listPool();
  const seen = new Set<string>(existing);
  const rejected: Array<{ url: string; reason: string }> = [];
  let added = 0;
  for (const u of cleaned) {
    if (seen.has(u)) continue;
    const v = validateProductUrl(u);
    if (!v.ok) {
      rejected.push({ url: u, reason: v.reason ?? '잘못된 URL' });
      continue;
    }
    existing.push(u);
    seen.add(u);
    added += 1;
  }
  writeAll(existing);
  return { added, total: existing.length, rejected };
}

/**
 * 정확 매치되는 URL 을 풀에서 제거 (모든 occurrence). 매치 없으면 no-op.
 */
export function removeFromPool(url: string): { removed: number; total: number } {
  const target = url.trim();
  if (target.length === 0) {
    return { removed: 0, total: listPool().length };
  }
  const existing = listPool();
  const next = existing.filter((u) => u !== target);
  const removed = existing.length - next.length;
  if (removed > 0) writeAll(next);
  return { removed, total: next.length };
}

/**
 * 풀의 head URL 을 pop 해서 반환. 풀이 비어 있으면 null. 시도 시점에 consume —
 * 호출자 (run-queue) 가 spawn 직전 한 번 호출. 성공/실패 무관 풀에서 제거 (정책:
 * `.url-collect-history.log` 와 동일 — 시도 시점 consume).
 */
export function headPop(): string | null {
  const existing = listPool();
  if (existing.length === 0) return null;
  const head = existing.shift() as string;
  writeAll(existing);
  return head;
}

/** 테스트/디버깅 용 — 풀 파일 경로 공개. GUI 에 절대경로 노출은 하지 않는다. */
export function getPoolFilePath(): string {
  return POOL_FILE;
}
