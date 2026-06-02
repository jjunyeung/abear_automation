/**
 * C3. AI 카테고리 추천 → 에러체크 통과 (e2e)
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
import { aiRecommendCategoryHandlers } from '../collected-product/_ai-recommend-category-handlers';
import {
  clickErrorCheckButton,
  readTabStatuses,
} from '../../lib/error-check-actions';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'e2e', 'ai-category-then-pass-check.atc.yml');

const errorCheckAfterCategoryStep: StepHandler = async (page) => {
  await page.keyboard.press('Escape').catch(() => undefined);
  await page.waitForTimeout(300);
  const ok = await clickErrorCheckButton(page);
  if (!ok) {
    return {
      ok: false as const,
      error_key: 'error_check_btn_not_found' as ErrorKey,
      message: '에러체크 버튼 미발견',
    };
  }
  await page.waitForTimeout(2_000);
  const statuses = await readTabStatuses(page);
  // 카테고리 = "기본 정보" 탭에서 관리. 그 탭이 빨간 dot 인지.
  const basicTab = statuses.find((s) => s.name === '기본 정보');
  if (basicTab !== undefined && basicTab.status === 'red') {
    return {
      ok: false as const,
      error_key: 'basic_tab_still_red' as ErrorKey,
      message: 'AI 카테고리 추천 후에도 기본 정보 탭 빨간 dot',
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_collected_list: aiRecommendCategoryHandlers['open_collected_list']!,
  open_first_product: aiRecommendCategoryHandlers['open_first_product']!,
  recommend_category: aiRecommendCategoryHandlers['recommend_category']!,
  error_check_after_category: errorCheckAfterCategoryStep,
};

test('AI 카테고리 추천 → 에러체크 통과 (e2e)', async ({ page }) => {
  test.setTimeout(8 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
