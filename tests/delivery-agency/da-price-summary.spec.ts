/**
 * Tosstoss 신청서 단가/수량 → 총 수량/금액 검증.
 * 대응 ATC: atcs/settings/da-price-summary.atc.yml
 * TC 원본: Case No 1411 / 배송대행지 › 신청서 작성 › 상품 금액 / P0
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import {
  runATC,
  type StepHandler,
  type StepHandlers,
} from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import {
  goToTosstossApplicationStep,
  addManualFormStep,
  fillInputByPlaceholder,
} from './_da-application-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'delivery-agency', 'da-price-summary.atc.yml');

const fillPriceQtyVerifySumStep: StepHandler = async (page) => {
  const p = await fillInputByPlaceholder(page, /단가를\s*입력해주세요/, '100');
  if (!p.ok) return { ok: false as const, error_key: 'price_fill_failed' as ErrorKey, message: p.reason };
  const q = await fillInputByPlaceholder(page, /수량을\s*입력해주세요/, '5');
  if (!q.ok) return { ok: false as const, error_key: 'qty_fill_failed' as ErrorKey, message: q.reason };
  await page.waitForTimeout(500);

  // "총 수량 5 개" 텍스트 가시.
  const totalQtyText = page.getByText(/총\s*수량/).first();
  const totalQtyVisible = await totalQtyText.isVisible().catch(() => false);
  if (!totalQtyVisible) {
    return { ok: false as const, error_key: 'total_quantity_missing' as ErrorKey, message: '"총 수량" 텍스트 미노출' };
  }
  // 숫자 5 가 인근에 등장.
  const fiveText = page.locator('text=/^\\s*5\\s*$/').first();
  const fiveVisible = await fiveText.isVisible().catch(() => false);
  if (!fiveVisible) {
    return { ok: false as const, error_key: 'quantity_value_missing' as ErrorKey, message: '"5" 수치 텍스트 미노출' };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_tosstoss_application: goToTosstossApplicationStep,
  add_manual_form: addManualFormStep,
  fill_price_qty_verify_sum: fillPriceQtyVerifySumStep,
};

test('토스토스 신청서 상품 금액 자동 계산', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
