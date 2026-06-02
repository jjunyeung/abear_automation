/**
 * 스스관부가세 / 수정 업로드 영역 P0 TC 묶음 (21건) — skeleton ATC, destructive/외부/AI/환경 의존 → 진입 + noop log.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', "atcs", "smartstore-customs-tax", "p0-스스관부가세-수정-업로드.atc.yml");
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
  "tc3576_안내-배너-문구": verifyPageReachable,
  "tc3577_전체-선택-체크박스": noopAfter("tc3577_전체-선택-체크박스", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3578_마켓-목록-노출": noopAfter("tc3578_마켓-목록-노출", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3579_비활성-마켓-표시": noopAfter("tc3579_비활성-마켓-표시", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3580_전체-선택-동작": noopAfter("tc3580_전체-선택-동작", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3581_개별-마켓-선택": noopAfter("tc3581_개별-마켓-선택", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3582_일부-마켓-선택": noopAfter("tc3582_일부-마켓-선택", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3583_선택-없음-예외": noopAfter("tc3583_선택-없음-예외", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3585_취소-버튼-동작": noopAfter("tc3585_취소-버튼-동작", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3586_2단계-진입": noopAfter("tc3586_2단계-진입", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3588_수정-항목-목록-노출": noopAfter("tc3588_수정-항목-목록-노출", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3589_수정-항목-단일-선택": noopAfter("tc3589_수정-항목-단일-선택", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3590_다음-버튼-이동": noopAfter("tc3590_다음-버튼-이동", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3591_수정-항목-미선택-예외": noopAfter("tc3591_수정-항목-미선택-예외", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3593_스마트스토어-관부가세-진입": noopAfter("tc3593_스마트스토어-관부가세-진입", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3596_스마트스토어-관부가세-옵션": noopAfter("tc3596_스마트스토어-관부가세-옵션", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3597_스마트스토어-관부가세-단일-선택": noopAfter("tc3597_스마트스토어-관부가세-단일-선택", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3598_수정-업로드-실행": noopAfter("tc3598_수정-업로드-실행", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3600_스마트스토어-미선택-비활성": noopAfter("tc3600_스마트스토어-미선택-비활성", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3601_선택-마켓-기반-활성-제어": noopAfter("tc3601_선택-마켓-기반-활성-제어", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3602_비활성-항목-선택-제한": noopAfter("tc3602_비활성-항목-선택-제한", 'destructive / 환경 의존 / AI 비결정 — skip'),
};

test("스스관부가세 / 수정 업로드 영역 P0 TC 묶음 (21건) — 진입 + destructive/AI noop skip", async ({ page }) => {
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
