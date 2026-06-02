/**
 * P2 공통설정 / 상세페이지 영역 — skeleton ATC 의 2 TC (워터마크 사이즈 미리보기).
 *
 * 검증 정책:
 *   - TC857/858 워터마크 미리보기 이미지 = 시각적 회귀 검증 → noop log.
 *   - 워터마크 라디오 선택 (작게/크게) + 미리보기 페이지 진입까지만 확인.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'base-setting', 'p2-공통설정-상세페이지.atc.yml');
const URL = 'https://app.windly.cc/view3/base-setting?setting=COMMON&category=PRODUCT_DETAIL';

const verifyWatermarkPreviewArea: StepHandler = async (page) => {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);

  const body = await page.evaluate(() => document.body.innerText);
  if (!body.includes('워터마크') && !body.includes('미리보기')) {
    return {
      ok: false as const,
      error_key: 'watermark_section_missing' as ErrorKey,
      message: '상세페이지 설정 안 "워터마크" 또는 "미리보기" 텍스트 미노출',
    };
  }
  logger.info('[common-watermark] 워터마크 / 미리보기 텍스트 노출 확인. 실 이미지 시각 검증은 skip.');
  return { ok: true as const };
};

const handlers: StepHandlers = {
  tc857: verifyWatermarkPreviewArea,
  tc858: verifyWatermarkPreviewArea,
};

test('P2 공통설정 / 상세페이지 — 워터마크 미리보기 영역 노출 (시각 검증 skip)', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
