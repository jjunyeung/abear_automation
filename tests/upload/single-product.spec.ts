/**
 * 단건 상품 업로드 + 등록상품 검증 ATC — Playwright spec
 *
 * 대응 ATC: atcs/upload/single-product.atc.yml
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC } from '../../lib/runner';
import { singleProductUploadHandlers } from './_single-product-handlers';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'upload',
  'single-product.atc.yml',
);

test('단건 상품 업로드 후 등록상품 목록 검증', async ({ page }) => {
  test.setTimeout(15 * 60_000);
  const atc = loadATC(ATC_PATH);
  const inputs: Record<string, unknown> = {
    source_product_id: process.env['ATC_INPUT_SOURCE_PRODUCT_ID'] ?? '',
  };
  const result = await runATC({ atc, page, inputs, handlers: singleProductUploadHandlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
