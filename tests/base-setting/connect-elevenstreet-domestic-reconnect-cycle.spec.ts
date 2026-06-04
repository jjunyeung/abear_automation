/**
 * 연결설정 / 11번가 국내 해제 → 동일 키 재연결 사이클 (destructive, 안전 가드).
 * 대응 ATC : atcs/base-setting/connect-elevenstreet-domestic-reconnect-cycle.atc.yml
 * TC 원본  : Case No 996/999/1000/1005/1006 / P0.
 */

import 'dotenv/config';
import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC } from '../../lib/runner';
import { buildReconnectHandlers } from './_market-reconnect-cycle';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'base-setting', 'connect-elevenstreet-domestic-reconnect-cycle.atc.yml');

const handlers = buildReconnectHandlers({
  marketEnum: 'ELEVENSTREET_DOMESTIC',
  marketName: '11번가 국내',
  connectUrl: 'https://app.windly.cc/view3/connect?setting=MARKET&openMarket=ELEVENSTREET_DOMESTIC',
  fields: [
    { label: '11번가 Open API Key', value: process.env.ELEVENSTREET_DOMESTIC_API_KEY ?? '', guard: true },
  ],
});

test('[TC 996/999/1000/1005/1006] 11번가 국내 설정 초기화 → 동일 키 재연결 사이클 (destructive)', async ({ page }) => {
  test.setTimeout(4 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
