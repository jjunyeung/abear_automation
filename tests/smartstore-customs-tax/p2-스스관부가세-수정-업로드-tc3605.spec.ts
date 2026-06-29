/**
 * 여러 등록상품 선택 시에도 수정 업로드 모달이 정상 동작한다 — 개별 TC tc3605_상품-수-기준-다건-처리 mirror spec.
 * 번들 spec(tests/smartstore-customs-tax/p2-스스관부가세-수정-업로드.spec.ts) 의 진입+reachable 동작을 복제한 얕은 spec.
 * 실제 액션 자동화는 별도 deepen 작업 (번들도 noop skip).
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', "smartstore-customs-tax", "p2-스스관부가세-수정-업로드-tc3605.atc.yml");
const URL = "https://app.windly.cc/view2/registered-product";

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
  "tc3605_상품-수-기준-다건-처리": verifyPageReachable,
};

test("여러 등록상품 선택 시에도 수정 업로드 모달이 정상 동작한다 — tc3605_상품-수-기준-다건-처리 진입+reachable mirror", async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
