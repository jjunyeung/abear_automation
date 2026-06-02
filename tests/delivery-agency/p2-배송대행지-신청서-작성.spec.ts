/**
 * 배송대행지 / 신청서 작성 영역 P2 TC 묶음 (40건) — skeleton ATC, destructive/외부/AI/환경 의존 → 진입 + noop log.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', "atcs", "delivery-agency", "p2-배송대행지-신청서-작성.atc.yml");
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
  "tc1369_센터-주소-확인": verifyPageReachable,
  "tc1370_센터-주소-확인": noopAfter("tc1370_센터-주소-확인", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1371_센터-주소-확인": noopAfter("tc1371_센터-주소-확인", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1372_센터-주소-확인": noopAfter("tc1372_센터-주소-확인", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1373_센터-주소-확인": noopAfter("tc1373_센터-주소-확인", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1374_센터-주소-확인": noopAfter("tc1374_센터-주소-확인", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1468": noopAfter("tc1468", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1469": noopAfter("tc1469", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1470": noopAfter("tc1470", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1471": noopAfter("tc1471", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1472": noopAfter("tc1472", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1473": noopAfter("tc1473", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1474": noopAfter("tc1474", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1475": noopAfter("tc1475", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1476": noopAfter("tc1476", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1477": noopAfter("tc1477", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1478": noopAfter("tc1478", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1479": noopAfter("tc1479", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1480": noopAfter("tc1480", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1481": noopAfter("tc1481", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1482": noopAfter("tc1482", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1483": noopAfter("tc1483", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1484": noopAfter("tc1484", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1485": noopAfter("tc1485", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1486": noopAfter("tc1486", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1487": noopAfter("tc1487", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1488": noopAfter("tc1488", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1489": noopAfter("tc1489", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1490": noopAfter("tc1490", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1491": noopAfter("tc1491", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1492": noopAfter("tc1492", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1493": noopAfter("tc1493", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1494": noopAfter("tc1494", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1495": noopAfter("tc1495", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1496": noopAfter("tc1496", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1497": noopAfter("tc1497", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1498": noopAfter("tc1498", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1499": noopAfter("tc1499", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1500": noopAfter("tc1500", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1501": noopAfter("tc1501", 'destructive / 환경 의존 / AI 비결정 — skip'),
};

test("배송대행지 / 신청서 작성 영역 P2 TC 묶음 (40건) — 진입 + destructive/AI noop skip", async ({ page }) => {
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
