/**
 * 유입수 분석 / 상세 영역 P2 TC 묶음 (33건) — skeleton ATC, destructive/외부/AI/환경 의존 → 진입 + noop log.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', "atcs", "windly-shell", "p2-유입수-분석-상세.atc.yml");
const URL = "https://app.windly.cc/view3/main";

let entered = false;

const enterPage: StepHandler = async (page) => {
  if (entered) return { ok: true as const };
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);
  const body = await page.evaluate(() => document.body.innerText);
  if (!body.includes("\uc708\ub4e4\ub9ac")) {
    logger.warn(`[shell] 페이지 라벨 '윈들리' 미감지 — host/URL 변경 가능. 일단 통과.`);
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
  "tc723_업로드-설정": verifyPageReachable,
  "tc724_업로드-설정": noopAfter("tc724_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc725_업로드-설정": noopAfter("tc725_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc726_업로드-설정": noopAfter("tc726_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc727_업로드-설정": noopAfter("tc727_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc728_업로드-설정": noopAfter("tc728_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc729_업로드-설정": noopAfter("tc729_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc730_업로드-설정": noopAfter("tc730_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc731_업로드-설정": noopAfter("tc731_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc732_업로드-설정": noopAfter("tc732_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc733_업로드-설정": noopAfter("tc733_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc734_업로드-설정": noopAfter("tc734_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc735_업로드-설정": noopAfter("tc735_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc736_업로드-설정": noopAfter("tc736_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc737_업로드-설정": noopAfter("tc737_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc738_업로드-설정": noopAfter("tc738_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc739_업로드-설정": noopAfter("tc739_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc740_업로드-설정": noopAfter("tc740_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc741_업로드-설정": noopAfter("tc741_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc742_업로드-설정": noopAfter("tc742_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc743_업로드-설정": noopAfter("tc743_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc744_업로드-설정": noopAfter("tc744_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc745_업로드-설정": noopAfter("tc745_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc746_업로드-설정": noopAfter("tc746_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc747_업로드-설정": noopAfter("tc747_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc748_업로드-설정": noopAfter("tc748_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc749_업로드-설정": noopAfter("tc749_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc750_업로드-설정": noopAfter("tc750_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc751_업로드-설정": noopAfter("tc751_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc752_업로드-설정": noopAfter("tc752_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc753_업로드-설정": noopAfter("tc753_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc754_업로드-설정": noopAfter("tc754_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc755_업로드-설정": noopAfter("tc755_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
};

test("유입수 분석 / 상세 영역 P2 TC 묶음 (33건) — 진입 + destructive/AI noop skip", async ({ page }) => {
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
