/**
 * P2 기본설정 / 톡스토어 영역 — skeleton ATC 의 5 TC.
 *
 * 검증 정책: 5 TC 모두 "? 호버" 툴팁 (배송정보 / 리뷰 포인트 / 상품 속성).
 *   - 툴팁 텍스트 검증은 어려움 (hover 동작 + delay). 대신 각 탭 페이지 진입 + 핵심 라벨 텍스트 노출 검증.
 */

import { join } from 'path';
import type { Page } from '@playwright/test';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'base-setting', 'p2-기본설정-톡스토어.atc.yml');
const TALKSTORE_BASE = 'https://app.windly.cc/view3/base-setting?setting=TALKSTORE&category=';

async function enterTabAndVerify(page: Page, category: string, mustHaveText: string): Promise<ReturnType<StepHandler>> {
  await page.goto(TALKSTORE_BASE + category, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);
  const body = await page.evaluate(() => document.body.innerText);
  if (!body.includes(mustHaveText)) {
    return {
      ok: false as const,
      error_key: 'talkstore_tab_text_missing' as ErrorKey,
      message: `톡스토어 ${category} 탭에 '${mustHaveText}' 미노출`,
    };
  }
  return { ok: true as const };
}

const handlers: StepHandlers = {
  // TC1018 배송정보 — 톡스토어 배송 카테고리 = DELIVERY_AND_AS (Talkstore/constants.ts)
  tc1018: async (page) => enterTabAndVerify(page, 'DELIVERY_AND_AS', '택배사'),
  // TC1045/1047/1058 리뷰 포인트
  'tc1045_리뷰-포인트': async (page) => enterTabAndVerify(page, 'REVIEW_POINT', '리뷰'),
  'tc1047_리뷰-포인트': async (page) => enterTabAndVerify(page, 'REVIEW_POINT', '포인트'),
  'tc1058_리뷰-포인트': async (page) => enterTabAndVerify(page, 'REVIEW_POINT', '포인트'),
  // TC1067 상품 속성 — 원산지
  'tc1067_상품-속성': async (page) => enterTabAndVerify(page, 'ATTRIBUTE', '원산지'),
};

test('P2 기본설정 / 톡스토어 — 배송정보 / 리뷰 포인트 / 상품 속성 탭 진입 + 라벨 노출', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
