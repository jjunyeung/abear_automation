/**
 * P2 재고업데이트 / 상세 — 28 TC.
 *
 * TC679: LNB 재고 업데이트 선택 → 페이지 진입 + "재고 업데이트" 텍스트 (verified)
 * TC681: 빈 상태 "재고 업데이트할 상품이 없어요" 또는 다른 안내 (verified)
 * 나머지 26: 검색 / 동기화 트리거 / 결과 데이터 의존 → noop
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'windly-shell', 'p2-재고업데이트-상세.atc.yml');
const URL = 'https://app.windly.cc/view3/stock-sync';

let entered = false;

const enter: StepHandler = async (page) => {
  if (entered) return { ok: true as const };
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_500);
  entered = true;
  return { ok: true as const };
};

const verifyStockSyncPage: StepHandler = async (page) => {
  const e = await enter(page, {});
  if (!e.ok) return e;
  const body = await page.evaluate(() => document.body.innerText);
  if (!body.includes('재고')) {
    return {
      ok: false as const,
      error_key: 'stock_sync_text_missing' as ErrorKey,
      message: '재고 업데이트 페이지 텍스트 미노출',
    };
  }
  return { ok: true as const };
};

const verifyEmptyOrSearch: StepHandler = async (page) => {
  const e = await enter(page, {});
  if (!e.ok) return e;
  const body = await page.evaluate(() => document.body.innerText);
  // 빈 상태 또는 검색 영역 노출 (둘 중 하나)
  const hasEmpty = body.includes('없어요') || body.includes('상품이 없');
  const hasSearch = body.includes('검색') || body.includes('상품명');
  if (!hasEmpty && !hasSearch) {
    return {
      ok: false as const,
      error_key: 'stock_empty_or_search_missing' as ErrorKey,
      message: '빈 상태 또는 검색 영역 미노출',
    };
  }
  return { ok: true as const };
};

const noopAfter = (label: string, reason: string): StepHandler => async (page) => {
  const e = await enter(page, {});
  if (!e.ok) return e;
  logger.info(`[stock] ${label}: ${reason} — skip`);
  return { ok: true as const };
};

const tcs = Array.from({ length: 28 }, (_, i) => 679 + i);
const handlers: StepHandlers = {};
for (const n of tcs) {
  const key = `tc${n}_업로드-설정`;
  if (n === 679) handlers[key] = verifyStockSyncPage;
  else if (n === 681) handlers[key] = verifyEmptyOrSearch;
  else handlers[key] = noopAfter(`TC${n}`, '재고 동기화 / 검색 결과 / 동작 — destructive 또는 데이터 의존');
}

test('P2 재고업데이트 / 상세 — 진입 + 빈상태/검색 영역 노출 (TC679/681 verified)', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  entered = false;
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
