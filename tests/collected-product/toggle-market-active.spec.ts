/**
 * 수집상품 첫 카드 → 업로드 설정 탭의 마켓 토글 1개 변경 → 영속성
 *
 * 대응 ATC: atcs/collect/toggle-market-active.atc.yml
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
  'toggle-market-active.atc.yml',
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
  toggle_first_market: async (page) => {
    // DOM probe 결과: 업로드 설정 탭 안의 y~191 영역에 마켓 이름 (스마트스토어, 쿠팡, 11번가 글로벌,
    // 11번가 국내, ESM, 롯데온, 톡스토어) 들이 span 으로 나열. 각 span 의 4번째 ancestor 가 <label>
    // 이고 cursor:pointer — label click 으로 안의 hidden checkbox toggle (윈들리 label 패턴).
    //
    // 검증: label className 변화 (active/inactive 표시) + reload 후 동일 상태 유지.
    await clickTab(page, '업로드 설정');
    // probe 로 찾은 selector — y<250 + 마켓 텍스트 span → 4번째 ancestor label 의 className snapshot.
    const before = await page.evaluate(() => {
      const MARKETS = ['스마트스토어', '쿠팡', '11번가 글로벌', '11번가 국내', 'ESM', '롯데온', '톡스토어'];
      const all = Array.from(document.querySelectorAll('span')) as HTMLElement[];
      for (const span of all) {
        if (span.children.length > 0) continue;
        const t = (span.textContent ?? '').trim();
        if (!MARKETS.some((m) => t === m)) continue;
        const r = span.getBoundingClientRect();
        if (r.width === 0 || r.height === 0 || r.y > 250) continue;
        // span → 위로 5단계 까지 올라가며 label 태그 만나면 그게 toggle 컨테이너.
        let cur: HTMLElement | null = span.parentElement;
        let label: HTMLElement | null = null;
        for (let d = 0; d < 5 && cur; d++, cur = cur.parentElement) {
          if (cur.tagName.toLowerCase() === 'label') {
            label = cur;
            break;
          }
        }
        if (!label) continue;
        cur = label;
        // input.checked 가 있으면 그걸로 상태 결정 (가장 신뢰성 높음).
        const input = cur.querySelector('input[type="checkbox"], input[type="radio"]') as HTMLInputElement | null;
        const checked = input?.checked ?? null;
        const uniq = `__atc_mkt_${Math.random().toString(36).slice(2, 10)}`;
        cur.setAttribute('data-atc-target', uniq);
        return {
          label: t,
          sel: `[data-atc-target="${uniq}"]`,
          checked,
          classes: (cur.className || '').toString(),
        };
      }
      return null;
    });
    if (before === null) {
      return {
        ok: false as const,
        error_key: 'market_toggle_not_found' as ErrorKey,
        message: '업로드 설정 탭 y<250 영역에서 마켓 span → label ancestor 미발견',
      };
    }
    logger.info(
      `[toggle_first_market] ${before.label} 클릭 전 checked=${String(before.checked)} cls="${before.classes.slice(0, 50)}"`,
    );
    await page.locator(before.sel).click();
    await page.waitForTimeout(2_500);
    const after = await page.evaluate((sel) => {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (!el) return null;
      const input = el.querySelector('input[type="checkbox"], input[type="radio"]') as HTMLInputElement | null;
      return {
        checked: input?.checked ?? null,
        classes: (el.className || '').toString(),
      };
    }, before.sel);
    if (!after) {
      return {
        ok: false as const,
        error_key: 'market_toggle_disappeared' as ErrorKey,
        message: '클릭 후 label element 사라짐',
      };
    }
    const stateChanged =
      (before.checked !== null && after.checked !== null && before.checked !== after.checked) ||
      before.classes !== after.classes;
    if (!stateChanged) {
      return {
        ok: false as const,
        error_key: 'market_toggle_no_state_change' as ErrorKey,
        message: `클릭 후 input.checked/className 변화 없음. checked=${String(before.checked)}→${String(after.checked)}`,
      };
    }
    logger.info(
      `[toggle_first_market] 클릭 후 checked=${String(after.checked)} cls="${after.classes.slice(0, 50)}"`,
    );

    // reload 후 영속성.
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2_000);
    await clickTab(page, '업로드 설정');
    const persisted = await page.evaluate((label) => {
      const MARKETS = [label];
      const all = Array.from(document.querySelectorAll('span')) as HTMLElement[];
      for (const span of all) {
        if (span.children.length > 0) continue;
        const t = (span.textContent ?? '').trim();
        if (!MARKETS.includes(t)) continue;
        const r = span.getBoundingClientRect();
        if (r.width === 0 || r.height === 0 || r.y > 250) continue;
        let cur: HTMLElement | null = span.parentElement;
        let labelEl: HTMLElement | null = null;
        for (let d = 0; d < 5 && cur; d++, cur = cur.parentElement) {
          if (cur.tagName.toLowerCase() === 'label') {
            labelEl = cur;
            break;
          }
        }
        if (!labelEl) continue;
        const input = labelEl.querySelector('input[type="checkbox"], input[type="radio"]') as HTMLInputElement | null;
        return {
          checked: input?.checked ?? null,
          classes: (labelEl.className || '').toString(),
        };
      }
      return null;
    }, before.label);
    if (!persisted) {
      return {
        ok: false as const,
        error_key: 'market_toggle_not_found_after_reload' as ErrorKey,
        message: `reload 후 ${before.label} label 재발견 실패`,
      };
    }
    const persistedChanged =
      (before.checked !== null && persisted.checked !== null && before.checked !== persisted.checked) ||
      before.classes !== persisted.classes;
    if (!persistedChanged) {
      return {
        ok: false as const,
        error_key: 'market_toggle_not_persisted' as ErrorKey,
        message: `reload 후 ${before.label} 상태가 클릭 전과 동일 → 저장 안 됨`,
      };
    }
    logger.info(
      `[toggle_first_market] reload 후 ${before.label} checked=${String(persisted.checked)} cls="${persisted.classes.slice(0, 50)}"`,
    );
    return { ok: true as const };
  },
};

test('수집상품 첫 카드 → 업로드 설정 탭의 마켓 토글 1개 변경 → 영속성', async ({ page }) => {
  test.setTimeout(5 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
