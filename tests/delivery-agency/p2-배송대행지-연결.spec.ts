/**
 * P2 배송대행지 / 연결 — skeleton ATC 의 3 TC (배송대행지 화면 확인).
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'delivery-agency', 'p2-배송대행지-연결.atc.yml');
const URL = 'https://app.windly.cc/view3/delivery-agency';

const enterPage: StepHandler = async (page) => {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);
  const body = await page.evaluate(() => document.body.innerText);
  if (!body.includes('배송대행')) {
    return {
      ok: false as const,
      error_key: 'da_page_missing' as ErrorKey,
      message: '배송대행지 페이지 미노출',
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  'tc1355_카카오톡-주문알림': enterPage,
  'tc1356_카카오톡-주문알림': enterPage,
  'tc1357_카카오톡-주문알림': enterPage,
};

test('P2 배송대행지 / 연결 — 페이지 진입 검증', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
