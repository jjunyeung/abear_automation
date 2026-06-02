/**
 * P0 등록상품 / 등록상품 상세 — skeleton ATC 의 3 TC (모두 톡스토어 수정 업로드 destructive).
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { goToRegisteredProducts } from '../../lib/windly-actions';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'registered-product', 'p0-등록상품-등록상품-상세.atc.yml');

let entered = false;

const enterAndVerify: StepHandler = async (page) => {
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
  const e = await enterAndVerify(page, {});
  if (!e.ok) return e;
  logger.info(`[reg-detail-p0] ${label}: ${reason} — skip`);
  return { ok: true as const };
};

const handlers: StepHandlers = {
  'tc1111_수정-업로드': noopAfter('TC1111', '톡스토어 업로드 — destructive 외부 호출'),
  'tc1113_수정-업로드': noopAfter('TC1113', '톡스토어 가격/배송 수정 업로드 — destructive'),
  'tc1114_수정-업로드': noopAfter('TC1114', '톡스토어 상하단이미지 수정 업로드 — destructive'),
};

test('P0 등록상품 / 등록상품 상세 — 진입 + 톡스토어 업로드 skip', async ({ page }) => {
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
