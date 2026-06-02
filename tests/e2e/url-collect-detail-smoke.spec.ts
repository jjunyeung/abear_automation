/**
 * A5. URL 수집 → 상세 진입 smoke (e2e) — Playwright spec
 *
 * 대응 ATC: atcs/e2e/url-collect-detail-smoke.atc.yml
 * composes: product-collect/url-collect-verify (7 steps)
 *
 * 매일 회귀 1차 smoke — 가장 빠르고 가장 먼저 돌릴 것.
 * URL 풀에서 head 1개 자동 consume (data/url-pool.txt).
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandlers } from '../../lib/runner';
import { makeCollectVerifyHandlers } from '../product-collect/_url-collect-handlers';
import { headPop } from '../../lib/url-pool';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'e2e',
  'url-collect-detail-smoke.atc.yml',
);

const handlers: StepHandlers = makeCollectVerifyHandlers();

test('URL 수집 → 상세 진입 smoke (e2e)', async ({ page }) => {
  test.setTimeout(8 * 60_000);

  // URL pool 에서 head 1개 consume. CLI 인자로 ATC_INPUT_PRODUCT_URL 이 주입된 경우 그게 우선.
  const cliUrl = process.env['ATC_INPUT_PRODUCT_URL']?.trim() ?? '';
  if (cliUrl.length === 0) {
    const popped = headPop();
    if (popped === null) {
      throw new Error(
        'URL 풀 비어있음 (data/url-pool.txt). 자동 회귀를 위해 새 URL 을 채워주세요.',
      );
    }
    process.env['ATC_INPUT_PRODUCT_URL'] = popped;
  }

  const atc = loadATC(ATC_PATH);
  const result = await runATC({
    atc,
    page,
    inputs: { product_url: process.env['ATC_INPUT_PRODUCT_URL'] ?? '' },
    handlers,
  });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
