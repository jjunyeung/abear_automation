/**
 * 스스 관부가세 옵션 3개 노출 검증.
 *
 * 대응 ATC : atcs/upload/bulk-edit-customs-tax-options.atc.yml
 * TC 원본  : Case No 3596 / 등록상품 › 수정 업로드 › 스마트스토어 관부가세 옵션 / P0
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
  'bulk-edit-customs-tax-options.atc.yml',
);

const CUSTOMS_TAX_OPTIONS = ['부과 대상 아님', '관부가세 포함', '관부가세 미포함'];

const selectOnlySmartStoreStep: StepHandler = async (page) => {
  await page.locator('.banner').first().waitFor({ state: 'visible', timeout: 10_000 });
  const ss = page
    .locator('label[for^="checkbox_"]')
    .filter({ hasText: /^스마트스토어$/ })
    .first();
  if ((await ss.count().catch(() => 0)) === 0) {
    return { ok: false as const, error_key: 'smartstore_label_missing' as ErrorKey, message: '스마트스토어 라벨 매칭 0건' };
  }
  await ss.click();
  await page.waitForTimeout(300);
  const next = modalNextButton(page);
  await next.click();
  await page.getByText(STEP2_FORM_LABEL_RE).first().waitFor({ state: 'visible', timeout: 10_000 });
  return { ok: true as const };
};

const selectCustomsTaxFormStep: StepHandler = async (page) => {
  const customsRadio = page.getByText(/^관부가세$/).first();
  await customsRadio.waitFor({ state: 'visible', timeout: 5_000 });
  await customsRadio.click({ force: true });
  await page.waitForTimeout(500);
  const next = modalNextButton(page);
  await next.click();
  await page.getByText(/^수정할\s*정보\s*입력$/).first().waitFor({ state: 'visible', timeout: 10_000 });
  return { ok: true as const };
};

const verifyThreeOptionsStep: StepHandler = async (page) => {
  // CustomsTaxForm 의 default mode='view'. 옵션 SegmentedButton 노출은 mode='edit' 전환 후.
  // InteractiveCustomInput: <Button className="edit-btn">수정</Button> 클릭 → mode='edit'.
  const editBtn = page.locator('.edit-btn').first();
  if ((await editBtn.count().catch(() => 0)) > 0) {
    await editBtn.click().catch(() => undefined);
    await page.waitForTimeout(500);
  }

  const missing: string[] = [];
  for (const opt of CUSTOMS_TAX_OPTIONS) {
    const visible = await page.getByText(opt, { exact: true }).first().isVisible().catch(() => false);
    if (!visible) missing.push(opt);
  }
  if (missing.length > 0) {
    return {
      ok: false as const,
      error_key: 'customs_tax_options_missing' as ErrorKey,
      message: `옵션 미노출: ${missing.join(', ')} — edit 모드 전환 실패 또는 selector 변경`,
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
  verify_three_options: verifyThreeOptionsStep,
};

test('스스 관부가세 옵션 3개 노출', async ({ page }) => {
  test.setTimeout(3 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
