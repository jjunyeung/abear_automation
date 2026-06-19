/**
 * e2e gap-fill spec — entry 라우트 진입+마커 검증(real), 이후 flow noop.
 * 대응 ATC: atcs/e2e/stock-update-detail-end-to-end.atc.yml. 공유: ./_gap-handlers
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandlers } from '../../lib/runner';
import { enterRoute, noopFlow } from './_gap-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'e2e', 'stock-update-detail-end-to-end.atc.yml');

const handlers: StepHandlers = {
  'open_stock_update': enterRoute('https://app.windly.cc/view3/stock-sync', /재고/),
  'trigger_sync': noopFlow('trigger_sync'),
  'verify_list': noopFlow('verify_list'),
  'open_stock_detail': noopFlow('open_stock_detail'),
  'verify_stock_detail': noopFlow('verify_stock_detail'),
};

test('e2e gap: stock-update-detail-end-to-end', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
