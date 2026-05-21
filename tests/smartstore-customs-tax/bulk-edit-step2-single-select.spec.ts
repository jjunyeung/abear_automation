/**
 * 수정 업로드 모달 2단계 라디오 단일 선택 동작 검증.
 *
 * 대응 ATC : atcs/upload/bulk-edit-step2-single-select.atc.yml
 * TC 원본  : Case No 3589 / 등록상품 › 수정 업로드 › 수정 항목 단일 선택 / P0
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
  openRegisteredListStep,
  selectFirstProductStep,
  clickBulkEditButtonStep,
  enterStep2Step,
  modalNextButton,
} from './_bulk-edit-handlers';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'smartstore-customs-tax',
  'bulk-edit-step2-single-select.atc.yml',
);

const verifyStep2SingleSelectStep: StepHandler = async (page) => {
  const next = modalNextButton(page);
  // 진입 직후 selectedForm = '' → 다음 disabled.
  const beforeDisabled = await next.isDisabled().catch(() => false);
  if (!beforeDisabled) {
    return {
      ok: false as const,
      error_key: 'next_unexpectedly_enabled' as ErrorKey,
      message: 'step2 진입 직후 다음 버튼이 enabled (기대 disabled)',
    };
  }

  // 첫 EditForm 라디오 클릭. Radio 컴포넌트: input[type=radio][display:none]
  // + Label htmlFor="radio_..." + Box(onClick=onSelect) 안 text. 클릭 타겟 = Label 또는 Box.
  // label[for^="radio_"] 의 첫 번째 = "가격 공식, 배송 정보" 라디오 (constants.ts EditForms 순서).
  const firstRadioLabel = page.locator('label[for^="radio_"]').first();
  const cnt = await firstRadioLabel.count().catch(() => 0);
  if (cnt === 0) {
    return {
      ok: false as const,
      error_key: 'radio_label_missing' as ErrorKey,
      message: 'label[for^="radio_"] 매칭 0건 (step2 라디오 미렌더)',
    };
  }
  await firstRadioLabel.click({ force: true });
  await page.waitForTimeout(500);

  const afterDisabled = await next.isDisabled().catch(() => true);
  if (afterDisabled) {
    return {
      ok: false as const,
      error_key: 'next_still_disabled' as ErrorKey,
      message: 'EditForm 라벨 클릭 후에도 다음 버튼 disabled — 단일 선택 미반영',
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_registered_list: openRegisteredListStep,
  select_first_product: selectFirstProductStep,
  click_bulk_edit_button: clickBulkEditButtonStep,
  enter_step2: enterStep2Step,
  verify_step2_single_select: verifyStep2SingleSelectStep,
};

test('수정 업로드 모달 2단계 단일 선택 동작', async ({ page }) => {
  test.setTimeout(3 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
