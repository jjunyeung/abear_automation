/**
 * 수집상품 목록 → 카드뷰 ↔ 목록뷰 전환
 *
 * 대응 ATC: atcs/collect/toggle-list-view.atc.yml
 *
 * 사용자 확인: 수집상품에 정렬은 없고 카드뷰/목록뷰 전환 + 페이지 이동만 있음.
 * 본 ATC 는 view toggle 동작 회귀.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { goToCollectedProducts } from '../../lib/windly-actions';
import { logger } from '../../lib/logger';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'collected-product',
  'toggle-list-view.atc.yml',
);

const handlers: StepHandlers = {
  open_collected_list: async (page) => {
    await goToCollectedProducts(page);
    return { ok: true as const };
  },
  toggle_view: async (page) => {
    // 클릭 전 DOM 시그니처 — table row 갯수 vs 카드 영역 갯수.
    const before = await page.evaluate(() => {
      return {
        tableRows: document.querySelectorAll('table tr, tbody tr').length,
        cards: document.querySelectorAll('a[href*="/view2/interested-product/"]').length,
        // 첫 카드/행의 bounding rect 높이 — 카드(큰) vs 행(낮음) 구분.
        firstCardHeight: (() => {
          const a = document.querySelector('a[href*="/view2/interested-product/"]');
          if (!a) return 0;
          const r = (a as HTMLElement).getBoundingClientRect();
          return Math.round(r.height);
        })(),
      };
    });
    // 사용자 확인 + DOM probe 결과: button text "카드뷰" / "목록뷰" 존재.
    // getByRole({name}) 가 strict accessible name 매치라 fail — text-based locator 사용.
    const cardBtn = page.locator('button', { hasText: /^카드뷰$/ }).first();
    const listBtn = page.locator('button', { hasText: /^목록뷰$/ }).first();
    try {
      await cardBtn.waitFor({ state: 'visible', timeout: 5_000 });
      await listBtn.waitFor({ state: 'visible', timeout: 5_000 });
    } catch {
      return {
        ok: false as const,
        error_key: 'view_toggle_button_not_found' as ErrorKey,
        message: '카드뷰/목록뷰 button 미발견',
      };
    }
    // active className 가진 쪽 = 현재 모드 → 반대쪽 클릭.
    const cardActive = await cardBtn.evaluate((el) =>
      (el.className || '').toString().includes('active'),
    );
    const target = cardActive ? listBtn : cardBtn;
    await target.scrollIntoViewIfNeeded();
    await target.click();
    await page.waitForTimeout(2_000);
    const after = await page.evaluate(() => {
      return {
        tableRows: document.querySelectorAll('table tr, tbody tr').length,
        cards: document.querySelectorAll('a[href*="/view2/interested-product/"]').length,
        firstCardHeight: (() => {
          const a = document.querySelector('a[href*="/view2/interested-product/"]');
          if (!a) return 0;
          const r = (a as HTMLElement).getBoundingClientRect();
          return Math.round(r.height);
        })(),
      };
    });
    logger.info(
      `[toggle_view] before=${JSON.stringify(before)} after=${JSON.stringify(after)}`,
    );
    // 시그니처 변화: table row 갯수 변화 OR 첫 카드 height 변화 (카드 큰 vs 행 낮음).
    const tableChanged = before.tableRows !== after.tableRows;
    const heightChanged = Math.abs(before.firstCardHeight - after.firstCardHeight) >= 20;
    if (!tableChanged && !heightChanged) {
      return {
        ok: false as const,
        error_key: 'view_toggle_no_change' as ErrorKey,
        message: `클릭 후 DOM 시그니처 변화 없음. before=${JSON.stringify(before)} after=${JSON.stringify(after)}`,
      };
    }
    return { ok: true as const };
  },
};

test('수집상품 목록 → 카드뷰 ↔ 목록뷰 전환', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
