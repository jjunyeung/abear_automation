/**
 * Tosstoss 도메스틱 요청사항 직접입력 검증.
 * 대응 ATC: atcs/settings/da-domestic-request-direct.atc.yml
 * TC 원본: Case No 1407 / 배송대행지 › 신청서 작성 / P0
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

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'delivery-agency', 'da-domestic-request-direct.atc.yml');

const openRequestDropdownStep: StepHandler = async (page) => {
  // Receiver dropdown 의 default selected = "(선택사항) 직접입력" (isFreeText=true 가 default).
  // 즉 dropdown 펼치지 않아도 placeholder "직접입력 선택 시 입력해 주세요." 의 free-text input 이
  // 이미 노출됨. 이 input 가시 검증.
  const newInput = page.getByPlaceholder(/직접입력\s*선택\s*시/).first();
  try {
    await newInput.waitFor({ state: 'visible', timeout: 8_000 });
    return { ok: true as const };
  } catch {
    return { ok: false as const, error_key: 'free_text_input_missing' as ErrorKey, message: 'default 직접입력 input 미노출' };
  }
};

const handlers: StepHandlers = {
  open_tosstoss_application: goToTosstossApplicationStep,
  add_manual_form: addManualFormStep,
  open_request_dropdown: openRequestDropdownStep,
};

test('토스토스 도메스틱 요청사항 직접입력', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
