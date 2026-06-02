/**
 * P0 등록상품 / 상세페이지 — skeleton ATC 의 2 TC (업로드 후 확인 destructive).
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { goToRegisteredProducts } from '../../lib/windly-actions';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'registered-product', 'p0-등록상품-상세페이지.atc.yml');

let entered = false;

const enter: StepHandler = async (page) => {
  if (entered) return { ok: true as const };
  await goToRegisteredProducts(page);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  const cardCount = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="checkbox"][id^="checkbox_"]'));
    return inputs.filter((i) => (i as HTMLInputElement).value).length;
  });
  if (cardCount === 0) {
    return {
      ok: false as const,
      error_key: 'no_registered_products' as ErrorKey,
      message: '등록상품 0건',
    };
  }
  entered = true;
  return { ok: true as const };
};

const noopAfter = (label: string, reason: string): StepHandler => async (page) => {
  const e = await enter(page, {});
  if (!e.ok) return e;
  logger.info(`[reg-detailpage-p0] ${label}: ${reason} — skip`);
  return { ok: true as const };
};

const handlers: StepHandlers = {
  tc1213: noopAfter('TC1213', '업로드 후 상세페이지 확인 — destructive (업로드 선행)'),
  'tc1220_상하단-이미지': noopAfter('TC1220', '상하단이미지 상세 확인 — 환경 의존'),
};

test('P0 등록상품 / 상세페이지 — 진입 + 상세 확인 skip', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  entered = false;
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
