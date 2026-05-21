/**
 * 수정 업로드 모달 1단계 "전체 선택" 체크박스 노출 검증.
 *
 * 대응 ATC : atcs/upload/bulk-edit-all-checkbox-visible.atc.yml
 * TC 원본  : Case No 3577 / 등록상품 › 수정 업로드 › 전체 선택 체크박스 / P0
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
  stepOneAllSelectLabel,
} from './_bulk-edit-handlers';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'smartstore-customs-tax',
  'bulk-edit-all-checkbox-visible.atc.yml',
);

const verifyAllCheckboxVisibleStep: StepHandler = async (page) => {
  const label = stepOneAllSelectLabel(page);
  try {
    await label.waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'all_select_label_missing' as ErrorKey,
      message: '모달 1단계 "전체 선택" label[for^="checkbox_"] 미매칭',
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_registered_list: openRegisteredListStep,
  select_first_product: selectFirstProductStep,
  click_bulk_edit_button: clickBulkEditButtonStep,
  verify_all_checkbox_visible: verifyAllCheckboxVisibleStep,
};

test('수정 업로드 모달 1단계 전체 선택 체크박스 노출', async ({ page }) => {
  test.setTimeout(3 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
