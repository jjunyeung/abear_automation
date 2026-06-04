/**
 * 연결설정 / 스마트스토어 해제 → 동일 판매자 ID 재연결 사이클 (destructive, 안전 가드).
 * 대응 ATC : atcs/base-setting/connect-smartstore-reconnect-cycle.atc.yml
 * TC 원본  : Case No 996/999/1000/1005/1006 / P0.
 * 연결 버튼 "연결하기" → URL 검증 → 스토어 연결 확인 모달 "맞습니다".
 */

import 'dotenv/config';
import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC } from '../../lib/runner';
import { buildReconnectHandlers } from './_market-reconnect-cycle';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'base-setting', 'connect-smartstore-reconnect-cycle.atc.yml');

const handlers = buildReconnectHandlers({
  marketEnum: 'SMARTSTORE',
  marketName: '스마트스토어',
  connectUrl: 'https://app.windly.cc/view3/connect?setting=MARKET&openMarket=SMARTSTORE',
  connectButtonName: '연결하기',
  intermediateConfirm: '맞습니다',
  fields: [
    { label: 'API 연동용 판매자 ID', value: process.env.SMARTSTORE_SELLER_ID ?? '', guard: true },
  ],
});

test('[TC 996/999/1000/1005/1006] 스마트스토어 설정 초기화 → 동일 판매자 ID 재연결 사이클 (destructive)', async ({ page }) => {
  test.setTimeout(4 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
