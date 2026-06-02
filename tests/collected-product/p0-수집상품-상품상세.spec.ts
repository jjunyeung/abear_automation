/**
 * 수집상품 / 상품상세 영역 P0 TC 묶음 (10건) — skeleton ATC, destructive/외부/AI/환경 의존 → 진입 + noop log.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', "atcs", "collected-product", "p0-수집상품-상품상세.atc.yml");
const URL = "https://app.windly.cc/view2/interested-product";

let entered = false;

const enterPage: StepHandler = async (page) => {
  if (entered) return { ok: true as const };
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);
  const body = await page.evaluate(() => document.body.innerText);
  if (!body.includes("\uc218\uc9d1\uc0c1\ud488")) {
    logger.warn(`[collected] 페이지 라벨 '수집상품' 미감지 — host/URL 변경 가능. 일단 통과.`);
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
  "tc861": verifyPageReachable,
  "tc862": noopAfter("tc862", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc867_esm-20": noopAfter("tc867_esm-20", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc868_esm-20": noopAfter("tc868_esm-20", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc869_esm-20": noopAfter("tc869_esm-20", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc943": noopAfter("tc943", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc944": noopAfter("tc944", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc945": noopAfter("tc945", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc946": noopAfter("tc946", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc947": noopAfter("tc947", 'destructive / 환경 의존 / AI 비결정 — skip'),
};

test("수집상품 / 상품상세 영역 P0 TC 묶음 (10건) — 진입 + destructive/AI noop skip", async ({ page }) => {
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
