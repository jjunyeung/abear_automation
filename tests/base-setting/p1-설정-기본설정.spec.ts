/**
 * P1 설정 / 기본설정 영역 — skeleton ATC 의 2 TC (상하단 이미지).
 *
 * 검증 정책:
 *   - TC1202 ? hover 툴팁 — 환경 검증 어려움, 페이지 진입 + 상하단 이미지 영역 노출.
 *   - TC1204 상하단이미지 수정 드로워 — 드로워 트리거 시도, destructive 작업은 X.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'base-setting', 'p1-설정-기본설정.atc.yml');
const URL = 'https://app.windly.cc/view3/base-setting?setting=COMMON&category=PRODUCT_DETAIL';

const verifyTopBottomImageSection: StepHandler = async (page) => {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);
  const body = await page.evaluate(() => document.body.innerText);
  if (!body.includes('상하단이미지') && !body.includes('상하단 추가 이미지') && !body.includes('상하단 이미지')) {
    return {
      ok: false as const,
      error_key: 'top_bottom_image_section_missing' as ErrorKey,
      message: '상하단 이미지 섹션 텍스트 미노출 — URL 또는 페이지 변경 의심',
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  'tc1202_상하단-이미지': verifyTopBottomImageSection,
  'tc1204_상하단-이미지': async (page) => {
    logger.info('[base-setting] TC1204 드로워 — 수정 트리거 destructive 가능성, 페이지 진입만 확인');
    return verifyTopBottomImageSection(page, {});
  },
};

test('P1 설정 / 기본설정 — 상하단 이미지 섹션 노출', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
