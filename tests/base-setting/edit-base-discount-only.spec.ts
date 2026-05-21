/**
 * 기본 설정 > 공통설정 > 판매가 → 할인율만 변경 → 영속성 검증
 *
 * 대응 ATC: atcs/e2e/edit-base-discount-only.atc.yml
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
  'edit-base-discount-only.atc.yml',
);

import { logger } from '../../lib/logger';
import type { Locator, Page } from '@playwright/test';

const PRICE_URL =
  'https://app.windly.cc/view3/base-setting?setting=COMMON&category=PRICE_SETTING';

const DISCOUNT_LABEL = '판매가 할인율';

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
  open_price: async (page) => {
    await page.goto(PRICE_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(1_500);
    const input = fieldInputByLabel(page, DISCOUNT_LABEL);
    try {
      await waitLoaded(input, 30_000);
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      return {
        ok: false as const,
        error_key: 'discount_input_not_loaded' as ErrorKey,
        message: `할인율 input 미로드: ${err}`,
      };
    }
    return { ok: true as const };
  },
  bump_discount: async (page) => {
    const input = fieldInputByLabel(page, DISCOUNT_LABEL);
    const raw = await waitLoaded(input);
    const cur = parseFloat(raw.replace(/,/g, ''));
    if (!Number.isFinite(cur)) {
      return {
        ok: false as const,
        error_key: 'discount_input_unreadable' as ErrorKey,
        message: `할인율 현재값 파싱 실패: "${raw}"`,
      };
    }
    const next = cur >= 99 ? cur - 1 : cur + 1;
    newValue = next;
    logger.info(`[bump_discount] ${cur} → ${next}`);
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
      error_key: 'discount_save_not_reflected' as ErrorKey,
      message: `저장 후 할인율 input 미반영. expected≈${next}`,
    };
  },
  verify_persist: async (page) => {
    if (newValue === null) {
      return {
        ok: false as const,
        error_key: 'verify_no_baseline' as ErrorKey,
        message: 'bump_discount 이 새 값을 기록하지 않음',
      };
    }
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(1_500);
    const input = fieldInputByLabel(page, DISCOUNT_LABEL);
    const raw = await waitLoaded(input);
    const after = parseFloat(raw.replace(/,/g, ''));
    if (!Number.isFinite(after) || Math.abs(after - newValue) > 0.5) {
      return {
        ok: false as const,
        error_key: 'discount_not_persisted' as ErrorKey,
        message: `reload 후 할인율 미반영. expected≈${newValue}, actual="${raw}"`,
      };
    }
    logger.info(`[verify_persist] reload 후 할인율="${raw}" (≈${newValue})`);
    return { ok: true as const };
  },
};

test('기본 설정 > 공통설정 > 판매가 → 할인율만 변경 → 영속성 검증', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
