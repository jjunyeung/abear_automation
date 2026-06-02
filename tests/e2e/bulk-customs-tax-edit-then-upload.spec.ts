/**
 * F1. 스마트스토어 관/부가세 벌크 수정 wizard → 실행 (e2e)
 *
 * 대응 ATC: atcs/e2e/bulk-customs-tax-edit-then-upload.atc.yml
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
  modalCancelButton,
} from '../smartstore-customs-tax/_bulk-edit-handlers';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'e2e',
  'bulk-customs-tax-edit-then-upload.atc.yml',
);

const selectOnlySmartstoreStep: StepHandler = async (page) => {
  // step1 마켓 라벨 = label[for^="checkbox_"] 패턴 (_bulk-edit-handlers 참고).
  // "스마트스토어" 텍스트 가진 label 클릭 후 "다음" 클릭하여 step2 진입.
  await page.locator('.banner').first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => undefined);
  const smartstoreLabel = page
    .locator('label[for^="checkbox_"]')
    .filter({ hasText: /스마트스토어/ })
    .first();
  try {
    await smartstoreLabel.waitFor({ state: 'visible', timeout: 10_000 });
    await smartstoreLabel.click();
    await page.waitForTimeout(500);
  } catch {
    return {
      ok: false as const,
      error_key: 'smartstore_label_not_found' as ErrorKey,
      message: 'step1 스마트스토어 label 미발견',
    };
  }
  // 다음 버튼 → step2 진입.
  const nextBtn = modalNextButton(page);
  await nextBtn.waitFor({ state: 'visible', timeout: 5_000 });
  if (await nextBtn.isDisabled().catch(() => false)) {
    return {
      ok: false as const,
      error_key: 'next_btn_disabled' as ErrorKey,
      message: '스마트스토어 선택 후에도 "다음" 비활성',
    };
  }
  await nextBtn.click();
  await page.waitForTimeout(2_000);
  return { ok: true as const };
};

const selectCustomsTaxFormStep: StepHandler = async (page) => {
  // step2 의 "관부가세" 라디오. 기존 bulk-edit-customs-tax-entry.spec 패턴 사용.
  const customsRadio = page.getByText(/^관부가세$/).first();
  try {
    await customsRadio.waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'customs_tax_form_not_found' as ErrorKey,
      message: 'step2 관부가세 라디오 라벨 미노출',
    };
  }
  await customsRadio.click({ force: true });
  await page.waitForTimeout(800);
  // 다음 클릭 → step3 진입.
  const nextBtn = modalNextButton(page);
  if (await nextBtn.isDisabled().catch(() => false)) {
    return {
      ok: false as const,
      error_key: 'next_btn_disabled_step2' as ErrorKey,
      message: '관부가세 선택 후에도 "다음" 비활성',
    };
  }
  await nextBtn.click();
  await page.waitForTimeout(2_000);
  return { ok: true as const };
};

const verifyStep3ActiveStep: StepHandler = async (page) => {
  await page.waitForTimeout(1_500);
  const step3 = page.getByText(/3\s*단계|step\s*3/i).first();
  if ((await step3.count()) > 0 && (await step3.isVisible().catch(() => false))) {
    return { ok: true as const };
  }
  // 또는 step3 컨텐츠 매칭.
  const step3Content = page.getByText(/실행|적용|확정/, { exact: false }).first();
  if ((await step3Content.count()) > 0) {
    return { ok: true as const };
  }
  return {
    ok: false as const,
    error_key: 'step3_not_active' as ErrorKey,
    message: 'step3 진입 신호 부재',
  };
};

const closeWizardStep: StepHandler = async (page) => {
  const cancel = modalCancelButton(page);
  if ((await cancel.count()) > 0 && (await cancel.isVisible().catch(() => false))) {
    await cancel.click({ timeout: 5_000 }).catch(() => undefined);
  } else {
    await page.keyboard.press('Escape').catch(() => undefined);
  }
  await page.waitForTimeout(1_500);
  return { ok: true as const };
};

// select_only_smartstore 가 step1→step2 진입까지, select_customs_tax_form 이 step2→step3 진입까지 통합.
// enter_step2 / enter_step3 step 은 no-op (이미 진입한 상태 통과).
const noopStep: StepHandler = async () => ({ ok: true as const });

const handlers: StepHandlers = {
  open_registered_list: openRegisteredListStep,
  select_first_product: selectFirstProductStep,
  click_bulk_edit_button: clickBulkEditButtonStep,
  select_only_smartstore: selectOnlySmartstoreStep,
  select_customs_tax_form: selectCustomsTaxFormStep,
  enter_step2: noopStep,
  enter_step3: noopStep,
  verify_step3_active: verifyStep3ActiveStep,
  close_wizard: closeWizardStep,
};

test('스마트스토어 관/부가세 벌크 wizard step1→2→3 (e2e)', async ({ page }) => {
  test.setTimeout(5 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
