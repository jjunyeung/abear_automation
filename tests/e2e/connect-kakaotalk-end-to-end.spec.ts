/**
 * e2e gap-fill spec — entry 라우트 진입+마커 검증(real), 이후 flow noop.
 * 대응 ATC: atcs/e2e/connect-kakaotalk-end-to-end.atc.yml. 공유: ./_gap-handlers
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandlers } from '../../lib/runner';
import { enterRoute, noopFlow } from './_gap-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'e2e', 'connect-kakaotalk-end-to-end.atc.yml');

const handlers: StepHandlers = {
  'open_connect_settings': enterRoute('https://app.windly.cc/view3/connect?setting=MARKET', /연결 설정|카카오/),
  'open_kakao_tab': noopFlow('open_kakao_tab'),
  'start_kakao_auth': noopFlow('start_kakao_auth'),
  'complete_kakao_auth': noopFlow('complete_kakao_auth'),
  'verify_kakao_connected': noopFlow('verify_kakao_connected'),
};

test('e2e gap: connect-kakaotalk-end-to-end', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
