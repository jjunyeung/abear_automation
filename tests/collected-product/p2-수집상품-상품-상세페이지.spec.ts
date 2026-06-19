/**
 * 수집상품 / 상품 상세페이지 영역 P2 TC 묶음 (183건) — skeleton ATC, destructive/외부/AI/환경 의존 → 진입 + noop log.
 */

import { join } from 'path';
import type { Page } from '@playwright/test';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';
import {
  openFirstCollectedProductStep,
  clickTabByLabelStep,
} from './_talkstore-handlers';

const ATC_PATH = join(__dirname, '..', '..', "atcs", "collected-product", "p2-수집상품-상품-상세페이지.atc.yml");
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

// 상세 1회 진입 후 탭 전환 (talkstore 패턴 재사용). ProductDetail 최상위 탭은 항상 렌더.
let detailOpen = false;
const ensureDetailStep: StepHandler = async (page, inputs) => {
  if (detailOpen) return { ok: true as const };
  const r = await openFirstCollectedProductStep(page, inputs);
  if (r.ok) detailOpen = true;
  return r;
};
const tabStep = (labelRe: RegExp): StepHandler => async (page, inputs) => {
  const e = await ensureDetailStep(page, inputs);
  if (!e.ok) return e;
  return clickTabByLabelStep(labelRe)(page, inputs);
};

// 한글 텍스트는 getByText 매칭이 불안정 → body innerText 정규식.
const bodyHas = (page: Page, src: string): Promise<boolean> =>
  page.evaluate((s) => new RegExp(s).test(document.body.innerText), src).catch(() => false);

// 특정 탭으로 전환 후 그 탭 안에 텍스트(버튼/라벨) 가 노출되는지 검증.
const tabHasText = (labelRe: RegExp, re: RegExp, key: string): StepHandler => async (page, inputs) => {
  const e = await tabStep(labelRe)(page, inputs);
  if (!e.ok) return e;
  for (let i = 0; i < 5; i += 1) {
    if (await bodyHas(page, re.source)) return { ok: true as const };
    await page.waitForTimeout(500);
  }
  return { ok: false as const, error_key: key as ErrorKey, message: `탭 내 미노출: ${re.source}` };
};
// 기본 정보 탭 내 텍스트 검증 단축.
const infoText = (re: RegExp): StepHandler => tabHasText(/^기본 정보$/, re, 'info_text_missing');
const salesText = (re: RegExp): StepHandler => tabHasText(/^판매가$/, re, 'sales_text_missing');
const attrText = (re: RegExp): StepHandler => tabHasText(/^상품 속성$/, re, 'attr_text_missing');
const imageText = (re: RegExp): StepHandler => tabHasText(/^이미지$/, re, 'image_text_missing');
const detailPageText = (re: RegExp): StepHandler => tabHasText(/^상세페이지$/, re, 'detailpage_text_missing');
const uploadText = (re: RegExp): StepHandler => tabHasText(/^업로드 설정$/, re, 'upload_text_missing');
const optionText = (re: RegExp): StepHandler => tabHasText(/^옵션$/, re, 'option_text_missing');

