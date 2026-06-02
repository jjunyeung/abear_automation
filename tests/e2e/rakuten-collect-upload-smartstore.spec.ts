/**
 * A3. 라쿠텐 단건 수집 → 상세 진입 (e2e)
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandlers } from '../../lib/runner';
import { makeCollectVerifyHandlers } from '../product-collect/_url-collect-handlers';
import { listPool, removeFromPool } from '../../lib/url-pool';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'e2e', 'rakuten-collect-upload-smartstore.atc.yml');

const handlers: StepHandlers = makeCollectVerifyHandlers();

function takeRakutenUrl(): string {
  const url = listPool().find((u) => /rakuten\.co\.jp/.test(u));
  if (url === undefined) {
    throw new Error('URL 풀에 라쿠텐 URL (rakuten.co.jp) 없음.');
  }
  removeFromPool(url);
  return url;
}

test('라쿠텐 수집 → 상세 진입 (e2e)', async ({ page }) => {
  test.setTimeout(8 * 60_000);
  const cliUrl = process.env['ATC_INPUT_PRODUCT_URL']?.trim() ?? '';
  const url = cliUrl.length > 0 ? cliUrl : takeRakutenUrl();
  process.env['ATC_INPUT_PRODUCT_URL'] = url;
  logger.info(`[A3] URL=${url}`);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: { product_url: url }, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
