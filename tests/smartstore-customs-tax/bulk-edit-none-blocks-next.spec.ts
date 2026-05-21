/**
 * 수정 업로드 모달 마켓 미선택 시 다음 버튼 비활성 검증.
 *
 * 대응 ATC : atcs/upload/bulk-edit-none-blocks-next.atc.yml
 * TC 원본  : Case No 3583 / 등록상품 › 수정 업로드 › 선택 없음 예외 / P0
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
} from './_bulk-edit-handlers';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'smartstore-customs-tax',
  'bulk-edit-none-blocks-next.atc.yml',
);

const verifyNextDisabledStep: StepHandler = async (page) => {
  // 1단계 진입 보장
  await page
    .locator('.banner')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 });

  const next = modalNextButton(page);
  await next.waitFor({ state: 'visible', timeout: 5_000 });
  const disabled = await next.isDisabled().catch(() => false);
  if (!disabled) {
    return {
      ok: false as const,
      error_key: 'next_button_not_disabled' as ErrorKey,
      message: '모달 진입 직후 (selected.market=[]) 인데 다음 버튼이 활성 상태 — 기대 disabled',
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_registered_list: openRegisteredListStep,
  select_first_product: selectFirstProductStep,
  click_bulk_edit_button: clickBulkEditButtonStep,
  verify_next_disabled: verifyNextDisabledStep,
};

test('수정 업로드 모달 마켓 미선택 시 다음 버튼 비활성', async ({ page }) => {
  test.setTimeout(3 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
