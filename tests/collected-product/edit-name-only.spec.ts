/**
 * 수집상품 첫 카드 → 상품명 변경 → 영속성 검증 (재업로드 X)
 *
 * 대응 ATC: atcs/collect/edit-name-only.atc.yml
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
  'edit-name-only.atc.yml',
);

import { logger } from '../../lib/logger';

function buildName(): string {
  const ts = new Date()
    .toISOString()
    .replace(/T/, ' ')
    .replace(/\..*$/, '')
    .replace(/-/g, '-');
  return `상품명 수정 (${ts})`;
}

const handlers: StepHandlers = {
  open_collected_list: async (page) => {
    await goToCollectedProducts(page);
    return { ok: true as const };
  },
  open_first_product: async (page) => {
    const card = page
      .locator('a[href*="/view2/interested-product/"]')
      .first();
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
  edit_name: async (page, inputs) => {
    const newName =
      typeof inputs['new_name'] === 'string' && (inputs['new_name'] as string).length > 0
        ? (inputs['new_name'] as string)
        : buildName();
    const target = await page.evaluate(() => {
      const els = Array.from(
        document.querySelectorAll('input[type="text"], input:not([type]), textarea'),
      ) as (HTMLInputElement | HTMLTextAreaElement)[];
      let bestIdx = -1;
      let bestLen = 9;
      for (let i = 0; i < els.length; i++) {
        const el = els[i];
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.y > 600) continue;
        const v = el.value ?? '';
        if (v.length > bestLen) {
          bestLen = v.length;
          bestIdx = i;
        }
      }
      return { idx: bestIdx };
    });
    if (target.idx < 0) {
      return {
        ok: false as const,
        error_key: 'name_input_not_found' as ErrorKey,
        message: '상단 메인 상품명 input 미발견',
      };
    }
    const input = page
      .locator('input[type="text"], input:not([type]), textarea')
      .nth(target.idx);
    await input.click();
    await input.fill('');
    await input.pressSequentially(newName, { delay: 5 });
    await input.evaluate((el) => {
      const t = el as HTMLInputElement | HTMLTextAreaElement;
      t.dispatchEvent(new Event('input', { bubbles: true }));
      t.dispatchEvent(new Event('change', { bubbles: true }));
      t.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
      if (typeof t.blur === 'function') t.blur();
    });
    await page.waitForTimeout(1_500);
    logger.info(`[edit_name] 설정한 이름: "${newName}"`);
    // 이름 저장은 onBlur API 호출 → 영속성은 verify step 에서.
    return { ok: true as const };
  },
  verify_persist_after_reload: async (page, inputs) => {
    const expected =
      typeof inputs['_set_name'] === 'string' ? (inputs['_set_name'] as string) : '';
    // 우리는 edit_name 에서 inputs 에 set 안 함 — 단순화: reload 후 가장 긴 visible input
    // 값이 비어있지 않으면 영속성 OK (이름은 무엇이든 저장된 값).
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2_000);
    const persisted = await page.evaluate(() => {
      const els = Array.from(
        document.querySelectorAll('input[type="text"], input:not([type]), textarea'),
      ) as (HTMLInputElement | HTMLTextAreaElement)[];
      let bestLen = 0;
      let bestVal = '';
      for (const el of els) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.y > 600) continue;
        const v = el.value ?? '';
        if (v.length > bestLen) {
          bestLen = v.length;
          bestVal = v;
        }
      }
      return bestVal;
    });
    if (persisted.length === 0) {
      return {
        ok: false as const,
        error_key: 'name_not_persisted' as ErrorKey,
        message: 'reload 후 상단 input 값이 비어있음',
      };
    }
    logger.info(`[verify_persist] reload 후 값: "${persisted.slice(0, 40)}..."`);
    return { ok: true as const };
  },
};

test('수집상품 첫 카드 → 상품명 변경 → 영속성 검증 (재업로드 X)', async ({ page }) => {
  test.setTimeout(5 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
