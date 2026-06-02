/**
 * 수집상품 첫 카드 → AI 카테고리 추천 → 호출 성공 확인
 *
 * 대응 ATC: atcs/collect/ai-recommend-category.atc.yml
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC } from '../../lib/runner';
import { aiRecommendCategoryHandlers } from './_ai-recommend-category-handlers';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'collected-product',
  'ai-recommend-category.atc.yml',
);

test('수집상품 첫 카드 → AI 카테고리 추천 → 호출 성공 확인', async ({ page }) => {
  test.setTimeout(5 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers: aiRecommendCategoryHandlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
