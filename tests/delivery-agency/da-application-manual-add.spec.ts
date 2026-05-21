/**
 * Tosstoss 신청서 수동 추가 검증.
 *
 * 대응 ATC : atcs/settings/da-application-manual-add.atc.yml
 * TC 원본  : Case No 1381 / 배송대행지 › 신청서 작성 › 수동으로 추가하기 / P0
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

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'delivery-agency',
  'da-application-manual-add.atc.yml',
);

const verifyFormAddedStep: StepHandler = async (page) => {
  // 양식 추가 시 "원본 상품의 URL" placeholder input 가시.
  const urlInput = page.getByPlaceholder(/원본\s*상품의\s*URL/).first();
  try {
    await urlInput.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'form_input_not_visible' as ErrorKey,
      message: '양식 추가 후에도 원본 상품의 URL placeholder input 미노출',
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_tosstoss_application: goToTosstossApplicationStep,
  add_manual_form: addManualFormStep,
  verify_form_added: verifyFormAddedStep,
};

test('토스토스 신청서 수동 추가', async ({ page }) => {
  test.setTimeout(3 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
