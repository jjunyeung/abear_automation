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
  readRedFieldLocations,
  summarizeTabStatuses,
  type TabStatus,
} from '../../lib/error-check-actions';
import { fixRedCategoriesBySearch } from '../../lib/category-actions';
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
  let statuses = await triggerErrorCheck(page);
  if (statuses === null) {
    return {
      ok: false as const,
      error_key: 'error_check_btn_not_found' as ErrorKey,
      message: '에러체크 버튼 미발견',
    };
  }
  let basicTab = statuses.find((s) => s.name === '기본 정보');

  // 기본 정보(카테고리)가 빨강이면: 빨간 카테고리 드롭다운을 열어 "바지" 검색 →
  // 맨 위 결과 선택으로 채운 뒤 재검사 (사용자 지정 동작).
  if (basicTab !== undefined && basicTab.status === 'red') {
    await page.getByRole('button', { name: '기본 정보' }).first().click().catch(() => undefined);
    await page.waitForTimeout(500);
    const fixed = await fixRedCategoriesBySearch(page, CATEGORY_FIX_KEYWORD);
    logger.info(
      `[error_check_after_category] 빨간 카테고리 ${fixed}개를 '${CATEGORY_FIX_KEYWORD}' 검색 맨 위로 채움`,
    );
    if (fixed > 0) {
      const re = await triggerErrorCheck(page);
      if (re !== null) {
        statuses = re;
        basicTab = statuses.find((s) => s.name === '기본 정보');
      }
    }
  }

  if (basicTab !== undefined && basicTab.status === 'red') {
    // 진단: 왜 red 인지 사유를 수집해서 unhandled 리포트가 actionable 하도록.
    //   1) 어느 탭들이 red/yellow 인지 (카테고리 외 다른 탭도 red 면 e2e 전제 자체가 약함)
    //   2) 기본 정보 탭의 red 보더 input/textarea 라벨 (브랜드/원산지/상품명 등)
    //   3) 상품명(title) 비어있으면 AI 추천이 noop → 카테고리 미적용
    // 기본 정보 탭으로 이동 후 red 필드 read (다른 탭 활성 상태일 수 있어 보정).
    await page
      .getByRole('button', { name: '기본 정보' })
      .first()
      .click()
      .catch(() => undefined);
    await page.waitForTimeout(800);
    const redFields = await readRedFieldLocations(page);
    const summary = summarizeTabStatuses(statuses);
    const redTabs = statuses
      .filter((s) => s.status === 'red')
      .map((s) => s.name)
      .join(', ');
    const redLabels = redFields
      .map((f) => `${f.label || f.tag}${f.value ? '' : '(빈값)'}`)
      .join(', ');
    const titleEmpty = await page.evaluate(() => {
      const inputs = Array.from(
        document.querySelectorAll<HTMLInputElement>('input'),
      );
      // 상품명 placeholder/라벨 추정 — 비어있으면 AI 추천이 noop.
      const titleInput = inputs.find((el) =>
        /상품\s*명|상품명을/.test(
          `${el.placeholder} ${el.getAttribute('aria-label') ?? ''}`,
        ),
      );
      return titleInput !== undefined ? titleInput.value.trim().length === 0 : null;
    });
    const diag = [
      `red탭=[${redTabs}]`,
      `탭요약 R${summary.red}/Y${summary.yellow}/G${summary.green}`,
      `기본정보 red필드=[${redLabels || '없음(카테고리 등 비-input 사유 추정)'}]`,
      titleEmpty === true
        ? '상품명 빈값 → AI추천 noop'
        : titleEmpty === null
          ? '상품명 input 미탐'
          : '상품명 채워짐',
    ].join(' | ');
    return {
      ok: false as const,
      error_key: 'basic_tab_still_red' as ErrorKey,
      message: `AI 카테고리 추천 후에도 기본 정보 탭 빨간 dot. 진단: ${diag}`,
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
