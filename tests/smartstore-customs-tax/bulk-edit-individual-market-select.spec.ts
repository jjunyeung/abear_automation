/**
 * 수정 업로드 모달 1단계 개별 마켓 선택 검증.
 *
 * 대응 ATC : atcs/upload/bulk-edit-individual-market-select.atc.yml
 * TC 원본  : Case No 3581 / 등록상품 › 수정 업로드 › 개별 마켓 선택 / P0
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
  'bulk-edit-individual-market-select.atc.yml',
);

const MARKET_LABEL_RE = /(스마트스토어|쿠팡|11번가|톡스토어|롯데온|위메프|인터파크|에스엠|G마켓|옥션)/;

const verifyIndividualMarketToggleStep: StepHandler = async (page) => {
  await page
    .locator('.banner')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 });

  const beforeChecked = await page.locator('input[type="checkbox"]:checked').count();

  const firstMarketLabel = page
    .locator('label[for^="checkbox_"]')
    .filter({ hasText: MARKET_LABEL_RE })
    .first();
  const cnt = await firstMarketLabel.count().catch(() => 0);
  if (cnt === 0) {
    return {
      ok: false as const,
      error_key: 'market_label_missing' as ErrorKey,
      message: '한국어 마켓 라벨 매칭 0건',
    };
  }
  await firstMarketLabel.click();
  await page.waitForTimeout(300);

  const afterChecked = await page.locator('input[type="checkbox"]:checked').count();
  const delta = afterChecked - beforeChecked;
  if (delta < 1) {
    return {
      ok: false as const,
      error_key: 'market_toggle_no_effect' as ErrorKey,
      message: `개별 마켓 클릭 후 checked 증가 없음 (before=${beforeChecked}, after=${afterChecked}) — 비활성 마켓을 잘못 잡았거나 토글 미동작`,
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_registered_list: openRegisteredListStep,
  select_first_product: selectFirstProductStep,
  click_bulk_edit_button: clickBulkEditButtonStep,
  verify_individual_market_toggle: verifyIndividualMarketToggleStep,
};

test('수정 업로드 모달 1단계 개별 마켓 선택', async ({ page }) => {
  test.setTimeout(3 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
