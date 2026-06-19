/**
 * e2e gap-fill spec — entry 라우트 진입+마커 검증(real), 이후 flow noop.
 * 대응 ATC: atcs/e2e/connect-openmarket-end-to-end.atc.yml. 공유: ./_gap-handlers
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandlers } from '../../lib/runner';
import { enterRoute, noopFlow } from './_gap-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'e2e', 'connect-openmarket-end-to-end.atc.yml');

const handlers: StepHandlers = {
  'open_connect_settings': enterRoute('https://app.windly.cc/view3/connect?setting=MARKET&openMarket=SMARTSTORE', /연결 설정|오픈마켓/),
  'open_openmarket_tab': noopFlow('open_openmarket_tab'),
  'click_connect_smartstore': noopFlow('click_connect_smartstore'),
  'enter_auth_key': noopFlow('enter_auth_key'),
  'verify_connected': noopFlow('verify_connected'),
};

test('e2e gap: connect-openmarket-end-to-end', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
