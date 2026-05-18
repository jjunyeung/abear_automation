/**
 * 기본 설정 4개 카테고리 탭 순회 진입 smoke
 *
 * 대응 ATC: atcs/e2e/enter-base-setting-tabs.atc.yml
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
  'e2e',
  'enter-base-setting-tabs.atc.yml',
);

import type { Page } from '@playwright/test';

const BASE = 'https://app.windly.cc/view3/base-setting?setting=COMMON&category=';

async function gotoAndCheck(
  page: Page,
  category: string,
  labelRegex: RegExp,
): Promise<
  | { ok: true }
  | { ok: false; error_key: ErrorKey; message: string }
> {
  await page.goto(BASE + category, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(1_500);
  const label = page.getByText(labelRegex).first();
  try {
    await label.waitFor({ state: 'visible', timeout: 15_000 });
  } catch {
    return {
      ok: false,
      error_key: 'base_setting_category_not_loaded' as ErrorKey,
      message: `${category} 진입 후 ${labelRegex.source} 라벨 미발견`,
    };
  }
  return { ok: true };
}

const handlers: StepHandlers = {
  price_setting: async (page) => {
    const r = await gotoAndCheck(page, 'PRICE_SETTING', /^판매가\s*단위/);
    return r.ok ? { ok: true as const } : { ok: false as const, error_key: r.error_key, message: r.message };
  },
  delivery_info: async (page) => {
    const r = await gotoAndCheck(page, 'DELIVERY_INFO', /^기본\s*배송비$/);
    return r.ok ? { ok: true as const } : { ok: false as const, error_key: r.error_key, message: r.message };
  },
  market_weight: async (page) => {
    const r = await gotoAndCheck(page, 'MARKET_WEIGHT', /^스마트스토어$/);
    return r.ok ? { ok: true as const } : { ok: false as const, error_key: r.error_key, message: r.message };
  },
  product_attribute: async (page) => {
    const r = await gotoAndCheck(page, 'PRODUCT_ATTRIBUTE', /^제조사$/);
    return r.ok ? { ok: true as const } : { ok: false as const, error_key: r.error_key, message: r.message };
  },
};

test('기본 설정 4개 카테고리 탭 순회 진입 smoke', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
