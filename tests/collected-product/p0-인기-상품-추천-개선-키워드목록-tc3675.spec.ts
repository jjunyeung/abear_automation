/**
 * 키워드 선택 시 상품 목록 조회 — 개별 TC tc3675_키워드-선택-후-상품-조회 mirror spec.
 * 번들 spec(tests/collected-product/p0-인기-상품-추천-개선-키워드목록.spec.ts) 의 진입+reachable 동작을 복제한 얕은 spec.
 * 실제 액션 자동화는 별도 deepen 작업 (번들도 noop skip).
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', "collected-product", "p0-인기-상품-추천-개선-키워드목록-tc3675.atc.yml");
const URL = "https://app.windly.cc/view2/interested-product";

const verifyPageReachable: StepHandler = async (page) => {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);
  const length = await page.evaluate(() => document.body.innerText.length);
  if (length < 10) {
    return { ok: false as const, error_key: 'page_blank' as ErrorKey, message: `page body length ${length}` };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  "tc3675_키워드-선택-후-상품-조회": verifyPageReachable,
};

test("키워드 선택 시 상품 목록 조회 — tc3675_키워드-선택-후-상품-조회 진입+reachable mirror", async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
