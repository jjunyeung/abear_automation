/**
 * 수정 업로드 모달 2단계 진입 검증.
 *
 * 대응 ATC : atcs/upload/bulk-edit-enter-step2.atc.yml
 * TC 원본  : Case No 3586 / 등록상품 › 수정 업로드 › 2단계 진입 / P0
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
  STEP2_FORM_LABEL_RE,
} from './_bulk-edit-handlers';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'smartstore-customs-tax',
  'bulk-edit-enter-step2.atc.yml',
);

const verifyStep2ActiveStep: StepHandler = async (page) => {
  // ProgressHeader 의 "수정할 정보 선택" 텍스트 가시.
  const header = page.getByText(/^수정할\s*정보\s*선택$/).first();
  try {
    await header.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'step2_header_missing' as ErrorKey,
      message: 'ProgressHeader "수정할 정보 선택" 미노출',
    };
  }
  // EditForms 라디오 라벨 ≥1.
  const editLabel = page.getByText(STEP2_FORM_LABEL_RE).first();
  try {
    await editLabel.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'step2_labels_missing' as ErrorKey,
      message: 'step2 EditForms 라디오 라벨 미노출',
    };
  }
  // banner 비가시.
  const bannerVisible = await page.locator('.banner').first().isVisible().catch(() => false);
  if (bannerVisible) {
    return {
      ok: false as const,
      error_key: 'step1_still_visible' as ErrorKey,
      message: '2단계 진입했는데도 step1 banner 가시 — 단계 전환 미완료',
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_registered_list: openRegisteredListStep,
  select_first_product: selectFirstProductStep,
  click_bulk_edit_button: clickBulkEditButtonStep,
  enter_step2: enterStep2Step,
  verify_step2_active: verifyStep2ActiveStep,
};

test('수정 업로드 모달 2단계 진입', async ({ page }) => {
  test.setTimeout(3 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
