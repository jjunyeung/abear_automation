/**
 * P2 배송대행지 / 상태 — skeleton ATC 의 1 TC (탭 동작).
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'delivery-agency', 'p2-배송대행지-상태.atc.yml');
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
      message: '배송대행지 페이지 텍스트 미노출',
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  'tc1368_센터-주소-확인': enterPage,
};

test('P2 배송대행지 / 상태 — 페이지 진입', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
