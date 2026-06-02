/**
 * 옵션 A-Z 정규화 handler 모듈 — test() 호출 없음 (e2e import 안전).
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

export const optionsAZNormalizeHandlers: StepHandlers = {
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
  apply_a_z: async (page) => {
    await clickTab(page, '옵션');
    const azBtns = page.getByRole('button', { name: /^A-Z$/ });
    const count = await azBtns.count();
    logger.info(`[apply_a_z] A-Z 버튼 ${count}개 발견`);
    if (count === 0) {
      logger.info('[apply_a_z] 옵션 그룹 없는 상품 → skip (ok)');
      return { ok: true as const };
    }
    const first = azBtns.nth(0);
    await first.scrollIntoViewIfNeeded();
    await first.click();
    await page.waitForTimeout(700);
    const subBtnSel = await page.evaluate(() => {
      const modals = Array.from(document.querySelectorAll('.anchored-modal')) as HTMLElement[];
      for (const modal of modals) {
        const mr = modal.getBoundingClientRect();
        if (mr.width === 0 || mr.height === 0) continue;
        const btns = Array.from(modal.querySelectorAll('button')) as HTMLButtonElement[];
        for (const b of btns) {
          const br = b.getBoundingClientRect();
          if (br.width === 0 || br.height === 0) continue;
          const text = (b.textContent ?? '').trim();
          if (text.length > 0) continue;
          if (b.querySelector('svg') === null) continue;
          const uniq = `__atc_az_${Math.random().toString(36).slice(2, 10)}`;
          b.setAttribute('data-atc-target', uniq);
          return `[data-atc-target="${uniq}"]`;
        }
      }
      return '';
    });
    if (subBtnSel === '') {
      return {
        ok: false as const,
        error_key: 'a_z_modal_button_not_found' as ErrorKey,
        message: '.anchored-modal icon-only sub 버튼 미발견',
      };
    }
    await page.locator(subBtnSel).click({ timeout: 5_000 }).catch(() => undefined);
    await page.waitForTimeout(1_500);
    const matched = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, textarea')) as HTMLInputElement[];
      let n = 0;
      for (const inp of inputs) {
        const r = inp.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const v = (inp.value ?? '').trim();
        if (v.length === 0 || v.length > 4) continue;
        if (/^[A-Z]+$/.test(v)) n += 1;
      }
      return n;
    });
    logger.info(`[apply_a_z] [A-Z]+ 패턴 input ${matched}개`);
    if (matched === 0) {
      return {
        ok: false as const,
        error_key: 'a_z_not_applied' as ErrorKey,
        message: 'A-Z 클릭 후 [A-Z]+ 패턴 input 미발견',
      };
    }
    return { ok: true as const };
  },
};
