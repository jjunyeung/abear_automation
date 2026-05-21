/**
 * 수정 업로드 모달 취소 버튼 → 모달 닫힘 검증.
 *
 * 대응 ATC : atcs/upload/bulk-edit-cancel-closes.atc.yml
 * TC 원본  : Case No 3585 / 등록상품 › 수정 업로드 › 취소 버튼 동작 / P0
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
  modalCancelButton,
} from './_bulk-edit-handlers';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'smartstore-customs-tax',
  'bulk-edit-cancel-closes.atc.yml',
);

const clickCancelStep: StepHandler = async (page) => {
  // 1단계 진입 보장
  await page
    .locator('.banner')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 });

  const cancel = modalCancelButton(page);
  await cancel.waitFor({ state: 'visible', timeout: 5_000 });
  await cancel.click();
  return { ok: true as const };
};

const verifyModalClosedStep: StepHandler = async (page) => {
  // 모달이 닫혔으면 .banner 가 hidden 으로 전이됨.
  try {
    await page.locator('.banner').first().waitFor({ state: 'hidden', timeout: 5_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'modal_still_open' as ErrorKey,
      message: '취소 클릭 후에도 모달 .banner 가시 — dismiss 실패',
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_registered_list: openRegisteredListStep,
  select_first_product: selectFirstProductStep,
  click_bulk_edit_button: clickBulkEditButtonStep,
  click_cancel: clickCancelStep,
  verify_modal_closed: verifyModalClosedStep,
};

test('수정 업로드 모달 취소 버튼 닫힘', async ({ page }) => {
  test.setTimeout(3 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
