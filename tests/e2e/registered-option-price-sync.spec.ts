/**
 * D4. 옵션 가격 수정 → 재업로드 → 등록 매칭 (e2e)
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
import { editOptionPriceHandlers } from '../collected-product/_edit-option-price-handlers';
import { singleProductUploadHandlers } from '../upload/_single-product-handlers';
import { emitOutput } from '../../lib/atc-output';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'e2e', 'registered-option-price-sync.atc.yml');

let sourceProductId = '';

const openFirstProductWithEmit: StepHandler = async (page, inputs) => {
  const r = await editOptionPriceHandlers['open_first_product']!(page, inputs);
  if (!r.ok) return r;
  const m = page.url().match(/\/view2\/interested-product\/(\d+)/);
  if (m === null) {
    return {
      ok: false as const,
      error_key: 'product_id_extraction_failed' as ErrorKey,
      message: `productId 추출 실패: ${page.url()}`,
    };
  }
  sourceProductId = m[1];
  emitOutput('source_product_id', sourceProductId);
  return { ok: true as const };
};

const verifyInRegisteredWithId: StepHandler = async (page, inputs) => {
  return singleProductUploadHandlers['verify_in_registered']!(page, { ...inputs, source_product_id: sourceProductId });
};

const handlers: StepHandlers = {
  open_collected_list: editOptionPriceHandlers['open_collected_list']!,
  open_first_product: openFirstProductWithEmit,
  bump_option_price: editOptionPriceHandlers['bump_option_price']!,
};

test('옵션 가격 수정 → 재업로드 → 등록 매칭 (e2e)', async ({ page }) => {
  test.setTimeout(15 * 60_000);
  sourceProductId = '';
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
