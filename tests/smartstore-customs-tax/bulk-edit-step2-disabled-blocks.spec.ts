/**
 * 수정 업로드 모달 step2 비활성 라디오 선택 제한 검증.
 *
 * 대응 ATC : atcs/upload/bulk-edit-step2-disabled-blocks.atc.yml
 * TC 원본  : Case No 3602 / 등록상품 › 수정 업로드 › 비활성 항목 선택 제한 / P0
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
  'bulk-edit-step2-disabled-blocks.atc.yml',
);

/** step1 에서 스마트스토어 제외하고 다른 마켓 1개 선택 후 다음 → step2 진입. */
const enterStep2NoSmartStoreStep: StepHandler = async (page) => {
  await page.locator('.banner').first().waitFor({ state: 'visible', timeout: 10_000 });

  // 스마트스토어 외 마켓 라벨 첫 번째 (쿠팡 / 11번가 / 톡스토어 ...).
  const nonSmartStore = page
    .locator('label[for^="checkbox_"]')
    .filter({ hasText: /(쿠팡|11번가|톡스토어|롯데온|위메프|인터파크|에스엠|G마켓|옥션)/ })
    .first();
  const cnt = await nonSmartStore.count().catch(() => 0);
  if (cnt === 0) {
    return {
      ok: false as const,
      error_key: 'non_smartstore_market_missing' as ErrorKey,
      message: '스스 외 마켓 라벨 매칭 0건 — 환경 조건 미충족',
    };
  }
  await nonSmartStore.waitFor({ state: 'visible', timeout: 5_000 });
  await nonSmartStore.click();
  await page.waitForTimeout(300);

  const next = modalNextButton(page);
  const disabled = await next.isDisabled().catch(() => true);
  if (disabled) {
    return {
      ok: false as const,
      error_key: 'next_disabled_after_non_ss_select' as ErrorKey,
      message: '스스 외 마켓 선택 후에도 다음 비활성',
    };
  }
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

const verifyDisabledBlocksStep: StepHandler = async (page) => {
  // step2 의 disabled input[type=radio] 1개 이상 존재해야 함.
  const disabledInputs = page.locator('input[type="radio"]:disabled');
  const cnt = await disabledInputs.count();
  if (cnt === 0) {
    return {
      ok: false as const,
      error_key: 'no_disabled_radio' as ErrorKey,
      message: 'step2 에 disabled radio 0건 — 환경 조건 미충족 (모든 EditForms 활성)',
    };
  }

  // disabled radio 의 id 추출 → 같은 id 를 가진 label 클릭.
  const firstDisabledId = await disabledInputs.first().getAttribute('id');
  if (!firstDisabledId) {
    return {
      ok: false as const,
      error_key: 'disabled_radio_no_id' as ErrorKey,
      message: 'disabled radio 에 id 속성 없음',
    };
  }
  const label = page.locator(`label[for="${firstDisabledId}"]`).first();
  // disabled 라벨도 force-click 시도.
  await label.click({ force: true }).catch(() => undefined);
  await page.waitForTimeout(300);

  // 다음 버튼이 여전히 disabled 인지 검증.
  const next = modalNextButton(page);
  const disabled = await next.isDisabled().catch(() => false);
  if (!disabled) {
    return {
      ok: false as const,
      error_key: 'disabled_radio_caused_select' as ErrorKey,
      message: 'disabled radio 클릭 후 다음 버튼이 활성됨 — 비활성 항목이 선택된 것',
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_registered_list: openRegisteredListStep,
  select_first_product: selectFirstProductStep,
  click_bulk_edit_button: clickBulkEditButtonStep,
  enter_step2: enterStep2NoSmartStoreStep,
  verify_disabled_blocks: verifyDisabledBlocksStep,
};

test('수정 업로드 모달 step2 비활성 라디오 선택 제한', async ({ page }) => {
  test.setTimeout(3 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
