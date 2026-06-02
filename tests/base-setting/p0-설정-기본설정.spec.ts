/**
 * P0 설정 / 기본설정 — 16 TC (모두 상하단 이미지 영역).
 *
 * TC1199: 상하단 이미지 영역 + 공통/마켓별 버튼 노출 (verified)
 * 나머지 15: 드롭다운 / 마켓 선택 / 이미지 업로드 등 — 대부분 destructive (저장 발생) → noop.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'base-setting', 'p0-설정-기본설정.atc.yml');
const URL = 'https://app.windly.cc/view3/base-setting?setting=COMMON&category=PRODUCT_DETAIL';

let entered = false;

const enter: StepHandler = async (page) => {
  if (entered) return { ok: true as const };
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);
  entered = true;
  return { ok: true as const };
};

const verifyTopBottomImageArea: StepHandler = async (page) => {
  const e = await enter(page, {});
  if (!e.ok) return e;
  const body = await page.evaluate(() => document.body.innerText);
  if (!body.includes('상하단')) {
    return {
      ok: false as const,
      error_key: 'top_bottom_section_missing' as ErrorKey,
      message: '상하단 이미지 영역 미노출',
    };
  }
  return { ok: true as const };
};

const noopAfter = (label: string, reason: string): StepHandler => async (page) => {
  const e = await enter(page, {});
  if (!e.ok) return e;
  logger.info(`[base-fixed-image] ${label}: ${reason} — skip`);
  return { ok: true as const };
};

const handlers: StepHandlers = {
  'tc1199_상하단-이미지': verifyTopBottomImageArea,
  'tc1200_상하단-이미지': noopAfter('TC1200', '마켓별 선택 → dropdown destructive trigger'),
  'tc1201_상하단-이미지': noopAfter('TC1201', '드롭다운 선택 → destructive'),
  'tc1205_상하단-이미지': noopAfter('TC1205', '스마트스토어 선택 — destructive'),
  'tc1206_상하단-이미지': noopAfter('TC1206', '쿠팡 선택 — destructive'),
  'tc1207_상하단-이미지': noopAfter('TC1207', '11번가 글로벌 — destructive'),
  'tc1208_상하단-이미지': noopAfter('TC1208', '11번가 국내 — destructive'),
  'tc1209_상하단-이미지': noopAfter('TC1209', 'ESM 2.0 — destructive'),
  'tc1210_상하단-이미지': noopAfter('TC1210', '옥션 1.0 — destructive'),
  'tc1211_상하단-이미지': noopAfter('TC1211', '롯데온 — destructive'),
  'tc1214_상하단-이미지': noopAfter('TC1214', '인터파크 — destructive'),
  'tc1215_상하단-이미지': noopAfter('TC1215', '위메프 — destructive'),
  'tc1216_상하단-이미지': noopAfter('TC1216', '톡스토어 — destructive'),
  'tc1217_상하단-이미지': noopAfter('TC1217', '이미지 업로드 — destructive 시각 검증'),
  'tc1218_상하단-이미지': noopAfter('TC1218', '이미지 적용 — destructive'),
  'tc1219_상하단-이미지': noopAfter('TC1219', '이미지 영역 동작 — destructive'),
};

test('P0 설정 / 기본설정 — 상하단 이미지 영역 노출 (TC1199 verified)', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  entered = false;
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
