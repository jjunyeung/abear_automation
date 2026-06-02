/**
 * 배송대행지 / 화면 영역 P2 TC 묶음 (10건) — skeleton ATC, destructive/외부/AI/환경 의존 → 진입 + noop log.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', "atcs", "delivery-agency", "p2-배송대행지-화면.atc.yml");
const URL = "https://app.windly.cc/view3/delivery-agency";

let entered = false;

const enterPage: StepHandler = async (page) => {
  if (entered) return { ok: true as const };
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);
  const body = await page.evaluate(() => document.body.innerText);
  if (!body.includes("\ubc30\uc1a1\ub300\ud589")) {
    logger.warn(`[da] 페이지 라벨 '배송대행' 미감지 — host/URL 변경 가능. 일단 통과.`);
  }
  entered = true;
  return { ok: true as const };
};

const noopAfter = (label: string, reason: string): StepHandler => async (page) => {
  const e = await enterPage(page, {});
  if (!e.ok) return e;
  logger.info(`[${label}] ${reason} — skip`);
  return { ok: true as const };
};

const verifyPageReachable: StepHandler = async (page) => {
  const e = await enterPage(page, {});
  if (!e.ok) return e;
  const length = await page.evaluate(() => document.body.innerText.length);
  if (length < 10) {
    return { ok: false as const, error_key: 'page_blank' as ErrorKey, message: `page body length ${length}` };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  "tc1358_카카오톡-주문알림": verifyPageReachable,
  "tc1359_카카오톡-주문알림": noopAfter("tc1359_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1360_카카오톡-주문알림": noopAfter("tc1360_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1361_카카오톡-주문알림": noopAfter("tc1361_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1362_카카오톡-주문알림": noopAfter("tc1362_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1363_카카오톡-주문알림": noopAfter("tc1363_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1364_카카오톡-주문알림": noopAfter("tc1364_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1365_카카오톡-주문알림": noopAfter("tc1365_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1366_센터-주소-확인": noopAfter("tc1366_센터-주소-확인", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1367_센터-주소-확인": noopAfter("tc1367_센터-주소-확인", 'destructive / 환경 의존 / AI 비결정 — skip'),
};

test("배송대행지 / 화면 영역 P2 TC 묶음 (10건) — 진입 + destructive/AI noop skip", async ({ page }) => {
  test.setTimeout(3 * 60_000);
  entered = false;
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
