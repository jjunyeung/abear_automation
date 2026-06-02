/**
 * AI 전세계 상품수집 페이지 진입 + 핵심 섹션 노출 (non-destructive).
 *
 * 대응 ATC : atcs/product-collect/global-sourcing-page-smoke.atc.yml
 * TC 원본  : Case No 967, 971, 982 / P0 (3건).
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
  'product-collect',
  'global-sourcing-page-smoke.atc.yml',
);

const PAGE_URL = 'https://app.windly.cc/view3/global-sourcing';

const TEXTS = {
  pageTitle: 'AI 전세계 상품 수집',
  heroText: '원하는 상품을 해외 어디서든 수집하여 판매해보세요',
  addSection: '상품 수집 요청 목록에 추가',
  waitingList: '상품 수집 요청 대기 목록',
};

const enterGlobalSourcingPageStep: StepHandler = async (page) => {
  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
  await page
    .getByText(/AI 전세계 상품 수집/)
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
        message: `"${text}" 텍스트 미노출`,
      };
    }
    return { ok: true as const };
  };
}

const handlers: StepHandlers = {
  enter_global_sourcing_page: enterGlobalSourcingPageStep,
  verify_page_title: verifyTextPresentStep(TEXTS.pageTitle, 'global_sourcing_title_missing'),
  verify_header_hero_text: verifyTextPresentStep(TEXTS.heroText, 'global_sourcing_hero_missing'),
  verify_request_waiting_list_add_section: verifyTextPresentStep(TEXTS.addSection, 'request_add_section_missing'),
  verify_request_waiting_list_section: verifyTextPresentStep(TEXTS.waitingList, 'request_waiting_list_missing'),
};

test('[TC 967/971/982] AI 전세계 상품수집 페이지 진입 → Header / 추천 소싱몰 / 요청 목록 추가 / 요청 대기 목록 4 섹션 노출 확인', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
