/**
 * 스스 관부가세 화면 진입 검증.
 *
 * 대응 ATC : atcs/upload/bulk-edit-customs-tax-entry.atc.yml
 * TC 원본  : Case No 3593 / 등록상품 › 수정 업로드 › 스마트스토어 관부가세 진입 / P0
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
  'bulk-edit-customs-tax-entry.atc.yml',
);

const selectOnlySmartStoreStep: StepHandler = async (page) => {
  await page.locator('.banner').first().waitFor({ state: 'visible', timeout: 10_000 });
  const ss = page
    .locator('label[for^="checkbox_"]')
    .filter({ hasText: /^스마트스토어$/ })
    .first();
  const cnt = await ss.count().catch(() => 0);
  if (cnt === 0) {
    return {
      ok: false as const,
      error_key: 'smartstore_label_missing' as ErrorKey,
      message: '스마트스토어 라벨 매칭 0건',
    };
  }
  await ss.click();
  await page.waitForTimeout(300);
  const next = modalNextButton(page);
  const disabled = await next.isDisabled().catch(() => true);
  if (disabled) {
    return {
      ok: false as const,
      error_key: 'next_disabled_after_ss_select' as ErrorKey,
      message: '스마트스토어 선택 후에도 다음 비활성 — 미연결일 수 있음',
    };
  }
  await next.click();
  await page.getByText(STEP2_FORM_LABEL_RE).first().waitFor({ state: 'visible', timeout: 10_000 });
  return { ok: true as const };
};

const selectCustomsTaxFormStep: StepHandler = async (page) => {
  // step2 의 "관부가세" 라디오. Radio Box(onClick=onSelect) 안에 RadioLabelText="관부가세".
  const customsRadioText = page.getByText(/^관부가세$/).first();
  try {
    await customsRadioText.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'customs_tax_radio_missing' as ErrorKey,
      message: 'step2 관부가세 라디오 라벨 미노출',
    };
  }
  await customsRadioText.click({ force: true });
  await page.waitForTimeout(500);

  const next = modalNextButton(page);
  const disabled = await next.isDisabled().catch(() => true);
  if (disabled) {
    return {
      ok: false as const,
      error_key: 'next_disabled_after_customs_select' as ErrorKey,
      message: '관부가세 라디오 클릭 후 다음 비활성 — disabled 였거나 클릭 미반영',
    };
  }
  await next.click();
  // step3 진입.
  await page.getByText(/^수정할\s*정보\s*입력$/).first().waitFor({ state: 'visible', timeout: 10_000 });
  return { ok: true as const };
};

const verifyCustomsTaxAccordionStep: StepHandler = async (page) => {
  // step3 Accordion title "관부가세".
  // step2 라디오 라벨 "관부가세" 도 같은 텍스트지만 step3 진입했으면 그건 사라짐.
  const accordion = page.getByText(/^관부가세$/).first();
  try {
    await accordion.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'customs_tax_accordion_missing' as ErrorKey,
      message: 'step3 관부가세 Accordion title 미노출',
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
  verify_customs_tax_accordion: verifyCustomsTaxAccordionStep,
};

test('스스 관부가세 화면 진입', async ({ page }) => {
  test.setTimeout(3 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
