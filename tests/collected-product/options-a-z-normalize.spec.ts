/**
 * 수집상품 첫 카드 → 옵션 탭 → A-Z 정규화 동작 확인
 *
 * 대응 ATC: atcs/collect/options-a-z-normalize.atc.yml
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC } from '../../lib/runner';
import { optionsAZNormalizeHandlers } from './_options-a-z-normalize-handlers';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'collected-product',
  'options-a-z-normalize.atc.yml',
);

test('수집상품 첫 카드 → 옵션 탭 → A-Z 정규화 동작 확인', async ({ page }) => {
  test.setTimeout(5 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers: optionsAZNormalizeHandlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
