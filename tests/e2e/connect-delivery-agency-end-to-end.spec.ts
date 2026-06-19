/**
 * e2e gap-fill spec — entry 라우트 진입+마커 검증(real), 이후 flow noop.
 * 대응 ATC: atcs/e2e/connect-delivery-agency-end-to-end.atc.yml. 공유: ./_gap-handlers
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandlers } from '../../lib/runner';
import { enterRoute, noopFlow } from './_gap-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'e2e', 'connect-delivery-agency-end-to-end.atc.yml');

const handlers: StepHandlers = {
  'open_connect_settings': enterRoute('https://app.windly.cc/view3/connect?setting=MARKET', /연결 설정|배송대행/),
  'open_da_tab': noopFlow('open_da_tab'),
  'select_da_provider': noopFlow('select_da_provider'),
  'submit_da_info': noopFlow('submit_da_info'),
  'verify_da_connected': noopFlow('verify_da_connected'),
};

test('e2e gap: connect-delivery-agency-end-to-end', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
