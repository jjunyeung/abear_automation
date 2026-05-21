/**
 * 배송대행지 메뉴 진입 smoke — 페이지 헤더 visible 까지
 *
 * 대응 ATC: atcs/e2e/enter-delivery-agency.atc.yml
 * 생성: scripts/gen-atc-tcs (단건 TC 일괄 생성).
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';


const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'delivery-agency',
  'enter-delivery-agency.atc.yml',
);

const handlers: StepHandlers = {
  goto_delivery_agency: async (page) => {
    await page.goto('https://app.windly.cc/view3/delivery-agency', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await page.waitForTimeout(1_500);
    const header = page.getByText(/^배송대행지$/, { exact: true }).first();
    try {
      await header.waitFor({ state: 'visible', timeout: 15_000 });
    } catch {
      return {
        ok: false as const,
        error_key: 'delivery_agency_header_not_visible' as ErrorKey,
        message: '/view3/delivery-agency 진입 후 "배송대행지" 헤더 미발견',
      };
    }
    return { ok: true as const };
  },
};

test('배송대행지 메뉴 진입 smoke — 페이지 헤더 visible 까지', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
