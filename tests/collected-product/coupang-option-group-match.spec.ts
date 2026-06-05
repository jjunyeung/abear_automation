/**
 * 쿠팡 추천 옵션그룹명 매칭 ATC — Playwright spec
 *
 * 대응 ATC: atcs/collected-product/coupang-option-group-match.atc.yml
 * 핸들러   : ./_coupang-option-group-match-handlers.ts
 *
 * 매칭 + 옵션가 기준 선택 + 에러 없는지 까지만. 업로드는 큐의 다음 TC.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC } from '../../lib/runner';
import { coupangOptionGroupMatchHandlers } from './_coupang-option-group-match-handlers';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'collected-product',
  'coupang-option-group-match.atc.yml',
);

test('쿠팡 추천 옵션그룹명 매칭 (그룹수 맞춤 + 이름 매칭 + 옵션가 기준 선택)', async ({ page }) => {
  test.setTimeout(10 * 60_000);
  const atc = loadATC(ATC_PATH);
  const inputs: Record<string, unknown> = {
    source_product_id: process.env['ATC_INPUT_SOURCE_PRODUCT_ID'] ?? '',
  };
  const result = await runATC({
    atc,
    page,
    inputs,
    handlers: coupangOptionGroupMatchHandlers,
  });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
