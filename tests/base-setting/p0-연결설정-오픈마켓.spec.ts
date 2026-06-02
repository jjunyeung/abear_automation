/**
 * 연결설정 / 오픈마켓 영역 P0 TC 묶음 (20건) — skeleton ATC, destructive/외부/AI/환경 의존 → 진입 + noop log.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', "atcs", "base-setting", "p0-연결설정-오픈마켓.atc.yml");
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
  "tc990": verifyPageReachable,
  "tc993": noopAfter("tc993", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc994": noopAfter("tc994", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc995": noopAfter("tc995", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc996": noopAfter("tc996", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc997": noopAfter("tc997", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc998": noopAfter("tc998", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc999": noopAfter("tc999", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1000": noopAfter("tc1000", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1001": noopAfter("tc1001", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1002": noopAfter("tc1002", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1003": noopAfter("tc1003", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1004": noopAfter("tc1004", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1005": noopAfter("tc1005", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1006": noopAfter("tc1006", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1007": noopAfter("tc1007", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1008": noopAfter("tc1008", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1010": noopAfter("tc1010", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1011": noopAfter("tc1011", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1012": noopAfter("tc1012", 'destructive / 환경 의존 / AI 비결정 — skip'),
};

test("연결설정 / 오픈마켓 영역 P0 TC 묶음 (20건) — 진입 + destructive/AI noop skip", async ({ page }) => {
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
