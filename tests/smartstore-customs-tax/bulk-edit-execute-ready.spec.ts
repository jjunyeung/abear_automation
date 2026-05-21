/**
 * 스스 관부가세 수정 업로드 버튼 enabled 검증 (실제 클릭 회피).
 *
 * 대응 ATC : atcs/upload/bulk-edit-execute-ready.atc.yml
 * TC 원본  : Case No 3598 / 등록상품 › 수정 업로드 › 수정 업로드 실행 / P0
 *
 * 주의: 실제 click 은 마켓 데이터 변경 부작용이 있어서 자동화 안 함.
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
  modalNextButton,
  STEP2_FORM_LABEL_RE,
} from './_bulk-edit-handlers';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'smartstore-customs-tax',
  'bulk-edit-execute-ready.atc.yml',
);

const selectOnlySmartStoreStep: StepHandler = async (page) => {
  await page.locator('.banner').first().waitFor({ state: 'visible', timeout: 10_000 });
  const ss = page.locator('label[for^="checkbox_"]').filter({ hasText: /^스마트스토어$/ }).first();
  if ((await ss.count().catch(() => 0)) === 0) {
    return { ok: false as const, error_key: 'smartstore_label_missing' as ErrorKey, message: '스마트스토어 라벨 매칭 0건' };
  }
  await ss.click();
  await page.waitForTimeout(300);
  await modalNextButton(page).click();
  await page.getByText(STEP2_FORM_LABEL_RE).first().waitFor({ state: 'visible', timeout: 10_000 });
  return { ok: true as const };
};

const selectCustomsTaxFormStep: StepHandler = async (page) => {
  await page.getByText(/^관부가세$/).first().click({ force: true });
  await page.waitForTimeout(500);
  await modalNextButton(page).click();
  await page.getByText(/^수정할\s*정보\s*입력$/).first().waitFor({ state: 'visible', timeout: 10_000 });
  return { ok: true as const };
};

const enterEditModeStep: StepHandler = async (page) => {
  const editBtn = page.locator('.edit-btn').first();
  await editBtn.click();
  await page.getByText('관부가세 포함', { exact: true }).first().waitFor({ state: 'visible', timeout: 5_000 });
  return { ok: true as const };
};

const selectOneOptionStep: StepHandler = async (page) => {
  await page.getByText('관부가세 포함', { exact: true }).first().click({ force: true });
  await page.waitForTimeout(500);
  return { ok: true as const };
};

const verifySubmitReadyStep: StepHandler = async (page) => {
  // 모달 안 "수정 업로드" 버튼 (페이지 본문 toolbar 의 동명 버튼 회피 위해 .last()).
  const submit = page.getByRole('button', { name: /^수정\s*업로드$/ }).last();
  await submit.waitFor({ state: 'visible', timeout: 5_000 });
  const disabled = await submit.isDisabled().catch(() => true);
  if (disabled) {
    return {
      ok: false as const,
      error_key: 'submit_not_ready' as ErrorKey,
      message: '관부가세 옵션 선택 후에도 수정 업로드 버튼 비활성',
    };
  }
  // 실제 클릭 안 함 — 부작용 회피.
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_registered_list: openRegisteredListStep,
  select_first_product: selectFirstProductStep,
  click_bulk_edit_button: clickBulkEditButtonStep,
  select_only_smartstore: selectOnlySmartStoreStep,
  select_customs_tax_form: selectCustomsTaxFormStep,
  enter_edit_mode: enterEditModeStep,
  select_one_option: selectOneOptionStep,
  verify_submit_ready: verifySubmitReadyStep,
};

test('스스 관부가세 수정 업로드 버튼 enabled', async ({ page }) => {
  test.setTimeout(3 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
