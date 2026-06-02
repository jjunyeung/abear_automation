/**
 * 에러체크 통합 파이프라인 — Playwright spec
 *
 * 대응 ATC: atcs/error-check/check-and-fix.atc.yml
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC } from '../../lib/runner';
import { checkAndFixHandlers } from './_check-and-fix-handlers';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'collected-product',
  'check-and-fix.atc.yml',
);

test('에러체크 → 진단 → (조건부) 자동 수정 → verify clean', async ({ page }) => {
  test.setTimeout(15 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers: checkAndFixHandlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
