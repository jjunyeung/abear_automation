/**
 * Tosstoss 신청서 자동결제 카드 검증.
 *
 * 대응 ATC : atcs/settings/da-auto-payment-card.atc.yml
 * TC 원본  : Case No 1450 / 배송대행지 › 신청서 작성 › 결제옵션 / P0
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
  toggleByLabelText,
} from './_da-application-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'delivery-agency', 'da-auto-payment-card.atc.yml');

const toggleAutoPaymentStep: StepHandler = async (page) => {
  const r = await toggleByLabelText(page, /^\s*자동결제신청\s*$/);
  if (!r.ok) return { ok: false as const, error_key: 'auto_payment_label_missing' as ErrorKey, message: r.reason };
  await page.waitForTimeout(400);
  return { ok: true as const };
};

const selectCardRadioStep: StepHandler = async (page) => {
  const r = await toggleByLabelText(page, /^\s*카드\s*$/);
  if (!r.ok) return { ok: false as const, error_key: 'card_radio_missing' as ErrorKey, message: r.reason };
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_tosstoss_application: goToTosstossApplicationStep,
  add_manual_form: addManualFormStep,
  toggle_auto_payment: toggleAutoPaymentStep,
  select_card_radio: selectCardRadioStep,
};

test('토스토스 자동결제 카드', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
