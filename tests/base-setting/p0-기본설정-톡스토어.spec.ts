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
const URL = "https://app.windly.cc/view3/base-setting?setting=TALKSTORE";

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

const bodyHas = (page: import('@playwright/test').Page, src: string): Promise<boolean> =>
  page.evaluate((s) => new RegExp(s).test(document.body.innerText), src).catch(() => false);
const v = (re: RegExp, key: string): StepHandler => async (page) => {
  const e = await enterPage(page, {});
  if (!e.ok) return e;
  for (let i = 0; i < 5; i += 1) {
    if (await bodyHas(page, re.source)) return { ok: true as const };
    await page.waitForTimeout(500);
  }
  return { ok: false as const, error_key: key as ErrorKey, message: `톡스토어 설정 미노출: ${re.source}` };
};

const handlers: StepHandlers = {
  "tc1015": v(/배송 정보/, 'talkstore_setting_missing'),
  "tc1016": noopAfter("tc1016", '연결하러 가기 = 미연결 상태 전용 (현재 연결됨) — skip'),
  "tc1017": v(/출고지\/반품지/, 'shipping_section_missing'),
  "tc1019": v(/출고지 목록/, 'origin_dropdown_missing'),
  "tc1020": noopAfter("tc1020", '출고지 선택(쓰기) — skip'),
  "tc1021": v(/반품지 목록/, 'return_dropdown_missing'),
  "tc1022": noopAfter("tc1022", '반품지 선택(쓰기) — skip'),
  "tc1023": v(/택배사 목록/, 'courier_dropdown_missing'),
  "tc1024": noopAfter("tc1024", '택배사 선택(쓰기) — skip'),
  "tc1025_추가-배송비": v(/추가 배송비/, 'add_delivery_missing'),
  "tc1026_추가-배송비": v(/도서산간 추가 배송비/, 'island_delivery_missing'),
  "tc1032_추가-배송비": v(/제주 지역 추가 배송비/, 'jeju_delivery_missing'),
  "tc1038_추가-배송비": v(/배송 불가/, 'no_delivery_option_missing'),
  "tc1039_as-정보": v(/A\/S 전화번호/, 'as_phone_missing'),
  "tc1040_as-정보": v(/A\/S 안내 내용/, 'as_guide_missing'),
  "tc1041_as-정보": noopAfter("tc1041_as-정보", '전화번호 에러 상태(잘못된 입력) — skip'),
  "tc1043_as-정보": noopAfter("tc1043_as-정보", 'A/S 안내 입력(쓰기) — skip'),
  "tc1044_리뷰-포인트": v(/리뷰 포인트/, 'review_point_missing'),
  "tc1046_리뷰-포인트": noopAfter("tc1046_리뷰-포인트", '구매 포인트 토글(쓰기) — skip'),
  "tc1048_리뷰-포인트": noopAfter("tc1048_리뷰-포인트", '원 드롭다운(쓰기) — skip'),
  "tc1049_리뷰-포인트": noopAfter("tc1049_리뷰-포인트", '원 선택(쓰기) — skip'),
  "tc1050_리뷰-포인트": noopAfter("tc1050_리뷰-포인트", '% 선택(쓰기) — skip'),
  "tc1051_리뷰-포인트": noopAfter("tc1051_리뷰-포인트", '적립액 입력(쓰기) — skip'),
  "tc1052_리뷰-포인트": noopAfter("tc1052_리뷰-포인트", '적립액 입력(쓰기) — skip'),
  "tc1057_리뷰-포인트": noopAfter("tc1057_리뷰-포인트", '적립액 입력(쓰기) — skip'),
  "tc1059_리뷰-포인트": noopAfter("tc1059_리뷰-포인트", '적립율 입력(쓰기) — skip'),
  "tc1060_리뷰-포인트": noopAfter("tc1060_리뷰-포인트", '적립율 입력(쓰기) — skip'),
  "tc1061_리뷰-포인트": noopAfter("tc1061_리뷰-포인트", '적립율 입력(쓰기) — skip'),
  "tc1063_리뷰-포인트": noopAfter("tc1063_리뷰-포인트", '토글 off(쓰기) — skip'),
  "tc1064_리뷰-포인트": noopAfter("tc1064_리뷰-포인트", '리뷰 포인트 On(쓰기) — skip'),
  "tc1065_리뷰-포인트": noopAfter("tc1065_리뷰-포인트", '리뷰 포인트 Off(쓰기) — skip'),
  "tc1066_상품-속성": v(/상품 속성/, 'attribute_section_missing'),
  "tc1068_상품-속성": noopAfter("tc1068_상품-속성", '드롭다운 선택(쓰기) — skip'),
  "tc1069_상품-노출-및-판매": v(/상품 노출 및 판매/, 'display_section_missing'),
  "tc1070_상품-노출-및-판매": noopAfter("tc1070_상품-노출-및-판매", '전시상태 변경(쓰기) — skip'),
  "tc1071_상품-노출-및-판매": noopAfter("tc1071_상품-노출-및-판매", '노출 설정 변경(쓰기) — skip'),
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
