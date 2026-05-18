/**
 * URL 수집 → 수집상품 목록에서 상품 존재 확인
 *
 * 대응 ATC: atcs/collect/url-collect-verify.atc.yml
 *
 * 정책 + step handlers 는 tests/collect/_url-collect-handlers.ts 에 공유.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC } from '../../lib/runner';
import {
  makeCollectVerifyHandlers,
  requireFreshUrlFromEnv,
} from './_url-collect-handlers';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'collect',
  'url-collect-verify.atc.yml',
);

test('URL 수집 → 수집중 ready 대기 → 상품 detail 진입', async ({ page }) => {
  test.setTimeout(15 * 60_000);

  const atc = loadATC(ATC_PATH);
  const url = requireFreshUrlFromEnv();

  const result = await runATC({
    atc,
    page,
    inputs: { product_url: url },
    handlers: makeCollectVerifyHandlers(),
  });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
