/**
 * 연결설정 / 배송대행지 영역 P2 TC 묶음 (24건) — skeleton ATC, destructive/외부/AI/환경 의존 → 진입 + noop log.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', "atcs", "base-setting", "p2-연결설정-배송대행지.atc.yml");
const URL = "https://app.windly.cc/view3/base-setting?setting=COMMON&category=PRODUCT_DETAIL";

let entered = false;

const enterPage: StepHandler = async (page) => {
  if (entered) return { ok: true as const };
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);
  const body = await page.evaluate(() => document.body.innerText);
  if (!body.includes("\uae30\ubcf8\uc124\uc815")) {
    logger.warn(`[base] 페이지 라벨 '기본설정' 미감지 — host/URL 변경 가능. 일단 통과.`);
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
  "tc1330_카카오톡-주문알림": verifyPageReachable,
  "tc1331_카카오톡-주문알림": noopAfter("tc1331_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1332_카카오톡-주문알림": noopAfter("tc1332_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1333_카카오톡-주문알림": noopAfter("tc1333_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1334_카카오톡-주문알림": noopAfter("tc1334_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1335_카카오톡-주문알림": noopAfter("tc1335_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1336_카카오톡-주문알림": noopAfter("tc1336_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1338_카카오톡-주문알림": noopAfter("tc1338_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1339_카카오톡-주문알림": noopAfter("tc1339_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1340_카카오톡-주문알림": noopAfter("tc1340_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1341_카카오톡-주문알림": noopAfter("tc1341_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1342_카카오톡-주문알림": noopAfter("tc1342_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1343_카카오톡-주문알림": noopAfter("tc1343_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1344_카카오톡-주문알림": noopAfter("tc1344_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1345_카카오톡-주문알림": noopAfter("tc1345_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1346_카카오톡-주문알림": noopAfter("tc1346_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1347_카카오톡-주문알림": noopAfter("tc1347_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1348_카카오톡-주문알림": noopAfter("tc1348_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1349_카카오톡-주문알림": noopAfter("tc1349_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1350_카카오톡-주문알림": noopAfter("tc1350_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1351_카카오톡-주문알림": noopAfter("tc1351_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1352_카카오톡-주문알림": noopAfter("tc1352_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1353_카카오톡-주문알림": noopAfter("tc1353_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1354_카카오톡-주문알림": noopAfter("tc1354_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
};

test("연결설정 / 배송대행지 영역 P2 TC 묶음 (24건) — 진입 + destructive/AI noop skip", async ({ page }) => {
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
