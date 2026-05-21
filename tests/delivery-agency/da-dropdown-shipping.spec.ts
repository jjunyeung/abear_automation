/**
 * Tosstoss 신청서 운송방법 검증.
 *
 * 대응 ATC : atcs/settings/da-dropdown-shipping.atc.yml
 * TC 원본  : Case No 1398 / 배송대행지 › 신청서 작성 / P0
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

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'delivery-agency', 'da-dropdown-shipping.atc.yml');

const cascadeStep1: StepHandler = async (page) => {
  const r = await selectDropdownOption(page, /지점을\s*선택해\s*주세요/, /^(칭다오|광저우|웨이하이B2B|오리건|캘리포니아|영국|독일|도쿄)$/);
  if (!r.ok) return { ok: false as const, error_key: 'cascade_1_failed' as ErrorKey, message: r.reason };
  await page.waitForTimeout(800);
  return { ok: true as const };
};
const selectTargetDropdownStep: StepHandler = async (page) => {
  const r = await selectDropdownOption(page, /운송방법을\s*선택해\s*주세요/, /^(허브넷해상|자이언트해상|항공|평택해운|알뜰항공|해운)$/);
  if (!r.ok) return { ok: false as const, error_key: 'dropdown_shipping_failed' as ErrorKey, message: r.reason };
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_tosstoss_application: goToTosstossApplicationStep,
  add_manual_form: addManualFormStep,
  cascade_step_1: cascadeStep1,
  select_target_dropdown: selectTargetDropdownStep,
};

test('토스토스 신청서 운송방법', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
