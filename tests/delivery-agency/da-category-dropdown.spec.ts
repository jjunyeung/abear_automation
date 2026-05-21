/**
 * Tosstoss 신청서 상품 카테고리 드롭다운 검증.
 *
 * 대응 ATC : atcs/settings/da-category-dropdown.atc.yml
 * TC 원본  : Case No 1388 / 배송대행지 › 신청서 작성 › 상품 카테고리 입력 / P0
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
  goToTosstossApplicationStep,
  addManualFormStep,
} from './_da-application-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'delivery-agency', 'da-category-dropdown.atc.yml');

const PLACEHOLDER_RE = /상품의\s*카테고리를\s*검색해주세요/;

const openCategoryDropdownStep: StepHandler = async (page) => {
  const placeholderEl = page.getByText(PLACEHOLDER_RE).first();
  try {
    await placeholderEl.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'category_placeholder_missing' as ErrorKey,
      message: '카테고리 placeholder 미노출',
    };
  }
  await placeholderEl.click();
  await page.waitForTimeout(500);

  // 펼친 후 검색 input 또는 option label 가시.
  const searchInput = page.locator('input[type="text"], input:not([type])').filter({ visible: true });
  const hasSearchInput = (await searchInput.count().catch(() => 0)) > 0;
  if (!hasSearchInput) {
    return {
      ok: false as const,
      error_key: 'category_dropdown_no_search' as ErrorKey,
      message: '드롭다운 열린 후 검색 input 미노출',
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_tosstoss_application: goToTosstossApplicationStep,
  add_manual_form: addManualFormStep,
  open_category_dropdown: openCategoryDropdownStep,
};

test('토스토스 신청서 카테고리 드롭다운', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
