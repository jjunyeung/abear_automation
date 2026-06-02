/**
 * P1 설정 / 연결설정 영역 — skeleton ATC 의 7 TC.
 *
 * 검증 정책: 각 마켓 연결 페이지 (스스/쿠팡/11번가 글로벌/11번가 국내/ESM2/ESM/롯데온) 진입 + 라벨 노출.
 *   - Connect/Market/index.tsx 의 enum 키 매핑 사용.
 */

import { join } from 'path';
import type { Page } from '@playwright/test';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'base-setting', 'p1-설정-연결설정.atc.yml');
const BASE_URL = 'https://app.windly.cc/view3/connect?setting=MARKET&openMarket=';

async function check(page: Page, market: string, label: string): Promise<ReturnType<StepHandler>> {
  await page.goto(BASE_URL + market, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(800);
  const body = await page.evaluate(() => document.body.innerText);
  if (!body.includes(label)) {
    return {
      ok: false as const,
      error_key: 'market_label_missing' as ErrorKey,
      message: `${market} 페이지에 '${label}' 라벨 미노출`,
    };
  }
  return { ok: true as const };
}

const handlers: StepHandlers = {
  tc934: async (page) => check(page, 'SMARTSTORE', '스마트스토어'),
  tc935: async (page) => check(page, 'COUPANG', '쿠팡'),
  tc936: async (page) => check(page, 'ELEVENSTREET_GLOBAL', '11번가'),
  tc937: async (page) => check(page, 'ELEVENSTREET_DOMESTIC', '11번가'),
  tc938: async (page) => check(page, 'ESM2', 'ESM'),
  tc939: async (page) => check(page, 'ESM', '옥션'),
  tc940: async (page) => check(page, 'LOTTEON', '롯데온'),
};

test('P1 설정 / 연결설정 — 7개 마켓 연결 페이지 진입 + 라벨', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
