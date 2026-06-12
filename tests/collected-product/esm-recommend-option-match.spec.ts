/**
 * ESM 2.0 추천옵션 모드 옵션 매칭 ATC — Playwright spec
 *
 * 대응 ATC: atcs/collected-product/esm-recommend-option-match.atc.yml
 * 핸들러   : ./_esm-recommend-option-match-handlers.ts
 *
 * 업로드 설정 탭 → ESM 2.0 옵션설정 모달에서 ESM 필수옵션을 윈들리 옵션에 매칭 +
 * 생성하기 + 저장 → 업로드 설정 탭 빨강 해소까지. 업로드는 큐의 다음 TC.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC } from '../../lib/runner';
import { esmRecommendOptionMatchHandlers } from './_esm-recommend-option-match-handlers';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'collected-product',
  'esm-recommend-option-match.atc.yml',
);

test('ESM 2.0 추천옵션 모드 옵션 매칭 (업로드 설정)', async ({ page }) => {
  test.setTimeout(10 * 60_000);
  const atc = loadATC(ATC_PATH);
  const inputs: Record<string, unknown> = {
    source_product_id: process.env['ATC_INPUT_SOURCE_PRODUCT_ID'] ?? '',
  };
  const result = await runATC({
    atc,
    page,
    inputs,
    handlers: esmRecommendOptionMatchHandlers,
  });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
