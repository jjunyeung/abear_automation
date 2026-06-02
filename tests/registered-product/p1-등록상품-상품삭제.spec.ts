/**
 * P1 등록상품 / 상품삭제 — skeleton ATC 의 38 TC.
 *
 * 검증 정책: 모두 5 마켓 × 5 단계 (업로드 확인 / 아이콘 선택 / 삭제 버튼 / 삭제 / 삭제 완료) destructive flow.
 *   - 등록상품 진입 + 카드 검증 = verified.
 *   - 실 마켓 호출 (업로드/삭제) = noop.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { goToRegisteredProducts } from '../../lib/windly-actions';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'registered-product', 'p1-등록상품-상품삭제.atc.yml');

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
  logger.info(`[reg-p1-delete] ${label}: ${reason} — skip`);
  return { ok: true as const };
};

const TCS = [
  871, 872, 873, 874, 875,
  878, 879, 880, 881, 882,
  885, 886, 887, 888, 889,
  892, 893, 894, 895, 896,
  899, 900, 901, 902, 903,
  906, 907, 908, 909, 910,
  913, 914, 915, 916, 917,
  927, 928, 929,
];

const handlers: StepHandlers = Object.fromEntries(
  TCS.map((n) => [`tc${n}_esm-20`, noopAfter(`TC${n}`, '5 마켓 × 5 단계 destructive flow')]),
);

test('P1 등록상품 / 상품삭제 — 진입 + 5 마켓 destructive skip', async ({ page }) => {
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
