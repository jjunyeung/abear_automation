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
 * 새 URL 들을 풀 뒤에 append. 빈 줄/공백/중복은 자동 정리 (기존 풀 + 신규 머지 후 dedupe,
 * 순서는 첫 등장 순서 유지). 잘못된 URL 검증은 호출자 (GUI) 책임 — 여기서는 단순 보관소.
 */
export function addToPool(urls: readonly string[]): { added: number; total: number } {
  const cleaned = urls
    .map((u) => u.trim())
    .filter((u) => u.length > 0 && !u.startsWith('#'));
  if (cleaned.length === 0) {
    return { added: 0, total: listPool().length };
  }
  const existing = listPool();
  const seen = new Set<string>(existing);
  let added = 0;
  for (const u of cleaned) {
    if (seen.has(u)) continue;
    existing.push(u);
    seen.add(u);
    added += 1;
  }
  writeAll(existing);
  return { added, total: existing.length };
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
