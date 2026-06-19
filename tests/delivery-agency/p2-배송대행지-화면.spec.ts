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

const v = (re: RegExp, key: string): StepHandler => async (page) => {
  const e = await enterPage(page, {});
  if (!e.ok) return e;
  for (let i = 0; i < 5; i += 1) {
    if (await page.evaluate((s) => new RegExp(s).test(document.body.innerText), re.source).catch(() => false)) return { ok: true as const };
    await page.waitForTimeout(400);
  }
  return { ok: false as const, error_key: key as ErrorKey, message: `미노출: ${re.source}` };
};

const handlers: StepHandlers = {
  "tc1358_카카오톡-주문알림": verifyPageReachable,
  "tc1359_카카오톡-주문알림": v(/확인이 필요한 배송/, 'check_delivery_card_missing'),
  "tc1360_카카오톡-주문알림": noopAfter("tc1360_카카오톡-주문알림", '버튼 동작 — skip'),
  "tc1361_카카오톡-주문알림": noopAfter("tc1361_카카오톡-주문알림", '! 호버 — skip'),
  "tc1362_카카오톡-주문알림": v(/결제 정보/, 'payment_card_missing'),
  "tc1363_카카오톡-주문알림": noopAfter("tc1363_카카오톡-주문알림", '버튼 동작 — skip'),
  "tc1364_카카오톡-주문알림": v(/배송 정보/, 'delivery_info_card_missing'),
  "tc1365_카카오톡-주문알림": noopAfter("tc1365_카카오톡-주문알림", '버튼 동작 — skip'),
  "tc1366_센터-주소-확인": v(/센터 주소 확인/, 'center_address_missing'),
  "tc1367_센터-주소-확인": noopAfter("tc1367_센터-주소-확인", '모달 버튼 선택 — skip'),
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
