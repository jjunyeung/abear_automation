/**
 * e2e gap-fill spec — entry 라우트 진입+마커 검증(real), 이후 flow noop.
 * 대응 ATC: atcs/e2e/similar-product-find-end-to-end.atc.yml. 공유: ./_gap-handlers
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandlers } from '../../lib/runner';
import { enterRoute, noopFlow } from './_gap-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'e2e', 'similar-product-find-end-to-end.atc.yml');

const handlers: StepHandlers = {
  'open_recommend_page': enterRoute('https://app.windly.cc/view3/recommended-product', /인기 상품 추천/),
  'pick_product_card': noopFlow('pick_product_card'),
  'open_similar_modal': noopFlow('open_similar_modal'),
  'verify_similar_results': noopFlow('verify_similar_results'),
  'collect_similar': noopFlow('collect_similar'),
};

test('e2e gap: similar-product-find-end-to-end', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
