/**
 * Tosstoss 신청서 쇼핑몰 직접입력 검증.
 * 대응 ATC: atcs/settings/da-shop-free-text.atc.yml
 * TC 원본: Case No 1455 / 배송대행지 › 신청서 작성 › 국내 쇼핑몰 직접입력 / P0
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
  selectDropdownOption,
} from './_da-application-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'delivery-agency', 'da-shop-free-text.atc.yml');

const selectShopFreeTextStep: StepHandler = async (page) => {
  const r = await selectDropdownOption(page, /쇼핑몰\s*선택/, /^\s*직접\s*입력\s*$/);
  if (!r.ok) return { ok: false as const, error_key: 'shop_free_text_select_failed' as ErrorKey, message: r.reason };
  await page.waitForTimeout(500);

  const newInput = page.getByPlaceholder(/쇼핑몰\s*이름/).first();
  try {
    await newInput.waitFor({ state: 'visible', timeout: 5_000 });
    return { ok: true as const };
  } catch {
    return { ok: false as const, error_key: 'shop_name_input_missing' as ErrorKey, message: '쇼핑몰 이름 input 미노출' };
  }
};

const handlers: StepHandlers = {
  open_tosstoss_application: goToTosstossApplicationStep,
  add_manual_form: addManualFormStep,
  select_shop_free_text: selectShopFreeTextStep,
};

test('토스토스 쇼핑몰 직접입력', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
