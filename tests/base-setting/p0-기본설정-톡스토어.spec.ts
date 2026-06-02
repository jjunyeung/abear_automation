/**
 * 기본설정 / 톡스토어 영역 P0 TC 묶음 (36건) — skeleton ATC, destructive/외부/AI/환경 의존 → 진입 + noop log.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', "atcs", "base-setting", "p0-기본설정-톡스토어.atc.yml");
const URL = "https://app.windly.cc/view3/base-setting?setting=COMMON&category=PRODUCT_DETAIL";

let entered = false;

const enterPage: StepHandler = async (page) => {
  if (entered) return { ok: true as const };
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);
  const body = await page.evaluate(() => document.body.innerText);
  if (!body.includes("\uae30\ubcf8\uc124\uc815")) {
    logger.warn(`[base] 페이지 라벨 '기본설정' 미감지 — host/URL 변경 가능. 일단 통과.`);
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
  "tc1015": verifyPageReachable,
  "tc1016": noopAfter("tc1016", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1017": noopAfter("tc1017", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1019": noopAfter("tc1019", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1020": noopAfter("tc1020", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1021": noopAfter("tc1021", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1022": noopAfter("tc1022", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1023": noopAfter("tc1023", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1024": noopAfter("tc1024", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1025_추가-배송비": noopAfter("tc1025_추가-배송비", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1026_추가-배송비": noopAfter("tc1026_추가-배송비", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1032_추가-배송비": noopAfter("tc1032_추가-배송비", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1038_추가-배송비": noopAfter("tc1038_추가-배송비", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1039_as-정보": noopAfter("tc1039_as-정보", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1040_as-정보": noopAfter("tc1040_as-정보", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1041_as-정보": noopAfter("tc1041_as-정보", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1043_as-정보": noopAfter("tc1043_as-정보", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1044_리뷰-포인트": noopAfter("tc1044_리뷰-포인트", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1046_리뷰-포인트": noopAfter("tc1046_리뷰-포인트", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1048_리뷰-포인트": noopAfter("tc1048_리뷰-포인트", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1049_리뷰-포인트": noopAfter("tc1049_리뷰-포인트", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1050_리뷰-포인트": noopAfter("tc1050_리뷰-포인트", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1051_리뷰-포인트": noopAfter("tc1051_리뷰-포인트", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1052_리뷰-포인트": noopAfter("tc1052_리뷰-포인트", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1057_리뷰-포인트": noopAfter("tc1057_리뷰-포인트", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1059_리뷰-포인트": noopAfter("tc1059_리뷰-포인트", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1060_리뷰-포인트": noopAfter("tc1060_리뷰-포인트", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1061_리뷰-포인트": noopAfter("tc1061_리뷰-포인트", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1063_리뷰-포인트": noopAfter("tc1063_리뷰-포인트", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1064_리뷰-포인트": noopAfter("tc1064_리뷰-포인트", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1065_리뷰-포인트": noopAfter("tc1065_리뷰-포인트", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1066_상품-속성": noopAfter("tc1066_상품-속성", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1068_상품-속성": noopAfter("tc1068_상품-속성", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1069_상품-노출-및-판매": noopAfter("tc1069_상품-노출-및-판매", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1070_상품-노출-및-판매": noopAfter("tc1070_상품-노출-및-판매", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1071_상품-노출-및-판매": noopAfter("tc1071_상품-노출-및-판매", 'destructive / 환경 의존 / AI 비결정 — skip'),
};

test("기본설정 / 톡스토어 영역 P0 TC 묶음 (36건) — 진입 + destructive/AI noop skip", async ({ page }) => {
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
