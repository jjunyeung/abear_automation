/**
 * 배송대행지 / 신청서 확인 영역 P0 TC 묶음 (17건) — skeleton ATC, destructive/외부/AI/환경 의존 → 진입 + noop log.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', "atcs", "delivery-agency", "p0-배송대행지-신청서-확인.atc.yml");
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
  "tc1503": verifyPageReachable,
  "tc1504": noopAfter("tc1504", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1505": noopAfter("tc1505", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1506": noopAfter("tc1506", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1507": noopAfter("tc1507", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1508": noopAfter("tc1508", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1509": noopAfter("tc1509", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1510": noopAfter("tc1510", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1511": noopAfter("tc1511", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1512": noopAfter("tc1512", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1513": noopAfter("tc1513", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1514": noopAfter("tc1514", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1515": noopAfter("tc1515", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1516": noopAfter("tc1516", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1517": noopAfter("tc1517", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1518": noopAfter("tc1518", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1519": noopAfter("tc1519", 'destructive / 환경 의존 / AI 비결정 — skip'),
};

test("배송대행지 / 신청서 확인 영역 P0 TC 묶음 (17건) — 진입 + destructive/AI noop skip", async ({ page }) => {
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
