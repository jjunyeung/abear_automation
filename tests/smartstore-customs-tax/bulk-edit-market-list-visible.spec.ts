/**
 * 수정 업로드 모달 1단계 마켓 목록 노출 검증.
 *
 * 대응 ATC : atcs/upload/bulk-edit-market-list-visible.atc.yml
 * TC 원본  : Case No 3578 / 등록상품 › 수정 업로드 › 마켓 목록 노출 / P0
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
  'bulk-edit-market-list-visible.atc.yml',
);

const MARKET_LABEL_RE = /(스마트스토어|쿠팡|11번가|톡스토어|롯데온|위메프|인터파크|에스엠|G마켓|옥션)/;

const verifyMarketListVisibleStep: StepHandler = async (page) => {
  // 모달 1단계 안의 base-checkbox 개수.
  // banner 가시 = 1단계 진입 보장.
  await page
    .locator('.banner')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => undefined);

  const baseCnt = await page.locator('.base-checkbox').count().catch(() => 0);
  if (baseCnt < 3) {
    return {
      ok: false as const,
      error_key: 'market_checkbox_too_few' as ErrorKey,
      message: `1단계 base-checkbox 개수 ${baseCnt} (기대 ≥3 — 전체선택 + 마켓 2개 이상)`,
    };
  }

  // 한국어 마켓명 ≥1개 가시.
  const marketLabel = page.locator('label[for^="checkbox_"]').filter({ hasText: MARKET_LABEL_RE }).first();
  const matched = await marketLabel.count().catch(() => 0);
  if (matched === 0) {
    return {
      ok: false as const,
      error_key: 'market_label_not_found' as ErrorKey,
      message: `1단계 마켓명 label 매칭 0건 (정규식 ${MARKET_LABEL_RE.source})`,
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_registered_list: openRegisteredListStep,
  select_first_product: selectFirstProductStep,
  click_bulk_edit_button: clickBulkEditButtonStep,
  verify_market_list_visible: verifyMarketListVisibleStep,
};

test('수정 업로드 모달 1단계 마켓 목록 노출', async ({ page }) => {
  test.setTimeout(3 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
