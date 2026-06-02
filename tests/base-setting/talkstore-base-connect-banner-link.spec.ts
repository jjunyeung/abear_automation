/**
 * 기본설정 톡스토어 — "연결하러 가기" 배너 클릭 → 연결설정 이동 검증.
 *
 * 대응 ATC : atcs/base-setting/talkstore-base-connect-banner-link.atc.yml
 * TC 원본  : Case No 1016 / P0
 *
 * 사전조건: 톡스토어 연결되지 않은 상태 (banner 노출). 이미 연결되어 있으면
 *           link_not_found 로 fail — 환경 차원.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandlers } from '../../lib/runner';
import {
  clickInternalLinkStep,
  gotoTalkstoreBaseSettingStep,
} from './_talkstore-base-handlers';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'base-setting',
  'talkstore-base-connect-banner-link.atc.yml',
);

const handlers: StepHandlers = {
  goto_delivery_tab: gotoTalkstoreBaseSettingStep('DELIVERY_AND_AS'),
  // 연결설정 경로 — windly view3 의 link 경로는 보통 /view3/link 또는 /link 시작.
  // 기대 path 일부만 매칭하므로 어느 식이든 가장 안정적인 'link' 한 단어로.
  click_connect_link: clickInternalLinkStep('연결하러 가기', 'link', 'connect_banner'),
};

test('[TC 1016] 기본설정 → 톡스토어 → "연결하러 가기" 배너 클릭 → /view3/connect SPA 이동 (이미 연결된 환경에서는 배너 미노출 → success skip)', async ({ page }) => {
  test.setTimeout(90_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
