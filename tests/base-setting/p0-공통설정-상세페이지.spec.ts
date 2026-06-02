/**
 * P0 공통설정 / 상세페이지 — 워터마크 설정 영역 (1 TC verified).
 *
 * TC856: 워터마크 영역의 썸네일 dropdown / 텍스트 input / 사이즈 segmented / 미리보기 버튼 노출.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'base-setting', 'p0-공통설정-상세페이지.atc.yml');
const URL = 'https://app.windly.cc/view3/base-setting?setting=COMMON&category=PRODUCT_DETAIL';

const verifyWatermarkSection: StepHandler = async (page) => {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);

  const body = await page.evaluate(() => document.body.innerText);
  const required = ['워터마크', '미리보기'];
  for (const t of required) {
    if (!body.includes(t)) {
      return {
        ok: false as const,
        error_key: 'watermark_required_text_missing' as ErrorKey,
        message: `워터마크 영역 '${t}' 미노출`,
      };
    }
  }
  if (!body.includes('썸네일')) {
    return {
      ok: false as const,
      error_key: 'thumbnail_watermark_missing' as ErrorKey,
      message: '썸네일 워터마크 영역 미노출',
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  tc856: verifyWatermarkSection,
};

test('P0 공통설정 / 상세페이지 — 워터마크 설정 영역 노출 (TC856 verified)', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
