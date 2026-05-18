/**
 * 수집상품 첫 카드 → AI 상품명 추천 → input 값 변경 확인
 *
 * 대응 ATC: atcs/collect/ai-recommend-name.atc.yml
 * 생성: scripts/gen-atc-tcs (단건 TC 일괄 생성).
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { goToCollectedProducts } from '../../lib/windly-actions';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'collect',
  'ai-recommend-name.atc.yml',
);

import { logger } from '../../lib/logger';

async function snapshotInputs(page: import('@playwright/test').Page): Promise<string[]> {
  return page.evaluate(() => {
    const els = Array.from(
      document.querySelectorAll('input, textarea'),
    ) as HTMLInputElement[];
    return els
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      })
      .map((el) => el.value ?? '');
  });
}

async function clickTab(
  page: import('@playwright/test').Page,
  name: string,
): Promise<void> {
  const tab = page.getByRole('button', { name }).first();
  await tab.waitFor({ state: 'visible', timeout: 10_000 });
  await tab.click();
  await page.waitForTimeout(1_500);
}

const handlers: StepHandlers = {
  open_collected_list: async (page) => {
    await goToCollectedProducts(page);
    return { ok: true as const };
  },
  open_first_product: async (page) => {
    const card = page.locator('a[href*="/view2/interested-product/"]').first();
    try {
      await card.waitFor({ state: 'visible', timeout: 30_000 });
    } catch {
      return {
        ok: false as const,
        error_key: 'no_collected_products' as ErrorKey,
        message: '수집상품 카드 0개',
      };
    }
    await card.click();
    await page
      .waitForURL(/\/view2\/interested-product\/\d+/, { timeout: 30_000 })
      .catch(() => undefined);
    await page.waitForTimeout(1_500);
    return { ok: true as const };
  },
  recommend_name: async (page) => {
    await clickTab(page, '기본 정보');
    const before = await snapshotInputs(page);
    const btn = page
      .getByRole('button', { name: /AI\s*상품명\s*추천/ })
      .first();
    await btn.waitFor({ state: 'visible', timeout: 10_000 });
    await btn.click();
    const loading = page.getByText(/AI\s*상품명\s*다듬기\s*중/);
    await loading
      .waitFor({ state: 'visible', timeout: 5_000 })
      .catch(() => undefined);
    await loading
      .waitFor({ state: 'hidden', timeout: 90_000 })
      .catch(() => undefined);
    await page.waitForTimeout(1_500);
    const errToast = page.getByText(
      /네트워크\s*오류|일시적|rate.*limit|초과|잠시\s*후/,
    );
    if (
      (await errToast.count()) > 0 &&
      (await errToast.first().isVisible())
    ) {
      const msg = await errToast.first().innerText().catch(() => '');
      return {
        ok: false as const,
        error_key: 'ai_name_rate_limited' as ErrorKey,
        message: `AI 상품명 추천 실패: ${msg}`,
      };
    }
    const after = await snapshotInputs(page);
    let changed = 0;
    const minLen = Math.min(before.length, after.length);
    for (let i = 0; i < minLen; i++) {
      if (before[i] !== after[i]) changed += 1;
    }
    logger.info(`[recommend_name] input 변경 ${changed}/${minLen}개`);
    if (changed === 0) {
      return {
        ok: false as const,
        error_key: 'ai_name_no_change' as ErrorKey,
        message: 'AI 추천 클릭 후 input 값 변경 없음',
      };
    }
    return { ok: true as const };
  },
};

test('수집상품 첫 카드 → AI 상품명 추천 → input 값 변경 확인', async ({ page }) => {
  test.setTimeout(5 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
