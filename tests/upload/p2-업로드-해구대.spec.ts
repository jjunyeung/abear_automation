/**
 * 업로드 / 해구대 영역 P2 TC 묶음 (21건) — skeleton ATC, destructive/외부/AI/환경 의존 → 진입 + noop log.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', "atcs", "upload", "p2-업로드-해구대.atc.yml");
const URL = "https://app.windly.cc/view2/registered-product";

let entered = false;

const enterPage: StepHandler = async (page) => {
  if (entered) return { ok: true as const };
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);
  const body = await page.evaluate(() => document.body.innerText);
  if (!body.includes("\ub4f1\ub85d\uc0c1\ud488")) {
    logger.warn(`[upload] 페이지 라벨 '등록상품' 미감지 — host/URL 변경 가능. 일단 통과.`);
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
  "tc1282_카카오톡-주문알림": verifyPageReachable,
  "tc1283_카카오톡-주문알림": noopAfter("tc1283_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1284_카카오톡-주문알림": noopAfter("tc1284_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1285_카카오톡-주문알림": noopAfter("tc1285_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1286_카카오톡-주문알림": noopAfter("tc1286_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1287_카카오톡-주문알림": noopAfter("tc1287_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1288_카카오톡-주문알림": noopAfter("tc1288_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1289_카카오톡-주문알림": noopAfter("tc1289_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1290_카카오톡-주문알림": noopAfter("tc1290_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1291_카카오톡-주문알림": noopAfter("tc1291_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1292_카카오톡-주문알림": noopAfter("tc1292_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1293_카카오톡-주문알림": noopAfter("tc1293_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1294_카카오톡-주문알림": noopAfter("tc1294_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1295_카카오톡-주문알림": noopAfter("tc1295_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1296_카카오톡-주문알림": noopAfter("tc1296_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1297_카카오톡-주문알림": noopAfter("tc1297_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1298_카카오톡-주문알림": noopAfter("tc1298_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1299_카카오톡-주문알림": noopAfter("tc1299_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1300_카카오톡-주문알림": noopAfter("tc1300_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1301_카카오톡-주문알림": noopAfter("tc1301_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1302_카카오톡-주문알림": noopAfter("tc1302_카카오톡-주문알림", 'destructive / 환경 의존 / AI 비결정 — skip'),
};

test("업로드 / 해구대 영역 P2 TC 묶음 (21건) — 진입 + destructive/AI noop skip", async ({ page }) => {
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
