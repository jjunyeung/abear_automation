/**
 * 수집상품 첫 카드 → 옵션 가격 단건 변경 → 영속성 검증
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC } from '../../lib/runner';
import { editOptionPriceHandlers } from './_edit-option-price-handlers';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'collected-product',
  'edit-option-price.atc.yml',
);

test('수집상품 첫 카드 → 옵션 가격 단건 변경 → 영속성 검증', async ({ page }) => {
  test.setTimeout(5 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers: editOptionPriceHandlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
