/**
 * Tosstoss 신청서 트래킹번호 2개 추가 검증.
 *
 * 대응 ATC : atcs/settings/da-tracking-add-twice.atc.yml
 * TC 원본  : Case No 1387 / 배송대행지 › 신청서 작성 › 추가입력 / P0
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

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'delivery-agency', 'da-tracking-add-twice.atc.yml');

const addTwoTrackingNumbersStep: StepHandler = async (page) => {
  const input = page.getByPlaceholder(/중국\s*운송사의\s*운송번호/).first();
  await input.waitFor({ state: 'visible', timeout: 5_000 });

  // 1번째: TRK111
  await input.click();
  await input.fill('');
  await input.pressSequentially('TRK111', { delay: 5 });
  const inputBtn = page.getByRole('button', { name: /^입력$/ }).first();
  await inputBtn.click();
  await page.waitForTimeout(400);

  // 2번째: TRK222
  await input.click();
  await input.fill('');
  await input.pressSequentially('TRK222', { delay: 5 });
  await inputBtn.click();
  await page.waitForTimeout(400);

  // 양쪽 다 노출. 추가된 텍스트는 페이지 어딘가 가시.
  const trk1 = page.getByText('TRK111').first();
  const trk2 = page.getByText('TRK222').first();
  try {
    await trk1.waitFor({ state: 'visible', timeout: 5_000 });
    await trk2.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'tracking_not_listed' as ErrorKey,
      message: '추가된 트래킹번호 텍스트 미노출',
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_tosstoss_application: goToTosstossApplicationStep,
  add_manual_form: addManualFormStep,
  add_two_tracking_numbers: addTwoTrackingNumbersStep,
};

test('토스토스 신청서 트래킹번호 2개 추가', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
