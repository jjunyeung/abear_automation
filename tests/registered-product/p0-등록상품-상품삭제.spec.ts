/**
 * P0 등록상품 / 상품삭제 (ESM 2.0) — skeleton ATC 의 15 TC (8 단계 × 2 + 삭제완료).
 *
 * 검증 정책: 모두 ESM 2.0 외부 판매자 센터 검증 = destructive + 외부 페이지. noop.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { goToRegisteredProducts } from '../../lib/windly-actions';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'registered-product', 'p0-등록상품-상품삭제.atc.yml');

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
  logger.info(`[reg-esm-delete] ${label}: ${reason} — skip`);
  return { ok: true as const };
};

const tcs = [876, 877, 883, 884, 890, 891, 897, 898, 904, 905, 911, 912, 918, 919, 923];
const handlers: StepHandlers = Object.fromEntries(
  tcs.map((n) => [`tc${n}_esm-20`, noopAfter(`TC${n}`, n === 923 ? '삭제 완료 검증' : '상품/판매자 센터 외부 페이지 확인')]),
);

test('P0 등록상품 / 상품삭제 (ESM 2.0) — 진입 + 외부 판매자 센터 검증 skip', async ({ page }) => {
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
