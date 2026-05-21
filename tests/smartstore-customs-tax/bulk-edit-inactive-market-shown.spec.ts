/**
 * 수정 업로드 모달 1단계 비활성 마켓 표시 검증.
 *
 * 대응 ATC : atcs/upload/bulk-edit-inactive-market-shown.atc.yml
 * TC 원본  : Case No 3579 / 등록상품 › 수정 업로드 › 비활성 마켓 표시 / P0
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
  'bulk-edit-inactive-market-shown.atc.yml',
);

const verifyInactiveMarketShownStep: StepHandler = async (page) => {
  // 1단계 진입 보장
  await page
    .locator('.banner')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 });

  // chip text 가 "미연결" 또는 "등록안됨" 인 요소 ≥1.
  const chip = page.getByText(/^(미연결|등록안됨)$/).first();
  try {
    await chip.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'no_inactive_market_chip' as ErrorKey,
      message: '미연결/등록안됨 chip 가시 0건 — 환경에 비활성 마켓이 없거나 selector 변경',
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_registered_list: openRegisteredListStep,
  select_first_product: selectFirstProductStep,
  click_bulk_edit_button: clickBulkEditButtonStep,
  verify_inactive_market_shown: verifyInactiveMarketShownStep,
};

test('수정 업로드 모달 1단계 비활성 마켓 표시', async ({ page }) => {
  test.setTimeout(3 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
