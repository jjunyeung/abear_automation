/**
 * 스마트스토어 / 배송 및 A/S 영역 P0 검증 (non-destructive).
 *
 * 대응 ATC : atcs/base-setting/smartstore-base-delivery-and-as.atc.yml
 * TC 원본  : Case No 3467, 3471-3476, 3482-3488 / P0 (12건).
 *           3491/3492/3493 destructive skip.
 *
 * 검증 출처: windly-frontend-web view3 SmartStore DeliveryAndAfterService.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { openDropdownByLabelStep } from './_talkstore-base-handlers';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'base-setting',
  'smartstore-base-delivery-and-as.atc.yml',
);

const PAGE_URL =
  'https://app.windly.cc/view3/base-setting?setting=SMARTSTORE&category=DELIVERY_AND_AS';

const enterSmartStoreDeliveryAndAsStep: StepHandler = async (page) => {
  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
  // 사이드탭 "스마트스토어" 또는 패널 title "배송 및 A/S" 노출까지 대기.
  await page
    .getByText(/스마트스토어/)
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 })
    .catch(() => undefined);
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (!bodyText.includes('배송 및 A/S')) {
    return {
      ok: false as const,
      error_key: 'smartstore_delivery_tab_missing' as ErrorKey,
      message: '배송 및 A/S 탭 라벨 미노출 - SmartStore 사이드탭 진입 실패',
    };
  }
  return { ok: true as const };
};

function verifyDropdownLabelVisibleStep(label: string, errorKey: string): StepHandler {
  return async (page) => {
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (!bodyText.includes(label)) {
      return {
        ok: false as const,
        error_key: errorKey as ErrorKey,
        message: `드롭다운 라벨 "${label}" 미노출`,
      };
    }
    return { ok: true as const };
  };
}

const verifyAsPhoneFieldVisibleStep: StepHandler = async (page) => {
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (!bodyText.includes('A/S 전화번호')) {
    return {
      ok: false as const,
      error_key: 'as_phone_label_missing' as ErrorKey,
      message: 'A/S 전화번호 라벨 미노출',
    };
  }
  return { ok: true as const };
};

const verifyAsPhoneFieldEditableStep: StepHandler = async (page) => {
  // A/S 전화번호 label 아래 input 의 disabled 여부.
  const isEditable = await page.evaluate(() => {
    // label 텍스트 "A/S 전화번호" 가 들어간 element 의 ancestor 안 input 찾기.
    const all = Array.from(document.querySelectorAll('*'));
    const labelElt = all.find((el) => {
      for (const child of Array.from(el.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
          const t = (child.nodeValue ?? '').trim();
          if (t === 'A/S 전화번호') return true;
        }
      }
      return false;
    });
    if (!labelElt) return { found: false };
    let cur: Element | null = labelElt.parentElement;
    while (cur) {
      const inp = cur.querySelector('input:not([type="checkbox"]):not([type="radio"])') as HTMLInputElement | null;
      if (inp) return { found: true, disabled: inp.disabled, readonly: inp.readOnly };
      cur = cur.parentElement;
    }
    return { found: false };
  });
  if (!isEditable.found) {
    return {
      ok: false as const,
      error_key: 'as_phone_input_not_found' as ErrorKey,
      message: 'A/S 전화번호 input 매칭 실패',
    };
  }
  if (isEditable.disabled || isEditable.readonly) {
    return {
      ok: false as const,
      error_key: 'as_phone_input_not_editable' as ErrorKey,
      message: `A/S 전화번호 input disabled=${isEditable.disabled} readonly=${isEditable.readonly} - 입력 불가`,
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  enter_smartstore_delivery_and_as: enterSmartStoreDeliveryAndAsStep,
  verify_outbound_dropdown_visible: verifyDropdownLabelVisibleStep('출고지 목록', 'outbound_dropdown_missing'),
  open_outbound_dropdown: openDropdownByLabelStep('출고지 목록', 'outbound_dropdown'),
  verify_return_dropdown_visible: verifyDropdownLabelVisibleStep('반품지 목록', 'return_dropdown_missing'),
  open_return_dropdown: openDropdownByLabelStep('반품지 목록', 'return_dropdown'),
  verify_post_company_dropdown_visible: verifyDropdownLabelVisibleStep('택배사', 'post_company_dropdown_missing'),
  open_post_company_dropdown: openDropdownByLabelStep('택배사', 'post_company_dropdown'),
  verify_as_phone_field_visible: verifyAsPhoneFieldVisibleStep,
  verify_as_phone_field_editable: verifyAsPhoneFieldEditableStep,
};

test('[TC 3467/3471-3476/3487/3488] 기본설정 → 스마트스토어 → [배송 및 A/S] 탭 → 출고지/반품지/택배사 dropdown 열기 + A/S 전화번호 input 편집 가능 (저장 destructive 라 skip)', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