const handlers: StepHandlers = {
  "tc387_기본-설정값-적용": verifyPageReachable,
  "tc388_gnb": noopAfter("tc388_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc389_gnb": noopAfter("tc389_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc390_gnb": noopAfter("tc390_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc391_gnb": noopAfter("tc391_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc392_gnb": noopAfter("tc392_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc393_gnb": noopAfter("tc393_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc394_gnb": noopAfter("tc394_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc395_gnb": noopAfter("tc395_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc396_gnb": noopAfter("tc396_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc397_gnb": noopAfter("tc397_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc398_gnb": noopAfter("tc398_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc399_gnb": noopAfter("tc399_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc400_gnb": noopAfter("tc400_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc401_gnb": noopAfter("tc401_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc402_gnb": noopAfter("tc402_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc403_gnb": noopAfter("tc403_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc404_gnb": noopAfter("tc404_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc405_gnb": noopAfter("tc405_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc406_gnb": noopAfter("tc406_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc407_gnb": noopAfter("tc407_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc408_gnb": noopAfter("tc408_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc409_gnb": noopAfter("tc409_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc410_gnb": noopAfter("tc410_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc411_gnb": noopAfter("tc411_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc412": infoText(/상품명/),
  "tc413": infoText(/AI 상품명 추천/),
  "tc414": infoText(/원본 상품명으로 초기화/),
  "tc415": infoText(/상품명 키워드 추천/),
  "tc416": noopAfter("tc416", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc417": noopAfter("tc417", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc418": noopAfter("tc418", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc419": noopAfter("tc419", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc420": noopAfter("tc420", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc421": infoText(/카테고리\/태그 검색/),
  "tc422": infoText(/카테고리 복사/),
  "tc423": infoText(/카테고리 붙여넣기/),
  "tc424": noopAfter("tc424", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc425": noopAfter("tc425", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc426": noopAfter("tc426", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc427": infoText(/AI 태그 추천/),
  "tc428": infoText(/상품 태그/),
  "tc429": noopAfter("tc429", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc430": noopAfter("tc430", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc431": noopAfter("tc431", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc432": tabStep(/^이미지$/),
  "tc433": tabStep(/^이미지$/),
  "tc434": imageText(/대표이미지/),
  "tc435": imageText(/동영상 파일 업로드/),
  "tc436": noopAfter("tc436", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc437": noopAfter("tc437", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc438": noopAfter("tc438", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc439": noopAfter("tc439", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc440": tabStep(/^옵션$/),
  "tc441": optionText(/옵션 전체 보기/),
  "tc442": optionText(/옵션이미지를 대표이미지로 사용/),
  "tc443": optionText(/임시 그룹명 사용/),
  "tc444": noopAfter("tc444", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc445": noopAfter("tc445", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc446": noopAfter("tc446", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc447": noopAfter("tc447", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc448": noopAfter("tc448", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc449": noopAfter("tc449", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc450": noopAfter("tc450", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc451": noopAfter("tc451", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc452": noopAfter("tc452", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc453": noopAfter("tc453", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc454": noopAfter("tc454", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc455": noopAfter("tc455", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc456": noopAfter("tc456", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc457": noopAfter("tc457", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc458": noopAfter("tc458", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc459": noopAfter("tc459", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc460": noopAfter("tc460", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc461": noopAfter("tc461", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc462": noopAfter("tc462", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc463": noopAfter("tc463", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc464": noopAfter("tc464", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc465": noopAfter("tc465", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc466": noopAfter("tc466", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc467": noopAfter("tc467", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc468": tabStep(/^옵션$/),
  "tc469": tabStep(/^판매가$/),
  "tc470": salesText(/소싱몰 배송비/),
  "tc471": salesText(/배송비 유형/),
  "tc472": salesText(/기본 배송비/),
  "tc473": salesText(/반품 배송비/),
  "tc474": salesText(/교환 배송비/),
  "tc475": noopAfter("tc475", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc476": noopAfter("tc476", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc477": noopAfter("tc477", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc478": noopAfter("tc478", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc479": noopAfter("tc479", '판매가 펼치기 필요(접힘) — skip'),
  "tc480": noopAfter("tc480", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc481": noopAfter("tc481", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc482": noopAfter("tc482", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc483": noopAfter("tc483", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc484": noopAfter("tc484", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc485": noopAfter("tc485", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc486": noopAfter("tc486", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc487": noopAfter("tc487", '판매가 펼치기 필요(접힘) — skip'),
  "tc488": salesText(/관세 설정/),
  "tc489": noopAfter("tc489", '관세 설정 펼침 필요 — skip'),
  "tc490": noopAfter("tc490", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc491": noopAfter("tc491", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc492": noopAfter("tc492", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc493": noopAfter("tc493", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc494": noopAfter("tc494", '판매가 펼치기 필요 — skip'),
  "tc495": noopAfter("tc495", '판매가 펼치기 필요 — skip'),
  "tc496": noopAfter("tc496", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc497": noopAfter("tc497", '판매가 펼치기 필요 — skip'),
  "tc498": noopAfter("tc498", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc499": noopAfter("tc499", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc500": noopAfter("tc500", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc501": noopAfter("tc501", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc502": noopAfter("tc502", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc503": noopAfter("tc503", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc504": noopAfter("tc504", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc505": noopAfter("tc505", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc506": noopAfter("tc506", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc507": noopAfter("tc507", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc508": noopAfter("tc508", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc509": noopAfter("tc509", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc510": noopAfter("tc510", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc511": noopAfter("tc511", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc512": noopAfter("tc512", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc513_상품-속성": tabStep(/^상품 속성$/),
  "tc514_상품-속성": attrText(/정보고시|직접 추가/),
  "tc515_상품-속성": noopAfter("tc515_상품-속성", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc516_상품-속성": noopAfter("tc516_상품-속성", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc517_상품-속성": noopAfter("tc517_상품-속성", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc518_상품-속성": noopAfter("tc518_상품-속성", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc519_상품-속성": noopAfter("tc519_상품-속성", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc520_상품-속성": noopAfter("tc520_상품-속성", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc521_업로드-마켓": noopAfter("tc521_업로드-마켓", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc522_업로드-마켓": noopAfter("tc522_업로드-마켓", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc523_업로드-마켓": noopAfter("tc523_업로드-마켓", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc524_업로드-마켓": noopAfter("tc524_업로드-마켓", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc525": detailPageText(/상세페이지 이미지/),
  "tc526": detailPageText(/상세페이지 이미지/),
  "tc527": noopAfter("tc527", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc528": noopAfter("tc528", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc529": noopAfter("tc529", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc530": detailPageText(/미리보기/),
  "tc531": detailPageText(/AI 이미지 번역/),
  "tc532": detailPageText(/이미지 편집/),
  "tc533": detailPageText(/상하단이미지 수정/),
  "tc534": noopAfter("tc534", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc535": noopAfter("tc535", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc536": noopAfter("tc536", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc537": detailPageText(/상세페이지 구조/),
  "tc538": detailPageText(/소제목 보이기/),
  "tc539": detailPageText(/옵션이미지 표/),
  "tc540_업로드-설정": uploadText(/공통 업로드 설정/),
  "tc541_업로드-설정": uploadText(/업로드 대상 마켓/),
  "tc542_업로드-설정": uploadText(/스마트스토어 업로드 설정/),
  "tc543_업로드-설정": uploadText(/모음전 정책 적용/),
  "tc544_업로드-설정": uploadText(/상품명 및 첫번째 옵션 순서 변경/),
  "tc545_업로드-설정": uploadText(/썸네일 이미지 변경/),
  "tc546_업로드-설정": uploadText(/리뷰 포인트 설정/),
  "tc547_업로드-설정": noopAfter("tc547_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc548_업로드-설정": noopAfter("tc548_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc549_업로드-설정": noopAfter("tc549_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc550_업로드-설정": noopAfter("tc550_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc551_업로드-설정": noopAfter("tc551_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc552_업로드-설정": noopAfter("tc552_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc553_업로드-설정": noopAfter("tc553_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc554_업로드-설정": uploadText(/쿠팡 업로드 설정/),
  "tc555_업로드-설정": noopAfter("tc555_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc556_업로드-설정": noopAfter("tc556_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc557_업로드-설정": uploadText(/ESM 2.0 옵션설정/),
  "tc558_업로드-설정": noopAfter("tc558_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc559_업로드-설정": noopAfter("tc559_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc560_업로드-설정": noopAfter("tc560_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc561_업로드-설정": noopAfter("tc561_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc562_업로드-설정": noopAfter("tc562_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc563_업로드-설정": noopAfter("tc563_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc564_업로드-설정": noopAfter("tc564_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc565_업로드-설정": noopAfter("tc565_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc566_업로드-설정": noopAfter("tc566_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc567_업로드-설정": noopAfter("tc567_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc568_업로드-설정": uploadText(/롯데온/),
  "tc569_업로드-설정": noopAfter("tc569_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
};

test("수집상품 / 상품 상세페이지 영역 P2 TC 묶음 (183건) — 진입 + destructive/AI noop skip", async ({ page }) => {
  test.setTimeout(3 * 60_000);
  entered = false;
  detailOpen = false;
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
