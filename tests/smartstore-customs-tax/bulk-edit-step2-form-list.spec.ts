/**
 * 수정 업로드 모달 2단계 EditForms 목록 노출 검증.
 *
 * 대응 ATC : atcs/upload/bulk-edit-step2-form-list.atc.yml
 * TC 원본  : Case No 3588 / 등록상품 › 수정 업로드 › 수정 항목 목록 노출 / P0
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
} from './_bulk-edit-handlers';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'smartstore-customs-tax',
  'bulk-edit-step2-form-list.atc.yml',
);

const EDIT_FORM_LABELS = [
  /가격\s*공식/,
  /상하단이미지/,
  /리뷰포인트/,
  /모음전\s*정책/,
  /관부가세/,
];

const verifyFormListStep: StepHandler = async (page) => {
  let visibleCount = 0;
  for (const re of EDIT_FORM_LABELS) {
    const found = await page.getByText(re).first().isVisible().catch(() => false);
    if (found) visibleCount += 1;
  }
  if (visibleCount < 3) {
    return {
      ok: false as const,
      error_key: 'edit_forms_too_few' as ErrorKey,
      message: `step2 EditForms 가시 ${visibleCount}/5 (기대 ≥3)`,
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_registered_list: openRegisteredListStep,
  select_first_product: selectFirstProductStep,
  click_bulk_edit_button: clickBulkEditButtonStep,
  enter_step2: enterStep2Step,
  verify_form_list: verifyFormListStep,
};

test('수정 업로드 모달 2단계 EditForms 목록 노출', async ({ page }) => {
  test.setTimeout(3 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
