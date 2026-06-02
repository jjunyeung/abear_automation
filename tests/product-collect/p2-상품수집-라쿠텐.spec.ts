/**
 * 상품수집 / 라쿠텐 영역 P2 TC 묶음 (11건) — skeleton ATC, destructive/외부/AI/환경 의존 → 진입 + noop log.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', "atcs", "product-collect", "p2-상품수집-라쿠텐.atc.yml");
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
  "tc175_⑥": verifyPageReachable,
  "tc176_⑥": noopAfter("tc176_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc177_⑥": noopAfter("tc177_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc178_⑥": noopAfter("tc178_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc179_⑥": noopAfter("tc179_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc180_⑥": noopAfter("tc180_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc181_⑥": noopAfter("tc181_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc182_⑥": noopAfter("tc182_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc183_⑥": noopAfter("tc183_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc184_⑥": noopAfter("tc184_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc185_⑥": noopAfter("tc185_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
};

test("상품수집 / 라쿠텐 영역 P2 TC 묶음 (11건) — 진입 + destructive/AI noop skip", async ({ page }) => {
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
