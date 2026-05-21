/**
 * 스스 관부가세 옵션 단일 선택 동작 검증.
 *
 * 대응 ATC : atcs/upload/bulk-edit-customs-tax-single-select.atc.yml
 * TC 원본  : Case No 3597 / 등록상품 › 수정 업로드 › 스마트스토어 관부가세 단일 선택 / P0
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
  'bulk-edit-customs-tax-single-select.atc.yml',
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
  if ((await editBtn.count().catch(() => 0)) === 0) {
    return { ok: false as const, error_key: 'edit_btn_missing' as ErrorKey, message: '.edit-btn 미노출' };
  }
  await editBtn.click();
  // 옵션 노출 대기.
  await page.getByText('관부가세 포함', { exact: true }).first().waitFor({ state: 'visible', timeout: 5_000 });
  return { ok: true as const };
};

const verifySingleSelectStep: StepHandler = async (page) => {
  // 모달 안 "수정 업로드" 버튼 (step3 submit). page 본문의 수정 업로드 toolbar 버튼은
  // backdrop 뒤. 모달 안의 버튼은 같은 텍스트 — last() 가 모달 안일 확률 높음.
  // 또는 .modal-content 가 있으면 그 안.
  const submit = page.getByRole('button', { name: /^수정\s*업로드$/ }).last();

  // 옵션 A 클릭.
  const optA = page.getByText('관부가세 포함', { exact: true }).first();
  await optA.click({ force: true });
  await page.waitForTimeout(500);
  const afterA = await submit.isDisabled().catch(() => true);
  if (afterA) {
    return {
      ok: false as const,
      error_key: 'submit_disabled_after_optA' as ErrorKey,
      message: '관부가세 포함 클릭 후에도 수정 업로드 버튼 비활성',
    };
  }

  // 옵션 B 클릭.
  const optB = page.getByText('관부가세 미포함', { exact: true }).first();
  await optB.click({ force: true });
  await page.waitForTimeout(500);
  const afterB = await submit.isDisabled().catch(() => true);
  if (afterB) {
    return {
      ok: false as const,
      error_key: 'submit_disabled_after_optB' as ErrorKey,
      message: '관부가세 미포함 클릭 후 수정 업로드 버튼 비활성 — 단일 선택 동작 실패',
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_registered_list: openRegisteredListStep,
  select_first_product: selectFirstProductStep,
  click_bulk_edit_button: clickBulkEditButtonStep,
  select_only_smartstore: selectOnlySmartStoreStep,
  select_customs_tax_form: selectCustomsTaxFormStep,
  enter_edit_mode: enterEditModeStep,
  verify_single_select: verifySingleSelectStep,
};

test('스스 관부가세 단일 선택 동작', async ({ page }) => {
  test.setTimeout(3 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
