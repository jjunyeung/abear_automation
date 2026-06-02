/**
 * 연결설정 / 톡스토어 마켓 연결 페이지 진입 (non-destructive).
 *
 * 대응 ATC : atcs/base-setting/connect-talkstore-page.atc.yml
 * TC 원본  : Case No 990 / P0 (1건).
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
  'connect-talkstore-page.atc.yml',
);

const PAGE_URL =
  'https://app.windly.cc/view3/connect?setting=MARKET&openMarket=TALKSTORE';

const PAGE_TITLE = '톡스토어 설정';
const API_KEY_LABEL = 'Open API 인증키';
const STORE_URL_PREFIX = 'store.kakao.com/';

const enterTalkstoreMarketConnectStep: StepHandler = async (page) => {
  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
  await page
    .getByText(/톡스토어 설정|톡스토어/)
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

const handlers: StepHandlers = {
  enter_talkstore_market_connect: enterTalkstoreMarketConnectStep,
  verify_page_title: verifyTextPresentStep(PAGE_TITLE, 'talkstore_market_title_missing'),
  verify_api_key_field: verifyTextPresentStep(API_KEY_LABEL, 'talkstore_api_key_label_missing'),
  verify_store_url_field: verifyTextPresentStep(STORE_URL_PREFIX, 'talkstore_store_url_missing'),
};

test('[TC 990] 연결설정 → 오픈마켓 → 톡스토어 페이지 진입 → "톡스토어 설정" Layout title + [Open API 인증키] input + [스토어 URL] (store.kakao.com/) 필드 노출', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
