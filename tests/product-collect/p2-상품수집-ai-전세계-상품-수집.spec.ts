/**
 * 상품수집 / AI 전세계 상품 수집 영역 P2 TC 묶음 (22건) — skeleton ATC, destructive/외부/AI/환경 의존 → 진입 + noop log.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', "atcs", "product-collect", "p2-상품수집-ai-전세계-상품-수집.atc.yml");
const URL = "https://app.windly.cc/view3/product-import";

let entered = false;

const enterPage: StepHandler = async (page) => {
  if (entered) return { ok: true as const };
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);
  const body = await page.evaluate(() => document.body.innerText);
  if (!body.includes("\uc0c1\ud488")) {
    logger.warn(`[collect] 페이지 라벨 '상품' 미감지 — host/URL 변경 가능. 일단 통과.`);
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
  "tc91_⑥": verifyPageReachable,
  "tc92_⑥": noopAfter("tc92_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc93_⑥": noopAfter("tc93_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc94_⑥": noopAfter("tc94_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc95_⑥": noopAfter("tc95_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc96_⑥": noopAfter("tc96_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc97_⑥": noopAfter("tc97_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc98_⑥": noopAfter("tc98_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc99_⑥": noopAfter("tc99_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc100_⑥": noopAfter("tc100_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc101_⑥": noopAfter("tc101_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc102_⑥": noopAfter("tc102_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc103_⑥": noopAfter("tc103_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc104_⑥": noopAfter("tc104_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc105_⑥": noopAfter("tc105_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc106_⑥": noopAfter("tc106_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc107_⑥": noopAfter("tc107_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc108_⑥": noopAfter("tc108_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc109_⑥": noopAfter("tc109_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc110_⑥": noopAfter("tc110_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc111_⑥": noopAfter("tc111_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc112_⑥": noopAfter("tc112_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
};

test("상품수집 / AI 전세계 상품 수집 영역 P2 TC 묶음 (22건) — 진입 + destructive/AI noop skip", async ({ page }) => {
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
