/**
 * 비슷한 상품 찾기 모달 내 각 상품 카드 정보 (썸네일, 상품명, 가격) 노출 확인 — 개별 TC tc3750_상품-카드-상세 mirror spec.
 * 번들 spec(tests/collected-product/p2-인-상-추-비슷한-상품-찾기-모달.spec.ts) 의 진입+reachable 동작을 복제한 얕은 spec.
 * 실제 액션 자동화는 별도 deepen 작업 (번들도 noop skip).
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', "collected-product", "p2-인-상-추-비슷한-상품-찾기-모달-tc3750.atc.yml");
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
  "tc3750_상품-카드-상세": verifyPageReachable,
};

test("비슷한 상품 찾기 모달 내 각 상품 카드 정보 (썸네일, 상품명, 가격) 노출 확인 — tc3750_상품-카드-상세 진입+reachable mirror", async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
