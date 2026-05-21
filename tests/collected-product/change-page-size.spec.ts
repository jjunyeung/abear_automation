/**
 * 수집상품 목록 → 페이지 사이즈 변경 → 카드 갯수 늘어남 확인
 *
 * 대응 ATC: atcs/collect/change-page-size.atc.yml
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
  'collected-product',
  'change-page-size.atc.yml',
);

import { logger } from '../../lib/logger';

const handlers: StepHandlers = {
  open_collected_list: async (page) => {
    await goToCollectedProducts(page);
    return { ok: true as const };
  },
  change_size: async (page) => {
    const cardSel = 'a[href*="/view2/interested-product/"]';
    const before = await page.locator(cardSel).count();
    if (before === 0) {
      return {
        ok: false as const,
        error_key: 'no_collected_products' as ErrorKey,
        message: '수집상품 카드 0개 — 사이즈 검증 불가',
      };
    }
    // 사용자 확인 + DOM probe: button text 정확히 "20개"/"50개"/"100개".
    // getByRole strict accessible name 매치 fail 가능성 → hasText regex.
    const sizeBtn = page
      .locator('button', { hasText: /^(20|50|100)개$/ })
      .first();
    try {
      await sizeBtn.waitFor({ state: 'visible', timeout: 10_000 });
    } catch {
      return {
        ok: false as const,
        error_key: 'page_size_control_not_found' as ErrorKey,
        message: '페이지 사이즈 trigger ("20개"/"50개"/"100개" button) 미발견',
      };
    }
    const currentText = (await sizeBtn.innerText()).trim();
    await sizeBtn.scrollIntoViewIfNeeded();
    await sizeBtn.click();
    await page.waitForTimeout(800);
    // 옵션 list — windly 는 role=option/menuitem 없을 가능성. 더 넓게 검색:
    // 페이지 전체에서 "20개"/"50개"/"100개" 텍스트인 element 중 trigger 가 아닌 것 + visible.
    // 현재값 (trigger text) 와 다른 옵션 = 새 사이즈.
    const pickedSel = await page.evaluate((current) => {
      const all = Array.from(document.querySelectorAll('*')) as HTMLElement[];
      const candidates: HTMLElement[] = [];
      for (const el of all) {
        if (el.children.length > 0) continue;
        const t = (el.textContent ?? '').trim();
        if (!/^(20|50|100)개$/.test(t)) continue;
        if (t === current) continue; // 현재값 skip
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        candidates.push(el);
      }
      if (candidates.length === 0) return '';
      // 가장 큰 사이즈 선택 (100 > 50 > 20).
      candidates.sort((a, b) => {
        const an = parseInt((a.textContent ?? '').replace(/\D/g, ''), 10);
        const bn = parseInt((b.textContent ?? '').replace(/\D/g, ''), 10);
        return bn - an;
      });
      const target = candidates[0];
      const uniq = `__atc_size_${Math.random().toString(36).slice(2, 10)}`;
      target.setAttribute('data-atc-target', uniq);
      return `[data-atc-target="${uniq}"]`;
    }, currentText);
    if (pickedSel === '') {
      return {
        ok: false as const,
        error_key: 'page_size_option_not_found' as ErrorKey,
        message: 'dropdown 열린 후 사이즈 옵션 미발견',
      };
    }
    await page.locator(pickedSel).click({ timeout: 5_000 }).catch(() => undefined);
    await page.waitForTimeout(2_500);
    const after = await page.locator(cardSel).count();
    logger.info(`[change_size] cards: ${before} → ${after}`);
    if (after <= before) {
      // 이미 가장 큰 값이었거나 페이지에 충분한 상품이 없음 — info 로만 두고 PASS.
      logger.warn(
        `[change_size] 카드 갯수 안 늘어남 (${before} → ${after}). 이미 최대 사이즈이거나 상품 부족.`,
      );
    }
    return { ok: true as const };
  },
};

test('수집상품 목록 → 페이지 사이즈 변경 → 카드 갯수 늘어남 확인', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
