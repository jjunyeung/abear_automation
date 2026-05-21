/**
 * Tosstoss 신청서 신청완료 버튼 가시 검증.
 *
 * 대응 ATC : atcs/settings/da-submit-button-visible.atc.yml
 * TC 원본  : Case No 1457 / 배송대행지 › 신청서 작성 / P0
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
  
} from './_da-application-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'delivery-agency', 'da-submit-button-visible.atc.yml');

const verifyVisibleStep: StepHandler = async (page) => {
  const el = page.getByText(/^\s*저장\s*$/).first();
  try {
    await el.waitFor({ state: 'visible', timeout: 5_000 });
    return { ok: true as const };
  } catch {
    return { ok: false as const, error_key: 'submit_button_visible_missing' as ErrorKey, message: 'label 텍스트 미노출' };
  }
};

const handlers: StepHandlers = {
  open_tosstoss_application: goToTosstossApplicationStep,
  add_manual_form: addManualFormStep,
  verify_visible: verifyVisibleStep,
};

test('토스토스 신청서 신청완료 버튼 가시', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
