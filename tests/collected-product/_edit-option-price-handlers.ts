/**
 * 옵션 가격 수정 handler 모듈 — test() 호출 없음.
 */

import type { Page } from '@playwright/test';
import type { StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { goToCollectedProducts } from '../../lib/windly-actions';
import { logger } from '../../lib/logger';

async function clickTab(page: Page, name: string): Promise<void> {
  const tab = page.getByRole('button', { name }).first();
  await tab.waitFor({ state: 'visible', timeout: 10_000 });
  await tab.click();
  await page.waitForTimeout(1_500);
}

export const editOptionPriceHandlers: StepHandlers = {
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
    await page.waitForURL(/\/view2\/interested-product\/\d+/, { timeout: 30_000 }).catch(() => undefined);
    await page.waitForTimeout(1_500);
    return { ok: true as const };
  },
  bump_option_price: async (page) => {
    await clickTab(page, '판매가');
    const target = await page.evaluate(() => {
      const els = Array.from(
        document.querySelectorAll('input[type="text"], input[type="number"], input:not([type])'),
      ) as HTMLInputElement[];
      for (let i = 0; i < els.length; i++) {
        const el = els[i];
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const v = (el.value ?? '').trim();
        const cleaned = v.replace(/,/g, '');
        if (/^\d+$/.test(cleaned) && parseInt(cleaned, 10) >= 100) {
          return { idx: i, value: v };
        }
      }
      return { idx: -1, value: '' };
    });
    if (target.idx < 0) {
      return {
        ok: false as const,
        error_key: 'option_price_input_not_found' as ErrorKey,
        message: '판매가 탭의 가격 input 미발견 (옵션 없음 가능)',
      };
    }
    const cleaned = target.value.replace(/,/g, '');
    const cur = parseInt(cleaned, 10);
    const next = cur + 100;
    const input = page
      .locator('input[type="text"], input[type="number"], input:not([type])')
      .nth(target.idx);
    await input.click();
    await input.fill('');
    await input.pressSequentially(String(next), { delay: 5 });
    await input.press('Tab');
    await page.waitForTimeout(2_000);
    logger.info(`[bump_option_price] idx=${target.idx}: ${cur} → ${next}`);
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
    if (!Number.isFinite(afterNum) || Math.abs(afterNum - next) > 10) {
      return {
        ok: false as const,
        error_key: 'option_price_not_persisted' as ErrorKey,
        message: `reload 후 값 미반영: expected≈${next}, actual="${after}"`,
      };
    }
    logger.info(`[bump_option_price] reload 후: "${after}"`);
    return { ok: true as const };
  },
};
