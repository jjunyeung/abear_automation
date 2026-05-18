/**
 * 수집상품 목록 → 상품 코드 검색 → 결과 1+ 확인
 *
 * 대응 ATC: atcs/collect/search-product-by-code.atc.yml
 * 생성: scripts/gen-atc-tcs (단건 TC 일괄 생성).
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { goToCollectedProducts, searchByProductCode } from '../../lib/windly-actions';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'collect',
  'search-product-by-code.atc.yml',
);

// inputs.source_product_id 가 비어있으면 첫 카드 href 에서 동적으로 추출 (smoke 안정성).
// 환경변수/CLI 로 ID 주면 그걸 우선 사용.
async function pickIdFromFirstCard(
  page: import('@playwright/test').Page,
): Promise<string | null> {
  const href = await page
    .locator('a[href*="/view2/interested-product/"]')
    .first()
    .getAttribute('href')
    .catch(() => null);
  if (!href) return null;
  const m = href.match(/\/view2\/interested-product\/(\d+)/);
  return m ? m[1] : null;
}

const handlers: StepHandlers = {
  open_collected_list: async (page) => {
    await goToCollectedProducts(page);
    return { ok: true as const };
  },
  search: async (page, inputs) => {
    let id =
      typeof inputs['source_product_id'] === 'string'
        ? (inputs['source_product_id'] as string)
        : '';
    if (id.length === 0) {
      const picked = await pickIdFromFirstCard(page);
      if (picked === null) {
        return {
          ok: false as const,
          error_key: 'no_collected_products' as ErrorKey,
          message: '카드 0개 — 검색용 ID 추출 실패',
        };
      }
      id = picked;
    }
    const count = await searchByProductCode(page, id);
    if (count === 0) {
      return {
        ok: false as const,
        error_key: 'search_no_result' as ErrorKey,
        message: `상품 코드 "${id}" 검색 결과 0개`,
      };
    }
    return { ok: true as const };
  },
};

test('수집상품 목록 → 상품 코드 검색 → 결과 1+ 확인', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  // env 비어있으면 ''  → 핸들러가 첫 카드 href 에서 동적 추출.
  const result = await runATC({ atc, page, inputs: { source_product_id: process.env['ATC_INPUT_SOURCE_PRODUCT_ID'] ?? '' }, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
