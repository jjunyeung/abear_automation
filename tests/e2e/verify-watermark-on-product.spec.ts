/**
 * B8. 워터마크 베이스세팅 smoke (e2e)
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import {
  runATC,
  type StepHandler,
  type StepHandlers,
} from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'e2e', 'verify-watermark-on-product.atc.yml');

const openStep: StepHandler = async (page) => {
  // 워터마크는 PRODUCT_DETAIL 카테고리 안에 있음 (windly-frontend-web 구조 참고).
  await page.goto(
    'https://app.windly.cc/view3/base-setting?setting=COMMON&category=PRODUCT_DETAIL',
    { waitUntil: 'domcontentloaded', timeout: 30_000 },
  );
  await page.waitForTimeout(2_500);
  return { ok: true as const };
};

const verifyStep: StepHandler = async (page) => {
  const sig = page.getByText(/워터마크|watermark|상세\s*페이지/i).first();
  try {
    await sig.waitFor({ state: 'visible', timeout: 10_000 });
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error_key: 'watermark_signature_missing' as ErrorKey,
      message: '워터마크 시그니처 미발견',
    };
  }
};

const handlers: StepHandlers = {
  open_watermark_setting: openStep,
  verify_setting_visible: verifyStep,
};

test('워터마크 베이스세팅 smoke (e2e)', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
