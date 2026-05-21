/**
 * Tosstoss 신청서 FTA 세율 적용 검증.
 *
 * 대응 ATC : atcs/settings/da-toggle-fta.atc.yml
 * TC 원본  : Case No 1452 / 배송대행지 › 신청서 작성 / P0
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

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'delivery-agency', 'da-toggle-fta.atc.yml');

const toggleTargetStep: StepHandler = async (page) => {
  const r = await toggleByLabelText(page, /현지\s*FTA\s*세율\s*적용\s*여부/);
  if (!r.ok) return { ok: false as const, error_key: 'toggle_fta_failed' as ErrorKey, message: r.reason };
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_tosstoss_application: goToTosstossApplicationStep,
  add_manual_form: addManualFormStep,
  toggle_target: toggleTargetStep,
};

test('토스토스 신청서 FTA 세율 적용', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
