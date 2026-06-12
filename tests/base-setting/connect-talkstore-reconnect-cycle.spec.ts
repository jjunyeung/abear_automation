/**
 * 연결설정 / 톡스토어 해제 → 동일 계정 재연결 사이클 (destructive, 2단계 연결, 안전 가드).
 * 대응 ATC : atcs/base-setting/connect-talkstore-reconnect-cycle.atc.yml
 * TC 원본  : Case No 996/998/1010/999/1000/1005/1006 / P0.
 */

import 'dotenv/config';
import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC } from '../../lib/runner';
import { buildReconnectHandlers } from './_market-reconnect-cycle';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'base-setting', 'connect-talkstore-reconnect-cycle.atc.yml');

const handlers = buildReconnectHandlers({
  marketEnum: 'TALKSTORE',
  marketName: '톡스토어',
  connectUrl: 'https://app.windly.cc/view3/connect?setting=MARKET&openMarket=TALKSTORE',
  intermediateConfirm: '확인했어요',
  fields: [
    // guard 식별필드 = Open API 인증키. (연결 상태에서 채워져 있는 실제 계정 식별값.
    //  '스토어 URL' 은 connected state 에서 비어있는 '스토어 바로가기' 헬퍼 input 이라 guard 부적합 — 항상 mismatch abort 됐음.)
    { label: 'Open API 인증키', value: process.env.TALKSTORE_OPENAPI_KEY ?? '', guard: true, fillOnReconnect: true },
    { label: '스토어 URL', value: process.env.TALKSTORE_CHANNEL_ID ?? '', guard: false, fillOnReconnect: false },
  ],
});

test('[TC 996/998/1010/999/1000/1005/1006] 톡스토어 설정 초기화 → 동일 계정 재연결 사이클 (destructive)', async ({ page }) => {
  test.setTimeout(4 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
