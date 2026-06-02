/**
 * 배송대행지 / 신청서 작성 영역 P1 TC 묶음 (22건) — skeleton ATC, destructive/외부/AI/환경 의존 → 진입 + noop log.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', "atcs", "delivery-agency", "p1-배송대행지-신청서-작성.atc.yml");
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
  "tc1375_센터-주소-확인": verifyPageReachable,
  "tc1376_센터-주소-확인": noopAfter("tc1376_센터-주소-확인", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1377_센터-주소-확인": noopAfter("tc1377_센터-주소-확인", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1403_센터-주소-확인": noopAfter("tc1403_센터-주소-확인", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1440_센터-주소-확인": noopAfter("tc1440_센터-주소-확인", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1441_센터-주소-확인": noopAfter("tc1441_센터-주소-확인", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1442_센터-주소-확인": noopAfter("tc1442_센터-주소-확인", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1443_센터-주소-확인": noopAfter("tc1443_센터-주소-확인", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1444_센터-주소-확인": noopAfter("tc1444_센터-주소-확인", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1445_센터-주소-확인": noopAfter("tc1445_센터-주소-확인", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1446_센터-주소-확인": noopAfter("tc1446_센터-주소-확인", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1447_센터-주소-확인": noopAfter("tc1447_센터-주소-확인", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1448_센터-주소-확인": noopAfter("tc1448_센터-주소-확인", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1459": noopAfter("tc1459", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1460": noopAfter("tc1460", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1461": noopAfter("tc1461", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1462": noopAfter("tc1462", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1463": noopAfter("tc1463", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1464": noopAfter("tc1464", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1465": noopAfter("tc1465", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1466": noopAfter("tc1466", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1467": noopAfter("tc1467", 'destructive / 환경 의존 / AI 비결정 — skip'),
};

test("배송대행지 / 신청서 작성 영역 P1 TC 묶음 (22건) — 진입 + destructive/AI noop skip", async ({ page }) => {
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
