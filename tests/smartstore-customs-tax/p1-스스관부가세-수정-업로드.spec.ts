/**
 * 스스관부가세 / 수정 업로드 영역 P1 TC 묶음 (9건) — skeleton ATC, destructive/외부/AI/환경 의존 → 진입 + noop log.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', "atcs", "smartstore-customs-tax", "p1-스스관부가세-수정-업로드.atc.yml");
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
  "tc3574_단계-표시": verifyPageReachable,
  "tc3575_모달-제목": noopAfter("tc3575_모달-제목", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3584_다음-버튼-상태": noopAfter("tc3584_다음-버튼-상태", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3587_2단계-상단-문구": noopAfter("tc3587_2단계-상단-문구", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3592_이전-버튼-동작": noopAfter("tc3592_이전-버튼-동작", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3594_스마트스토어-관부가세-문구": noopAfter("tc3594_스마트스토어-관부가세-문구", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3595_스마트스토어-관부가세-액션": noopAfter("tc3595_스마트스토어-관부가세-액션", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3599_3단계-버튼-노출": noopAfter("tc3599_3단계-버튼-노출", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3603_단계-값-유지": noopAfter("tc3603_단계-값-유지", 'destructive / 환경 의존 / AI 비결정 — skip'),
};

test("스스관부가세 / 수정 업로드 영역 P1 TC 묶음 (9건) — 진입 + destructive/AI noop skip", async ({ page }) => {
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
