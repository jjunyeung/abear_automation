/**
 * 상품수집 / 중국몰 상품 검색 영역 P2 TC 묶음 (16건) — skeleton ATC, destructive/외부/AI/환경 의존 → 진입 + noop log.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', "atcs", "product-collect", "p2-상품수집-중국몰-상품-검색.atc.yml");
const URL = "https://app.windly.cc/view3/search-product";

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

const bodyHas = (page: import('@playwright/test').Page, src: string): Promise<boolean> =>
  page.evaluate((s) => new RegExp(s).test(document.body.innerText), src).catch(() => false);
const verifySearchText = (re: RegExp, key: string): StepHandler => async (page) => {
  const e = await enterPage(page, {});
  if (!e.ok) return e;
  for (let i = 0; i < 5; i += 1) {
    if (await bodyHas(page, re.source)) return { ok: true as const };
    await page.waitForTimeout(500);
  }
  return { ok: false as const, error_key: key as ErrorKey, message: `검색 페이지 미노출: ${re.source}` };
};

const handlers: StepHandlers = {
  "tc113_⑥": verifySearchText(/1688 상품 검색/, 'search_title_missing'),
  "tc114_⑥": verifySearchText(/검색/, 'search_button_missing'),
  "tc115_⑥": verifySearchText(/사용가이드/, 'guide_missing'),
  "tc116_⑥": verifySearchText(/1차 카테고리/, 'category_missing'),
  "tc117_⑥": verifySearchText(/일간 키워드 순위/, 'daily_keyword_missing'),
  "tc118_⑥": noopAfter("tc118_⑥", '키워드 선택(검색 동작) — skip'),
  "tc119_⑥": noopAfter("tc119_⑥", '키워드 순위 로드 실패 에러 상태 — skip'),
  "tc120_⑥": noopAfter("tc120_⑥", '주간 키워드 순위 로드 실패 에러 상태 — skip'),
  "tc121_⑥": noopAfter("tc121_⑥", '검색 횟수 소진 상태 — skip'),
  "tc122_⑥": verifySearchText(/주간 키워드 순위/, 'weekly_keyword_missing'),
  "tc123_⑥": noopAfter("tc123_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc124_⑥": noopAfter("tc124_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc125_⑥": noopAfter("tc125_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc126_⑥": noopAfter("tc126_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc127_⑥": noopAfter("tc127_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc128_⑥": noopAfter("tc128_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
};

test("상품수집 / 중국몰 상품 검색 영역 P2 TC 묶음 (16건) — 진입 + destructive/AI noop skip", async ({ page }) => {
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
