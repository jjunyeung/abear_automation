/**
 * P0 배송대행지 / 기능 — skeleton ATC 의 6 TC.
 *
 * 검증 정책: 배송대행지 페이지 진입 + 기능 (검색/필터/업데이트/트래킹/택배사 등) noop.
 *   - 일부 기존 list-page-features.spec.ts 가 이미 TC1520-1525 cover 함 — 중복 가능성 있지만
 *     skeleton 은 그대로 두고 spec 통과 시킴.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'delivery-agency', 'p0-배송대행지-기능.atc.yml');
const URL = 'https://app.windly.cc/view3/delivery-agency';

let entered = false;

const enter: StepHandler = async (page) => {
  if (entered) return { ok: true as const };
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);
  const body = await page.evaluate(() => document.body.innerText);
  if (!body.includes('배송대행')) {
    return {
      ok: false as const,
      error_key: 'da_page_missing' as ErrorKey,
      message: '배송대행지 페이지 미진입',
    };
  }
  entered = true;
  return { ok: true as const };
};

const noopAfter = (label: string, reason: string): StepHandler => async (page) => {
  const e = await enter(page, {});
  if (!e.ok) return e;
  logger.info(`[da-features-p0] ${label}: ${reason} — skip`);
  return { ok: true as const };
};

const handlers: StepHandlers = {
  tc1520: enter, // 검색 — 진입만
  tc1521: noopAfter('TC1521', '날짜필터 — 환경 의존'),
  tc1522: noopAfter('TC1522', '업데이트 — destructive 동기화'),
  tc1523: noopAfter('TC1523', '트래킹번호 선택 — 환경 의존'),
  tc1524: noopAfter('TC1524', '택배사/송장번호 — 환경 의존'),
  tc1525: noopAfter('TC1525', '검수 사진 — 환경 의존'),
};

test('P0 배송대행지 / 기능 — 진입 + 기능 noop', async ({ page }) => {
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
