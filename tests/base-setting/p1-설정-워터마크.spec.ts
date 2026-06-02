/**
 * P1 설정 / 워터마크 영역 — skeleton ATC 의 2 TC.
 *
 * 검증 정책:
 *   - 둘 다 "썸네일 워터마크 적용/미적용 후 업로드" = destructive 실 마켓 업로드.
 *   - 노출 가능한 부분 = 워터마크 설정 페이지 진입 + 썸네일 워터마크 토글 노출.
 *   - 실 업로드는 noop.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'base-setting', 'p1-설정-워터마크.atc.yml');
const URL = 'https://app.windly.cc/view3/base-setting?setting=COMMON&category=PRODUCT_DETAIL';

const verifyWatermarkPresent: StepHandler = async (page) => {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);
  const body = await page.evaluate(() => document.body.innerText);
  if (!body.includes('워터마크')) {
    return {
      ok: false as const,
      error_key: 'watermark_section_missing' as ErrorKey,
      message: '워터마크 섹션 미노출',
    };
  }
  logger.info('[watermark] 섹션 노출 확인. 실 업로드는 destructive 라 skip.');
  return { ok: true as const };
};

const handlers: StepHandlers = {
  'tc1123_수정-업로드': verifyWatermarkPresent,
  'tc1124_수정-업로드': verifyWatermarkPresent,
};

test('P1 설정 / 워터마크 — 섹션 노출 (업로드 검증 skip)', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
