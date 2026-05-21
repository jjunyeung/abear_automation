/**
 * step1 스스 미선택 시 step2 스스 form 비활성 검증.
 *
 * 대응 ATC : atcs/upload/bulk-edit-no-smartstore-disables.atc.yml
 * TC 원본  : Case No 3600 / 등록상품 › 수정 업로드 › 스마트스토어 미선택 비활성 / P0
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
  'bulk-edit-no-smartstore-disables.atc.yml',
);

const enterStep2NoSmartStoreStep: StepHandler = async (page) => {
  await page.locator('.banner').first().waitFor({ state: 'visible', timeout: 10_000 });
  const nonSmartStore = page
    .locator('label[for^="checkbox_"]')
    .filter({ hasText: /(쿠팡|11번가|톡스토어|롯데온|위메프|인터파크|에스엠|G마켓|옥션)/ })
    .first();
  const cnt = await nonSmartStore.count().catch(() => 0);
  if (cnt === 0) {
    return {
      ok: false as const,
      error_key: 'non_smartstore_market_missing' as ErrorKey,
      message: '스스 외 마켓 라벨 매칭 0건',
    };
  }
  await nonSmartStore.click();
  await page.waitForTimeout(300);
  const next = modalNextButton(page);
  await next.click();
  try {
    await page.getByText(STEP2_FORM_LABEL_RE).first().waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'step2_not_entered' as ErrorKey,
      message: 'step2 EditForms 미노출',
    };
  }
  return { ok: true as const };
};

const verifySSFormsDisabledStep: StepHandler = async (page) => {
  const disabledCnt = await page.locator('input[type="radio"]:disabled').count();
  if (disabledCnt < 1) {
    return {
      ok: false as const,
      error_key: 'expected_disabled_forms_missing' as ErrorKey,
      message: `step2 disabled radio 개수 ${disabledCnt} (기대 ≥1 — 스스 관련 form 비활성)`,
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_registered_list: openRegisteredListStep,
  select_first_product: selectFirstProductStep,
  click_bulk_edit_button: clickBulkEditButtonStep,
  enter_step2_no_ss: enterStep2NoSmartStoreStep,
  verify_ss_forms_disabled: verifySSFormsDisabledStep,
};

test('step1 스스 미선택 시 step2 스스 form 비활성', async ({ page }) => {
  test.setTimeout(3 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
