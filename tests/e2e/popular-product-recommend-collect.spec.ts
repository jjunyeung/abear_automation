/**
 * J1. 인기 상품 추천 페이지 smoke (e2e)
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import {
  runATC,
  type StepHandler,
  type StepHandlers,
} from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'e2e', 'popular-product-recommend-collect.atc.yml');

const openStep: StepHandler = async (page) => {
  const candidates = [
    'https://app.windly.cc/view2/popular-product',
    'https://app.windly.cc/view2/popular-recommend',
    'https://app.windly.cc/view3/popular-product',
  ];
  for (const url of candidates) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15_000 });
      await page.waitForTimeout(2_000);
      const body = await page.evaluate(() => document.body.innerText.slice(0, 200));
      if (/인기|상품|키워드/.test(body)) return { ok: true as const };
    } catch { /* try next */ }
  }
  return {
    ok: false as const,
    error_key: 'popular_page_not_found' as ErrorKey,
    message: '인기 상품 추천 페이지 URL 미발견',
  };
};

const verifyStep: StepHandler = async (page) => {
  const sig = page.getByText(/인기\s*상품|추천|키워드/, { exact: false }).first();
  try {
    await sig.waitFor({ state: 'visible', timeout: 10_000 });
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error_key: 'popular_signature_missing' as ErrorKey,
      message: '인기 상품 시그니처 미발견',
    };
  }
};

const handlers: StepHandlers = {
  open_popular_recommend: openStep,
  verify_page_mounted: verifyStep,
};

test('인기 상품 추천 페이지 smoke (e2e)', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
