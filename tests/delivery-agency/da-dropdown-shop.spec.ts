/**
 * Tosstoss 신청서 국내 쇼핑몰 검증.
 *
 * 대응 ATC : atcs/settings/da-dropdown-shop.atc.yml
 * TC 원본  : Case No 1454 / 배송대행지 › 신청서 작성 / P0
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

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'delivery-agency', 'da-dropdown-shop.atc.yml');

const selectTargetDropdownStep: StepHandler = async (page) => {
  const r = await selectDropdownOption(page, /쇼핑몰\s*선택/, /^(네이버|쿠팡|11번가|G마켓|옥션|티몰|타오바오|스마트스토어|인스타|블로그|이메일|문자|배송|기타)$/);
  if (!r.ok) return { ok: false as const, error_key: 'dropdown_shop_failed' as ErrorKey, message: r.reason };
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_tosstoss_application: goToTosstossApplicationStep,
  add_manual_form: addManualFormStep,
  select_target_dropdown: selectTargetDropdownStep,
};

test('토스토스 신청서 국내 쇼핑몰', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
