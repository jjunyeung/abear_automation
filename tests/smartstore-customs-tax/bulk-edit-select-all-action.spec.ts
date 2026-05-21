/**
 * 수정 업로드 모달 1단계 "전체 선택" 동작 검증.
 *
 * 대응 ATC : atcs/upload/bulk-edit-select-all-action.atc.yml
 * TC 원본  : Case No 3580 / 등록상품 › 수정 업로드 › 전체 선택 동작 / P0
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
} from './_bulk-edit-handlers';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'smartstore-customs-tax',
  'bulk-edit-select-all-action.atc.yml',
);

const verifySelectAllTogglesStep: StepHandler = async (page) => {
  // 1단계 진입 보장
  await page
    .locator('.banner')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => undefined);

  // 모달 안 checkbox-all-container 안의 "전체 선택" label.
  const allSelectLabel = page.locator('.checkbox-all-container label[for^="checkbox_"]').first();
  const cnt = await allSelectLabel.count().catch(() => 0);
  if (cnt === 0) {
    return {
      ok: false as const,
      error_key: 'all_select_container_missing' as ErrorKey,
      message: '.checkbox-all-container label[for^="checkbox_"] 미매칭',
    };
  }
  await allSelectLabel.waitFor({ state: 'visible', timeout: 5_000 });

  // 클릭 전 페이지 input:checked 개수.
  const beforeChecked = await page.locator('input[type="checkbox"]:checked').count();

  await allSelectLabel.click();
  await page.waitForTimeout(500); // state 반영 대기.

  const afterChecked = await page.locator('input[type="checkbox"]:checked').count();
  const delta = afterChecked - beforeChecked;
  if (delta < 1) {
    return {
      ok: false as const,
      error_key: 'select_all_no_effect' as ErrorKey,
      message: `전체 선택 클릭 후 checked 증가 없음 (before=${beforeChecked}, after=${afterChecked})`,
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_registered_list: openRegisteredListStep,
  select_first_product: selectFirstProductStep,
  click_bulk_edit_button: clickBulkEditButtonStep,
  verify_select_all_toggles: verifySelectAllTogglesStep,
};

test('수정 업로드 모달 1단계 전체 선택 동작', async ({ page }) => {
  test.setTimeout(3 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
