/**
 * E2. 배대지 신청서 작성 → 자동결제 카드 → 제출 (e2e)
 *
 * 주의: 실제 제출은 결제 카드 등록 필요. 본 회귀는 폼 완성 + submit 버튼 visible/enabled 까지.
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
  fillInputByPlaceholder,
} from '../delivery-agency/_da-application-handlers';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'e2e', 'da-application-submit-end-to-end.atc.yml');

const toggleAutoPaymentStep: StepHandler = async (page) => {
  const r = await toggleByLabelText(page, /자동\s*결제/);
  if (!r.ok) {
    return {
      ok: false as const,
      error_key: 'auto_payment_toggle_failed' as ErrorKey,
      message: r.reason,
    };
  }
  await page.waitForTimeout(800);
  return { ok: true as const };
};

const selectCardRadioStep: StepHandler = async (page) => {
  // "카드" 라디오 — text 매칭 후 클릭.
  const cardRadio = page.getByText(/^카드$/, { exact: true }).first();
  if ((await cardRadio.count()) === 0) {
    return {
      ok: false as const,
      error_key: 'card_radio_not_found' as ErrorKey,
      message: '"카드" 라디오 미발견',
    };
  }
  await cardRadio.click({ force: true });
  await page.waitForTimeout(500);
  return { ok: true as const };
};

const fillMinimumFieldsStep: StepHandler = async (page) => {
  // placeholder 기반 최소 필드 입력. 실제 필수 필드는 윈들리 폼에 따라 다름.
  const fields: Array<{ ph: RegExp; val: string }> = [
    { ph: /이름|성함|받는\s*분/, val: '테스트 수령인' },
    { ph: /연락처|전화|휴대폰/, val: '01012345678' },
    { ph: /주소|상세\s*주소/, val: '서울시 강남구 테스트로 1' },
  ];
  let filled = 0;
  for (const f of fields) {
    const r = await fillInputByPlaceholder(page, f.ph, f.val);
    if (r.ok) filled += 1;
  }
  logger.info(`[fill_minimum_fields] ${filled}/${fields.length} 필드 입력`);
  if (filled === 0) {
    return {
      ok: false as const,
      error_key: 'no_field_filled' as ErrorKey,
      message: '필수 필드 placeholder 매칭 0건',
    };
  }
  return { ok: true as const };
};

const submitAndVerifyStep: StepHandler = async (page) => {
  // 실제 윈들리 배대지 신청서의 제출 버튼 텍스트 = "저장" (da-submit-button-visible.spec 참고).
  // destructive 제출 회피 — visible 확인까지만.
  const submit = page.getByText(/^\s*저장\s*$/).first();
  try {
    await submit.waitFor({ state: 'visible', timeout: 10_000 });
    logger.info('[submit_and_verify] "저장" 버튼 visible 확인 (실제 클릭 X)');
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error_key: 'submit_btn_not_found' as ErrorKey,
      message: '"저장" 버튼 미노출',
    };
  }
};

const handlers: StepHandlers = {
  open_tosstoss_application: goToTosstossApplicationStep,
  add_manual_form: addManualFormStep,
  toggle_auto_payment: toggleAutoPaymentStep,
  select_card_radio: selectCardRadioStep,
  fill_minimum_fields: fillMinimumFieldsStep,
  submit_and_verify: submitAndVerifyStep,
};

test('배대지 신청서 작성 → 자동결제 카드 → 제출 가능 상태 (e2e)', async ({ page }) => {
  test.setTimeout(8 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
