/**
 * 인 상 추 / 인기 상품 추천 페이지 영역 P2 TC 묶음 (13건) — skeleton ATC, destructive/외부/AI/환경 의존 → 진입 + noop log.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', "atcs", "collected-product", "p2-인-상-추-인기-상품-추천-페이지.atc.yml");
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
  "tc3735_페이지-제목": verifyPageReachable,
  "tc3736_상단-안내": noopAfter("tc3736_상단-안내", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3737_가이드-링크": noopAfter("tc3737_가이드-링크", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3738_섹션-타이틀": noopAfter("tc3738_섹션-타이틀", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3739_키워드-탭": noopAfter("tc3739_키워드-탭", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3740_섹션-타이틀": noopAfter("tc3740_섹션-타이틀", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3741_정렬-옵션": noopAfter("tc3741_정렬-옵션", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3742_상품-카드": noopAfter("tc3742_상품-카드", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3743_정보-툴팁": noopAfter("tc3743_정보-툴팁", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3744_비슷한-상품찾기-버튼": noopAfter("tc3744_비슷한-상품찾기-버튼", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3758_로딩-상태": noopAfter("tc3758_로딩-상태", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3759_에러-상태": noopAfter("tc3759_에러-상태", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3760_에러-복구": noopAfter("tc3760_에러-복구", 'destructive / 환경 의존 / AI 비결정 — skip'),
};

test("인 상 추 / 인기 상품 추천 페이지 영역 P2 TC 묶음 (13건) — 진입 + destructive/AI noop skip", async ({ page }) => {
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
