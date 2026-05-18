/**
 * 수집상품 첫 카드 → 옵션 재고 단건 변경 → 영속성 검증
 *
 * 대응 ATC: atcs/collect/edit-option-stock.atc.yml
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
  'edit-option-stock.atc.yml',
);

import { logger } from '../../lib/logger';

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
  bump_option_stock: async (page) => {
    await clickTab(page, '판매가');
    // 재고 input — SalesPriceTable 에서 1~9999 범위의 작은 정수 input.
    // 가격(보통 ≥100) 과 구별하기 위해 < 1000 인 값을 first 후보로.
    const target = await page.evaluate(() => {
      const els = Array.from(
        document.querySelectorAll('input[type="text"], input[type="number"], input:not([type])'),
      ) as HTMLInputElement[];
      for (let i = 0; i < els.length; i++) {
        const el = els[i];
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const v = (el.value ?? '').trim().replace(/,/g, '');
        if (/^\d+$/.test(v)) {
          const n = parseInt(v, 10);
          if (n >= 0 && n < 1000) {
            return { idx: i, value: n };
          }
        }
      }
      return { idx: -1, value: 0 };
    });
    if (target.idx < 0) {
      return {
        ok: false as const,
        error_key: 'option_stock_input_not_found' as ErrorKey,
        message: '판매가 탭의 재고 input 미발견 (옵션 없음 가능)',
      };
    }
    const next = target.value + 1;
    const input = page
      .locator('input[type="text"], input[type="number"], input:not([type])')
      .nth(target.idx);
    await input.click();
    await input.fill('');
    await input.pressSequentially(String(next), { delay: 5 });
    await input.press('Tab');
    await page.waitForTimeout(2_000);
    logger.info(`[bump_option_stock] idx=${target.idx}: ${target.value} → ${next}`);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2_000);
    await clickTab(page, '판매가');
    const after = await page.evaluate((wantIdx) => {
      const els = Array.from(
        document.querySelectorAll('input[type="text"], input[type="number"], input:not([type])'),
      ) as HTMLInputElement[];
      if (wantIdx >= els.length) return '';
      return els[wantIdx].value ?? '';
    }, target.idx);
    const afterNum = parseInt(after.replace(/,/g, ''), 10);
    if (afterNum !== next) {
      return {
        ok: false as const,
        error_key: 'option_stock_not_persisted' as ErrorKey,
        message: `reload 후 값 미반영: expected=${next}, actual="${after}"`,
      };
    }
    logger.info(`[bump_option_stock] reload 후: "${after}"`);
    return { ok: true as const };
  },
};

test('수집상품 첫 카드 → 옵션 재고 단건 변경 → 영속성 검증', async ({ page }) => {
  test.setTimeout(5 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
