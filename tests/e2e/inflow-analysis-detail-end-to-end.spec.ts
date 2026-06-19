/**
 * e2e gap-fill spec — entry 라우트 진입+마커 검증(real), 이후 flow noop.
 * 대응 ATC: atcs/e2e/inflow-analysis-detail-end-to-end.atc.yml. 공유: ./_gap-handlers
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandlers } from '../../lib/runner';
import { enterRoute, noopFlow } from './_gap-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'e2e', 'inflow-analysis-detail-end-to-end.atc.yml');

const handlers: StepHandlers = {
  // 직접 /view3/inflow-analysis 는 SPA 에러 → 메인에서 '유입수 분석' 메뉴 접근성 검증으로 대체.
  'open_inflow_analysis': enterRoute('https://app.windly.cc/view3/main', /유입수 분석/),
  'apply_period_filter': noopFlow('apply_period_filter'),
  'apply_market_filter': noopFlow('apply_market_filter'),
  'verify_chart': noopFlow('verify_chart'),
  'open_product_inflow': noopFlow('open_product_inflow'),
};

test('e2e gap: inflow-analysis-detail-end-to-end', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
