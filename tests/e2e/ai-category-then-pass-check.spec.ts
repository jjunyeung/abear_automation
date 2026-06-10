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
  summarizeTabStatuses,
  type TabStatus,
} from '../../lib/error-check-actions';
import {
  countRedCategoryDropdowns,
  fixRedCategoriesBySearch,
} from '../../lib/category-actions';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'e2e', 'ai-category-then-pass-check.atc.yml');

/** 카테고리가 비어 빨간 경우 채울 검색어 (맨 위 결과 선택). */
const CATEGORY_FIX_KEYWORD = '바지';

/** 에러체크 트리거 후 7개 탭 status 반환. 버튼 미발견 시 null. */
async function triggerErrorCheck(page: Parameters<StepHandler>[0]): Promise<TabStatus[] | null> {
  await page.keyboard.press('Escape').catch(() => undefined);
  await page.waitForTimeout(300);
  const ok = await clickErrorCheckButton(page);
  if (!ok) return null;
  await page.waitForTimeout(2_000);
  return readTabStatuses(page);
}

const errorCheckAfterCategoryStep: StepHandler = async (page) => {
  // 이 TC 의 검증 대상 = "카테고리" 다 (기본 정보 탭 전체가 아니라).
  // 기본 정보 탭은 브랜드/원산지 등 카테고리와 무관한 필수값으로도 빨개질 수 있어,
  // 갓 수집된 미완성 첫 카드에 대해 "탭 dot green" 을 요구하면 구조적으로 통과 불가.
  // 따라서 ATC 제목/설명("카테고리 관련 빨간 dot 사라짐") 대로 빨간 카테고리 드롭다운이
  // 0개인지만 검증한다.
  let statuses = await triggerErrorCheck(page);
  if (statuses === null) {
    return {
      ok: false as const,
      error_key: 'error_check_btn_not_found' as ErrorKey,
      message: '에러체크 버튼 미발견',
    };
  }

  // 기본 정보 탭으로 이동 후 빨간 마켓 카테고리 드롭다운 수 확인.
  await page.getByRole('button', { name: '기본 정보' }).first().click().catch(() => undefined);
  await page.waitForTimeout(800);
  let redCats = await countRedCategoryDropdowns(page);

  // 빨강이면 "바지" 검색 맨 위 결과로 채운 뒤 재검사 (사용자 지정 동작).
  if (redCats > 0) {
    const fixed = await fixRedCategoriesBySearch(page, CATEGORY_FIX_KEYWORD);
    logger.info(
      `[error_check_after_category] 빨간 카테고리 ${redCats}개 중 ${fixed}개를 '${CATEGORY_FIX_KEYWORD}' 검색 맨 위로 채움`,
    );
    const re = await triggerErrorCheck(page);
    if (re !== null) statuses = re;
    await page.getByRole('button', { name: '기본 정보' }).first().click().catch(() => undefined);
    await page.waitForTimeout(800);
    redCats = await countRedCategoryDropdowns(page);
  }

  if (redCats > 0) {
    // 카테고리를 채웠는데도 빨강 → 진단과 함께 실패.
    const summary = summarizeTabStatuses(statuses);
    const redTabs = statuses
      .filter((s) => s.status === 'red')
      .map((s) => s.name)
      .join(', ');
    return {
      ok: false as const,
      error_key: 'category_still_red' as ErrorKey,
      message:
        `AI 카테고리 추천(+'${CATEGORY_FIX_KEYWORD}' 수동 선택) 후에도 빨간 카테고리 드롭다운 ${redCats}개 잔존. ` +
        `진단: red탭=[${redTabs}] | 탭요약 R${summary.red}/Y${summary.yellow}/G${summary.green}`,
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
