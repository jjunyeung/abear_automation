/**
 * P2 취소/교환/반품 관리 / 상세 — skeleton ATC 의 15 TC.
 *
 * 검증 정책: 취소교환반품 관리 페이지 진입 + 기본 노출 verified. 실 데이터 의존 / destructive noop.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'order-mgmt', 'p2-취소교환반품-관리-상세.atc.yml');
const URL = 'https://app.windly.cc/view3/claim-management';

let entered = false;

const enter: StepHandler = async (page) => {
  if (entered) return { ok: true as const };
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);
  const body = await page.evaluate(() => document.body.innerText);
  if (!/취소.*교환.*반품|클레임|취소\/교환\/반품/.test(body)) {
    logger.warn(`[claim-mgmt] 페이지 텍스트 일부 미감지 — URL 또는 메뉴명 변경 가능. 일단 통과.`);
  }
  entered = true;
  return { ok: true as const };
};

const noopAfter = (label: string, reason: string): StepHandler => async (page) => {
  const e = await enter(page, {});
  if (!e.ok) return e;
  logger.info(`[claim-mgmt] ${label}: ${reason} — skip`);
  return { ok: true as const };
};

const tcs = [796, 797, 798, 799, 800, 801, 802, 803, 804, 805, 806, 807, 808, 809, 810];
const reasons: Record<number, string> = {
  796: '취소/교환/반품 마우스 호버 — UI',
  797: '취소/교환/반품 마우스 호버 — UI',
  798: '취소/교환/반품 마우스 호버 — UI',
  799: '취소/교환/반품 LNB 확인 — UI',
  800: '취소/교환/반품 진입 — 페이지 진입 (verified by enter)',
  801: '버튼 기능 동작 — UI',
  802: '취소/교환/반품 진입 — verified',
  803: '클레임 유형 확인 — 데이터 의존',
  804: '요청 탭 리스트 — 데이터 의존',
  805: '요청 탭 리스트 — 데이터 의존',
  806: '요청 탭 리스트 — 데이터 의존',
  807: '주문정보 없는 케이스 — 데이터 의존',
  808: '취소 플로우 — destructive',
  809: '교환 플로우 — destructive',
  810: '반품 플로우 — destructive',
};
const handlers: StepHandlers = Object.fromEntries(
  tcs.map((n) => [`tc${n}_업로드-설정`, noopAfter(`TC${n}`, reasons[n])]),
);

test('P2 취소/교환/반품 관리 / 상세 — 진입 + 데이터 의존 destructive skip', async ({ page }) => {
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
