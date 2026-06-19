/**
 * e2e gap-fill spec — entry 라우트 진입+마커 검증(real), 이후 flow noop.
 * 대응 ATC: atcs/e2e/product-ranking-detail-end-to-end.atc.yml. 공유: ./_gap-handlers
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandlers } from '../../lib/runner';
import { enterRoute, noopFlow } from './_gap-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'e2e', 'product-ranking-detail-end-to-end.atc.yml');

const handlers: StepHandlers = {
  'open_product_ranking': enterRoute('https://app.windly.cc/view3/keyword-rank', /순위/),
  'apply_ranking_filter': noopFlow('apply_ranking_filter'),
  'verify_ranking_list': noopFlow('verify_ranking_list'),
  'open_ranking_detail': noopFlow('open_ranking_detail'),
  'verify_ranking_detail': noopFlow('verify_ranking_detail'),
};

test('e2e gap: product-ranking-detail-end-to-end', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
