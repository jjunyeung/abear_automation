/**
 * URL 입력 → URL 수집 모달 → 수집 완료까지 (사용자 지정 링크)
 *
 * 대응 ATC: atcs/collect/url-collect.atc.yml
 *
 * 정책 + step handlers 는 tests/collect/_url-collect-handlers.ts 에 공유.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC } from '../../lib/runner';
import {
  makeCollectHandlers,
  requireFreshUrlFromEnv,
} from './_url-collect-handlers';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'collect',
  'url-collect.atc.yml',
);

test('URL 입력 → URL 수집 모달 → 수집 완료까지', async ({ page }) => {
  test.setTimeout(10 * 60_000);

  const atc = loadATC(ATC_PATH);
  const url = requireFreshUrlFromEnv();

  const result = await runATC({
    atc,
    page,
    inputs: { product_url: url },
    handlers: makeCollectHandlers(),
  });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
