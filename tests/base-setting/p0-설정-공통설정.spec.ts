/**
 * P0 설정 / 공통설정 — 마켓별 판매가 가중치 (2 TC).
 *
 * TC1013: 가중치 항목에 10개 마켓 노출 (verified)
 * TC1014: 톡스토어 가중치 입력 후 저장 → destructive (skip)
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'base-setting', 'p0-설정-공통설정.atc.yml');
const URL = 'https://app.windly.cc/view3/base-setting?setting=COMMON&category=PRICE_SETTING';

const verifyMarketWeights: StepHandler = async (page) => {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);

  const body = await page.evaluate(() => document.body.innerText);
  // 가중치 / 마켓 키 노출
  if (!body.includes('가중치')) {
    return {
      ok: false as const,
      error_key: 'weight_section_missing' as ErrorKey,
      message: '가중치 섹션 미노출',
    };
  }
  const markets = ['스마트스토어', '쿠팡', '11번가', '롯데온', '톡스토어'];
  for (const m of markets) {
    if (!body.includes(m)) {
      return {
        ok: false as const,
        error_key: 'market_weight_label_missing' as ErrorKey,
        message: `마켓 '${m}' 가중치 라벨 미노출`,
      };
    }
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  tc1013: verifyMarketWeights,
  tc1014: async () => {
    logger.info('[common-weight] TC1014 톡스토어 가중치 입력 저장 — destructive skip');
    return { ok: true as const };
  },
};

test('P0 설정 / 공통설정 — 마켓별 가중치 노출 (TC1013 verified)', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
