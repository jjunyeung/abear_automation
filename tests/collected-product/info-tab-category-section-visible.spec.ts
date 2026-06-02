/**
 * 수집상품 상세 → 기본 정보 탭 → 상품 카테고리 섹션 + AI 추천 버튼 노출 (non-destructive).
 *
 * 대응 ATC : atcs/collected-product/info-tab-category-section-visible.atc.yml
 * TC 원본  : Case No 861, 862 / P0 (2건). 실제 추천 적용 click 은 destructive skip.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import {
  openFirstCollectedProductStep,
  clickTabByLabelStep,
} from './_talkstore-handlers';
import type { ErrorKey } from '../../lib/errors';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'collected-product',
  'info-tab-category-section-visible.atc.yml',
);

const CATEGORY_SECTION_TITLE = '상품 카테고리';
const AI_RECOMMEND_BUTTON = 'AI 카테고리 추천';
const CATEGORY_COPY_BUTTON = '카테고리 복사';

const verifyCategorySectionVisibleStep: StepHandler = async (page) => {
  // Section title 은 InfoTab.tsx L424 의 <Section title="상품 카테고리">.
  // 활성 마켓 0개면 Section 자체가 렌더링 X (Object.values(isCategoryHidden).some(...)=false).
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (!bodyText.includes(CATEGORY_SECTION_TITLE)) {
    return {
      ok: false as const,
      error_key: 'category_section_missing' as ErrorKey,
      message: `상품 카테고리 섹션 미노출 — 활성 마켓 0개 or 기본 정보 탭 진입 실패`,
    };
  }
  return { ok: true as const };
};

const verifyAiRecommendButtonVisibleStep: StepHandler = async (page) => {
  const visible = await page
    .getByRole('button', { name: AI_RECOMMEND_BUTTON, exact: true })
    .first()
    .isVisible()
    .catch(() => false);
  if (!visible) {
    // isUploadedProduct=true 인 경우 (등록상품 상세) 버튼 미노출 — 수집상품에서는 항상 노출되어야 함.
    return {
      ok: false as const,
      error_key: 'ai_recommend_button_missing' as ErrorKey,
      message: `${AI_RECOMMEND_BUTTON} 버튼 미노출 — 수집상품이 아니거나 CategoryButtonGroup 미렌더링`,
    };
  }
  return { ok: true as const };
};

const verifyCategoryCopyButtonVisibleStep: StepHandler = async (page) => {
  const visible = await page
    .getByRole('button', { name: CATEGORY_COPY_BUTTON, exact: true })
    .first()
    .isVisible()
    .catch(() => false);
  if (!visible) {
    return {
      ok: false as const,
      error_key: 'category_copy_button_missing' as ErrorKey,
      message: `${CATEGORY_COPY_BUTTON} 버튼 미노출`,
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_first_product_detail: openFirstCollectedProductStep,
  click_info_tab: clickTabByLabelStep(/^기본 정보$/),
  verify_category_section_visible: verifyCategorySectionVisibleStep,
  verify_ai_recommend_button_visible: verifyAiRecommendButtonVisibleStep,
  verify_category_copy_button_visible: verifyCategoryCopyButtonVisibleStep,
};

test('[TC 861/862] 수집상품 상세 → [기본 정보] 탭 → "상품 카테고리" 섹션 + [AI 카테고리 추천] + [카테고리 복사] 버튼 노출 (실 추천 클릭 destructive 라 skip)', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
