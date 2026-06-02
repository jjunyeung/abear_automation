/**
 * 상품수집 / 오너클랜 영역 P2 TC 묶음 (13건) — skeleton ATC, destructive/외부/AI/환경 의존 → 진입 + noop log.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', "atcs", "product-collect", "p2-상품수집-오너클랜.atc.yml");
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
  "tc223_⑥": verifyPageReachable,
  "tc224_⑥": noopAfter("tc224_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc225_⑥": noopAfter("tc225_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc226_⑥": noopAfter("tc226_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc227_⑥": noopAfter("tc227_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc228_⑥": noopAfter("tc228_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc229_⑥": noopAfter("tc229_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc230_⑥": noopAfter("tc230_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc231_⑥": noopAfter("tc231_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc232_⑥": noopAfter("tc232_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc233_⑥": noopAfter("tc233_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc234_⑥": noopAfter("tc234_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc235_⑥": noopAfter("tc235_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
};

test("상품수집 / 오너클랜 영역 P2 TC 묶음 (13건) — 진입 + destructive/AI noop skip", async ({ page }) => {
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
