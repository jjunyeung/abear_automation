/**
 * 기본설정 톡스토어 A/S 전화번호 형식 에러 검증.
 *
 * 대응 ATC: atcs/settings/talkstore-base-as-phone-format-error.atc.yml
 * TC 원본: Case No 1041 / 기본설정 › 톡스토어 › a/s 정보 / P0
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
  gotoTalkstoreBaseSettingStep,
  findFieldInputByExactLabel,
} from './_talkstore-base-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'base-setting', 'talkstore-base-as-phone-format-error.atc.yml');

let originalPhone = '';

const inputInvalidPhoneStep: StepHandler = async (page) => {
  const input = await findFieldInputByExactLabel(page, 'A/S 전화번호');
  if (!input) {
    return {
      ok: false as const,
      error_key: 'as_phone_input_not_found' as ErrorKey,
      message: 'A/S 전화번호 input 매칭 X',
    };
  }
  originalPhone = await input.evaluate((el) => (el as HTMLInputElement).value);
  // 잘못된 형식: phoneRegex 만족 X (alphabet 포함).
  // 단 onChange 에서 [^0-9-] 필터링됨 — 영문자 막힘. 그러므로 짧은 숫자 (예: '123') 로 시도.
  await input.evaluate((el) => {
    const inp = el as HTMLInputElement;
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    nativeSetter.call(inp, '123');
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.dispatchEvent(new Event('blur', { bubbles: true }));
  });
  await page.waitForTimeout(500);
  return { ok: true as const };
};

const verifyFormatErrorShownStep: StepHandler = async (page) => {
  // helpMessage = "연락처 형식이 올바르지 않습니다."
  const errorText = page.getByText(/연락처\s*형식이\s*올바르지/).first();
  try {
    await errorText.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'format_error_not_shown' as ErrorKey,
      message: '연락처 형식 에러 메시지 미노출',
    };
  }
  return { ok: true as const };
};

const inputValidPhoneStep: StepHandler = async (page) => {
  const input = await findFieldInputByExactLabel(page, 'A/S 전화번호');
  if (!input) return { ok: true as const };
  await input.evaluate((el, v) => {
    const inp = el as HTMLInputElement;
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    nativeSetter.call(inp, v);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.dispatchEvent(new Event('blur', { bubbles: true }));
  }, originalPhone || '010-1234-5678');
  await page.waitForTimeout(400);
  return { ok: true as const };
};

const handlers: StepHandlers = {
  goto_delivery_tab: gotoTalkstoreBaseSettingStep('DELIVERY_AND_AS'),
  input_invalid_phone: inputInvalidPhoneStep,
  verify_format_error_shown: verifyFormatErrorShownStep,
  input_valid_phone: inputValidPhoneStep,
};

test('기본설정 톡스토어 A/S 전화번호 형식 에러', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
