/**
 * 연결설정 / 오픈마켓 5개 마켓 연결 페이지 진입 smoke (non-destructive).
 *
 * 대응 ATC : atcs/base-setting/connect-markets-smoke.atc.yml
 * TC 원본  : Case No 1007, 1011, 1012 / P0 (3건) + 마켓별 페이지 진입 회귀.
 */

import { join } from 'path';
import type { Page } from '@playwright/test';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'base-setting',
  'connect-markets-smoke.atc.yml',
);

const BASE_URL = 'https://app.windly.cc/view3/connect?setting=MARKET&openMarket=';

async function gotoMarketAndCheck(
  page: Page,
  marketKey: string,
  expectedTitle: string,
  errorKey: ErrorKey,
): Promise<ReturnType<StepHandler>> {
  await page.goto(BASE_URL + marketKey, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
  await page
    .getByText(new RegExp(expectedTitle))
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 })
    .catch(() => undefined);
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (!bodyText.includes(expectedTitle)) {
    return {
      ok: false as const,
      error_key: errorKey,
      message: `${marketKey} 페이지 진입 후 "${expectedTitle}" title 미노출`,
    };
  }
  return { ok: true as const };
}

const handlers: StepHandlers = {
  enter_coupang_connect: async (page) =>
    gotoMarketAndCheck(page, 'COUPANG', '쿠팡 설정', 'coupang_connect_title_missing' as ErrorKey),
  enter_elevenstreet_domestic_connect: async (page) =>
    gotoMarketAndCheck(
      page,
      'ELEVENSTREET_DOMESTIC',
      '11번가 국내 설정',
      'elevenstreet_domestic_title_missing' as ErrorKey,
    ),
  enter_elevenstreet_global_connect: async (page) =>
    gotoMarketAndCheck(
      page,
      'ELEVENSTREET_GLOBAL',
      '11번가 글로벌 설정',
      'elevenstreet_global_title_missing' as ErrorKey,
    ),
  enter_lotteon_connect: async (page) =>
    gotoMarketAndCheck(page, 'LOTTEON', '롯데온 설정', 'lotteon_connect_title_missing' as ErrorKey),
  enter_interpark_connect: async (page) =>
    gotoMarketAndCheck(page, 'INTERPARK', '인터파크 설정', 'interpark_connect_title_missing' as ErrorKey),
};

test('[TC 1007/1011/1012] 연결설정 → 오픈마켓 5 마켓 (쿠팡/11번가 국내/글로벌/롯데온/인터파크) 순차 진입 → 각 페이지 Layout title 노출 회귀 확인', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
