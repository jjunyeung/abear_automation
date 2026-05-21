/**
 * 톡스토어 상품명 input 값 입력 동작 검증.
 *
 * 대응 ATC: atcs/collect/talkstore-product-name-input.atc.yml
 * TC 원본: Case No 1081, 1084 / 수집상품 › 톡스토어 › 기본정보 / P0
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
  openFirstCollectedProductStep,
  clickTabByLabelStep,
  findFieldInputByExactLabel,
} from './_talkstore-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'collected-product', 'talkstore-product-name-input.atc.yml');

const inputTalkstoreNameStep: StepHandler = async (page) => {
  const input = await findFieldInputByExactLabel(page, '톡스토어', 0);
  if (!input) {
    return {
      ok: false as const,
      error_key: 'talkstore_name_input_missing' as ErrorKey,
      message: '톡스토어 상품명 input 매칭 X',
    };
  }
  // 현재 값 백업.
  const originalValue = await input.evaluate((el) => (el as HTMLInputElement).value);

  // React controlled input — native setter 로 value set + input event dispatch.
  const testValue = 'ATC 테스트 상품명';
  await input.evaluate((el, v) => {
    const inp = el as HTMLInputElement;
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    nativeSetter.call(inp, v);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }, testValue);
  await page.waitForTimeout(400);

  const newValue = await input.evaluate((el) => (el as HTMLInputElement).value);
  if (!newValue.includes('테스트') && !newValue.includes('ATC')) {
    return {
      ok: false as const,
      error_key: 'talkstore_name_input_not_reflected' as ErrorKey,
      message: `입력값 반영 X (after=${newValue})`,
    };
  }

  // 원복 — 원래 값으로 되돌림 + onBlur 트리거.
  await input.evaluate((el, v) => {
    const inp = el as HTMLInputElement;
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    nativeSetter.call(inp, v);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.dispatchEvent(new Event('blur', { bubbles: true }));
  }, originalValue);
  await page.waitForTimeout(400);

  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_first_collected_product: openFirstCollectedProductStep,
  click_info_tab: clickTabByLabelStep(/^기본\s*정보$/),
  input_talkstore_name: inputTalkstoreNameStep,
};

test('톡스토어 상품명 입력', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
