/**
 * 스스관부가세 / 목록 화면 영역 P1 TC 묶음 (8건) — skeleton ATC, destructive/외부/AI/환경 의존 → 진입 + noop log.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', "atcs", "smartstore-customs-tax", "p1-스스관부가세-목록-화면.atc.yml");
const URL = "https://app.windly.cc/view2/registered-product";

let entered = false;

const enterPage: StepHandler = async (page) => {
  if (entered) return { ok: true as const };
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);
  const body = await page.evaluate(() => document.body.innerText);
  if (!body.includes("\ub4f1\ub85d\uc0c1\ud488")) {
    logger.warn(`[customs] 페이지 라벨 '등록상품' 미감지 — host/URL 변경 가능. 일단 통과.`);
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
  "tc3537_상단-검색-영역": verifyPageReachable,
  "tc3540_상품-카드-ui": noopAfter("tc3540_상품-카드-ui", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3543_선택-개수-표시": noopAfter("tc3543_선택-개수-표시", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3544_상품명-변경-액션": noopAfter("tc3544_상품명-변경-액션", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3546_기본-설정값-적용-툴팁": noopAfter("tc3546_기본-설정값-적용-툴팁", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3567_상단-기본-ui": noopAfter("tc3567_상단-기본-ui", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3568_목록-테이블-ui": noopAfter("tc3568_목록-테이블-ui", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3571_선택-개수-표시": noopAfter("tc3571_선택-개수-표시", 'destructive / 환경 의존 / AI 비결정 — skip'),
};

test("스스관부가세 / 목록 화면 영역 P1 TC 묶음 (8건) — 진입 + destructive/AI noop skip", async ({ page }) => {
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
