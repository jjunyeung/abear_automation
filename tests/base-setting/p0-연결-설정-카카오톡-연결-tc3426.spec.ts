/**
 * AI 상품수집 완료 알림 받기 토글 클릭 시 on 상태 후 off 상태로 전환되며 기능 제한 모달 노출 확인 — 개별 TC tc3426_func-토글-동작 mirror spec.
 * 번들 spec(tests/base-setting/p0-연결-설정-카카오톡-연결.spec.ts) 의 진입+reachable 동작을 복제한 얕은 spec.
 * 실제 액션 자동화는 별도 deepen 작업 (번들도 noop skip).
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', "base-setting", "p0-연결-설정-카카오톡-연결-tc3426.atc.yml");
const URL = "https://app.windly.cc/view3/base-setting?setting=COMMON&category=PRODUCT_DETAIL";

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
  "tc3426_func-토글-동작": verifyPageReachable,
};

test("AI 상품수집 완료 알림 받기 토글 클릭 시 on 상태 후 off 상태로 전환되며 기능 제한 모달 노출 확인 — tc3426_func-토글-동작 진입+reachable mirror", async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
