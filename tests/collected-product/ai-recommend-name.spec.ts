/**
 * 수집상품 첫 카드 → AI 상품명 추천 → input 값 변경 확인
 *
 * 대응 ATC: atcs/collect/ai-recommend-name.atc.yml
 * Handler 출처: ./_ai-recommend-name-handlers
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC } from '../../lib/runner';
import { aiRecommendNameHandlers } from './_ai-recommend-name-handlers';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'collected-product',
  'ai-recommend-name.atc.yml',
);

test('수집상품 첫 카드 → AI 상품명 추천 → input 값 변경 확인', async ({ page }) => {
  test.setTimeout(5 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers: aiRecommendNameHandlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
