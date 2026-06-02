/**
 * P1 기본설정 / 톡스토어 영역 — skeleton ATC 의 16 TC.
 *
 * 검증 정책:
 *   - 모두 입력 필드 onBlur 저장 = destructive.
 *   - 추가 배송비 / AS 정보 / 리뷰 포인트 탭 진입 + 핵심 라벨 노출 = 실 검증.
 *   - 실 입력 / 저장 / onBlur 액션은 noop.
 */

import { join } from 'path';
import type { Page } from '@playwright/test';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'base-setting', 'p1-기본설정-톡스토어.atc.yml');
const BASE = 'https://app.windly.cc/view3/base-setting?setting=TALKSTORE&category=';

const visitedTabs = new Set<string>();

async function visitTabAndVerify(page: Page, category: string, label: string): Promise<ReturnType<StepHandler>> {
  if (visitedTabs.has(category)) {
    return { ok: true as const };
  }
  await page.goto(BASE + category, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(800);
  const body = await page.evaluate(() => document.body.innerText);
  if (!body.includes(label)) {
    return {
      ok: false as const,
      error_key: 'talkstore_tab_label_missing' as ErrorKey,
      message: `${category} 탭에 '${label}' 미노출`,
    };
  }
  visitedTabs.add(category);
  return { ok: true as const };
}

const handlers: StepHandlers = {
  // 추가 배송비 — DELIVERY_AND_AS 탭
  'tc1027_추가-배송비': async (page) => visitTabAndVerify(page, 'DELIVERY_AND_AS', '추가 배송비'),
  'tc1028_추가-배송비': async () => { logger.info('[talkstore-p1] TC1028 입력 onBlur — destructive'); return { ok: true as const }; },
  'tc1029_추가-배송비': async () => { logger.info('[talkstore-p1] TC1029 입력 onBlur — destructive'); return { ok: true as const }; },
  'tc1030_추가-배송비': async () => { logger.info('[talkstore-p1] TC1030 입력 onBlur — destructive'); return { ok: true as const }; },
  'tc1031_추가-배송비': async () => { logger.info('[talkstore-p1] TC1031 입력 onBlur — destructive'); return { ok: true as const }; },
  'tc1033_추가-배송비': async () => { logger.info('[talkstore-p1] TC1033 입력 onBlur — destructive'); return { ok: true as const }; },
  'tc1034_추가-배송비': async () => { logger.info('[talkstore-p1] TC1034 입력 onBlur — destructive'); return { ok: true as const }; },
  'tc1035_추가-배송비': async () => { logger.info('[talkstore-p1] TC1035 입력 onBlur — destructive'); return { ok: true as const }; },
  'tc1036_추가-배송비': async () => { logger.info('[talkstore-p1] TC1036 입력 onBlur — destructive'); return { ok: true as const }; },
  'tc1037_추가-배송비': async () => { logger.info('[talkstore-p1] TC1037 입력 onBlur — destructive'); return { ok: true as const }; },
  // AS 정보 — 같은 탭 DELIVERY_AND_AS
  'tc1042_as-정보': async (page) => visitTabAndVerify(page, 'DELIVERY_AND_AS', 'A/S'),
  // 리뷰 포인트 — REVIEW_POINT 탭
  'tc1053_리뷰-포인트': async (page) => visitTabAndVerify(page, 'REVIEW_POINT', '리뷰'),
  'tc1054_리뷰-포인트': async () => { logger.info('[talkstore-p1] TC1054 적립액 입력 — destructive'); return { ok: true as const }; },
  'tc1055_리뷰-포인트': async () => { logger.info('[talkstore-p1] TC1055 적립액 입력 — destructive'); return { ok: true as const }; },
  'tc1056_리뷰-포인트': async () => { logger.info('[talkstore-p1] TC1056 적립액 입력 — destructive'); return { ok: true as const }; },
  'tc1062_리뷰-포인트': async () => { logger.info('[talkstore-p1] TC1062 적립율 입력 — destructive'); return { ok: true as const }; },
};

test('P1 기본설정 / 톡스토어 — 탭 진입 + 라벨 노출 + 입력 onBlur destructive skip', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  visitedTabs.clear();
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
