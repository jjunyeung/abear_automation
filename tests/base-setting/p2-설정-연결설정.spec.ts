/**
 * P2 설정 / 연결설정 영역 — skeleton ATC 의 2 TC.
 *
 * 검증 정책:
 *   - TC941 인터파크 / TC942 위메프 — 연결 페이지 진입 + "마켓 연결 방법" 안내 텍스트 노출.
 *   - 사용 가이드 선택 (외부 페이지) = noop.
 */

import { join } from 'path';
import type { Page } from '@playwright/test';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'base-setting', 'p2-설정-연결설정.atc.yml');
const BASE_URL = 'https://app.windly.cc/view3/connect?setting=MARKET&openMarket=';

async function enterMarketAndCheck(page: Page, market: string, title: string): Promise<ReturnType<StepHandler>> {
  await page.goto(BASE_URL + market, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);
  const body = await page.evaluate(() => document.body.innerText);
  if (!body.includes(title)) {
    return {
      ok: false as const,
      error_key: 'market_connect_title_missing' as ErrorKey,
      message: `${market} 연결 페이지 "${title}" 미노출`,
    };
  }
  // 안내문구 / 사용 가이드 텍스트 노출 검증
  if (!body.includes('사용 가이드') && !body.includes('마켓 연결 방법')) {
    return {
      ok: false as const,
      error_key: 'connect_guide_missing' as ErrorKey,
      message: `${market} 연결 페이지에 사용 가이드 / 마켓 연결 방법 안내문구 미노출`,
    };
  }
  return { ok: true as const };
}

const handlers: StepHandlers = {
  // TC941 인터파크
  tc941: async (page) => enterMarketAndCheck(page, 'INTERPARK', '인터파크'),
  // TC942 위메프 — Connect/Market/index.tsx 의 enum 키 = WEMARKET
  tc942: async (page) => enterMarketAndCheck(page, 'WEMARKET', '위메프'),
};

test('P2 설정 / 연결설정 — 인터파크 / 위메프 연결 페이지 진입 + 안내문구 노출', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
