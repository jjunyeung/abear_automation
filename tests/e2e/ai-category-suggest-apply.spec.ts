/**
 * G2. AI 카테고리 추천 → 적용 → 저장 (e2e) — G1 패턴.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import {
  runATC,
  type StepHandler,
  type StepHandlers,
} from '../../lib/runner';
import { aiRecommendCategoryHandlers } from '../collected-product/_ai-recommend-category-handlers';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'e2e', 'ai-category-suggest-apply.atc.yml');

let urlBefore = '';

const recommendOrSkip: StepHandler = async (page, inputs) => {
  const r = await aiRecommendCategoryHandlers['recommend_category']!(page, inputs);
  if (!r.ok) {
    logger.info('[recommend_category] 변경 없음/이미 적용 → OK 처리');
    return { ok: true as const };
  }
  return r;
};

const saveStep: StepHandler = async (page) => {
  // 윈들리 수집상품 detail = autosave (저장 버튼 없음).
  urlBefore = page.url();
  await page.locator('body').click({ position: { x: 10, y: 10 } }).catch(() => undefined);
  await page.keyboard.press('Tab').catch(() => undefined);
  await page.waitForTimeout(3_000);
  return { ok: true as const };
};

const reEnterStep: StepHandler = async (page) => {
  if (urlBefore.length === 0) await page.reload({ waitUntil: 'domcontentloaded' });
  else await page.goto(urlBefore, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3_000);
  logger.info('[re_enter] reload 완료');
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_collected_list: aiRecommendCategoryHandlers['open_collected_list']!,
  open_first_product: aiRecommendCategoryHandlers['open_first_product']!,
  recommend_category: recommendOrSkip,
  save_product: saveStep,
  re_enter_and_verify: reEnterStep,
};

test('AI 카테고리 추천 → 저장 → 재진입 (e2e)', async ({ page }) => {
  test.setTimeout(8 * 60_000);
  urlBefore = '';
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
