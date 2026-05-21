/**
 * Tosstoss 신청서 배대지 지점 드롭다운 동작.
 *
 * 대응 ATC : atcs/settings/da-dropdown-region.atc.yml
 * TC 원본  : Case No 1397 / 배송대행지 › 신청서 작성 › 배대지 지점 / P0
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

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'delivery-agency',
  'da-dropdown-region.atc.yml',
);

const PLACEHOLDER_RE = /지점을\s*선택해\s*주세요/;

const selectRegionStep: StepHandler = async (page) => {
  const r = await selectDropdownOption(page, PLACEHOLDER_RE, /^(칭다오|광저우|웨이하이B2B|오리건|캘리포니아|영국|독일|도쿄)$/);
  if (!r.ok) {
    return {
      ok: false as const,
      error_key: 'region_dropdown_failed' as ErrorKey,
      message: r.reason,
    };
  }
  const stillPlaceholder = await page.getByText(PLACEHOLDER_RE).first().isVisible().catch(() => false);
  if (stillPlaceholder) {
    return {
      ok: false as const,
      error_key: 'region_not_selected' as ErrorKey,
      message: '옵션 클릭 후에도 placeholder 가시',
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_tosstoss_application: goToTosstossApplicationStep,
  add_manual_form: addManualFormStep,
  select_region_dropdown: selectRegionStep,
};

test('토스토스 신청서 배대지 지점 드롭다운', async ({ page }) => {
  test.setTimeout(3 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
