/**
 * 기본 설정 > 공통설정 > 마켓별 가중치 → 단일 마켓만 변경 → 영속성
 *
 * 대응 ATC: atcs/e2e/edit-base-market-weight-single.atc.yml
 * 생성: scripts/gen-atc-tcs (단건 TC 일괄 생성).
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';


const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'base-setting',
  'edit-base-market-weight-single.atc.yml',
);

import { logger } from '../../lib/logger';
import type { Locator, Page } from '@playwright/test';

const WEIGHT_URL =
  'https://app.windly.cc/view3/base-setting?setting=COMMON&category=MARKET_WEIGHT';

const FIRST_LABEL = '스마트스토어';

function fieldInputByLabel(page: Page, label: string): Locator {
  return page
    .getByText(label, { exact: true })
    .locator('xpath=./ancestor::*[descendant::input][1]')
    .locator('input')
    .first();
}

async function waitLoaded(input: Locator, timeoutMs = 30_000): Promise<string> {
  await input.waitFor({ state: 'visible', timeout: timeoutMs });
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const v = await input.inputValue().catch(() => '');
    if (v.trim() !== '') return v;
    await input.page().waitForTimeout(300);
  }
  return await input.inputValue();
}

let newValue: number | null = null;

const handlers: StepHandlers = {
  open_weight: async (page) => {
    await page.goto(WEIGHT_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(1_500);
    const input = fieldInputByLabel(page, FIRST_LABEL);
    try {
      await waitLoaded(input, 30_000);
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      return {
        ok: false as const,
        error_key: 'market_weight_not_loaded' as ErrorKey,
        message: `${FIRST_LABEL} 가중치 input 미로드: ${err}`,
      };
    }
    return { ok: true as const };
  },
  bump_first_market: async (page) => {
    const input = fieldInputByLabel(page, FIRST_LABEL);
    const raw = await waitLoaded(input);
    const cur = parseFloat(raw.replace(/,/g, ''));
    if (!Number.isFinite(cur)) {
      return {
        ok: false as const,
        error_key: 'market_weight_unreadable' as ErrorKey,
        message: `${FIRST_LABEL} 현재값 파싱 실패: "${raw}"`,
      };
    }
    const next = cur >= 1000 ? cur - 1 : cur + 1;
    newValue = next;
    logger.info(`[bump_first_market] ${FIRST_LABEL}: ${cur} → ${next}`);
    await input.click();
    await input.fill('');
    await input.fill(String(next));
    await input.press('Tab');
    const start = Date.now();
    while (Date.now() - start < 8_000) {
      await page.waitForTimeout(500);
      const after = await input.inputValue().catch(() => '');
      const afterNum = parseFloat(after.replace(/,/g, ''));
      if (Math.abs(afterNum - next) < 0.5) {
        return { ok: true as const };
      }
    }
    return {
      ok: false as const,
      error_key: 'market_weight_save_not_reflected' as ErrorKey,
      message: `저장 후 ${FIRST_LABEL} input 미반영. expected≈${next}`,
    };
  },
  verify_persist: async (page) => {
    if (newValue === null) {
      return {
        ok: false as const,
        error_key: 'verify_no_baseline' as ErrorKey,
        message: 'bump_first_market 이 새 값을 기록하지 않음',
      };
    }
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(1_500);
    const input = fieldInputByLabel(page, FIRST_LABEL);
    const raw = await waitLoaded(input);
    const after = parseFloat(raw.replace(/,/g, ''));
    if (!Number.isFinite(after) || Math.abs(after - newValue) > 0.5) {
      return {
        ok: false as const,
        error_key: 'market_weight_not_persisted' as ErrorKey,
        message: `reload 후 ${FIRST_LABEL} 미반영. expected≈${newValue}, actual="${raw}"`,
      };
    }
    logger.info(`[verify_persist] reload 후 ${FIRST_LABEL}="${raw}"`);
    return { ok: true as const };
  },
};

test('기본 설정 > 공통설정 > 마켓별 가중치 → 단일 마켓만 변경 → 영속성', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
