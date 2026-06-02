/**
 * 연결설정 / 스마트스토어 마켓 연결 페이지 진입 (non-destructive).
 *
 * 대응 ATC : atcs/base-setting/connect-smartstore-market-page.atc.yml
 * TC 원본  : Case No 993, 995, 996, 1003 / P0 (4건). 실 연결/외부 링크 destructive skip.
 */

import { join } from 'path';
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
  'connect-smartstore-market-page.atc.yml',
);

const PAGE_URL =
  'https://app.windly.cc/view3/connect?setting=MARKET&openMarket=SMARTSTORE';

const PAGE_TITLE = '스마트스토어 설정';
const ACCOUNT_ID_LABEL = 'API 연동용 판매자 ID';
const CONNECT_BUTTON = '연결하기';
const RESET_BUTTON = '설정 초기화';

const enterSmartstoreMarketConnectStep: StepHandler = async (page) => {
  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
  await page
    .getByText(/스마트스토어 설정|스마트스토어/)
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 })
    .catch(() => undefined);
  return { ok: true as const };
};

function verifyTextPresentStep(text: string, errorKey: string): StepHandler {
  return async (page) => {
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (!bodyText.includes(text)) {
      return {
        ok: false as const,
        error_key: errorKey as ErrorKey,
        message: `"${text}" 미노출`,
      };
    }
    return { ok: true as const };
  };
}

const verifyConnectOrResetButtonStep: StepHandler = async (page) => {
  const bodyText = await page.evaluate(() => document.body.innerText);
  const hasConnect = bodyText.includes(CONNECT_BUTTON);
  const hasReset = bodyText.includes(RESET_BUTTON);
  if (!hasConnect && !hasReset) {
    return {
      ok: false as const,
      error_key: 'smartstore_connect_or_reset_missing' as ErrorKey,
      message: `${CONNECT_BUTTON} / ${RESET_BUTTON} 둘 다 미노출`,
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  enter_smartstore_market_connect: enterSmartstoreMarketConnectStep,
  verify_page_title: verifyTextPresentStep(PAGE_TITLE, 'smartstore_market_title_missing'),
  verify_api_account_id_field: verifyTextPresentStep(ACCOUNT_ID_LABEL, 'smartstore_account_id_field_missing'),
  verify_connect_or_reset_button: verifyConnectOrResetButtonStep,
};

test('[TC 993/995/996/1003] 연결설정 → 오픈마켓 → 스마트스토어 페이지 진입 → "스마트스토어 설정" Layout + [API 연동용 판매자 ID] input + [연결하기]/[설정 초기화] 버튼 노출', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
