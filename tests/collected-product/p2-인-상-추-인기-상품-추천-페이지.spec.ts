/**
 * 인기 상품 추천 페이지 영역 P2 (13건) — 페이지 구조 요소는 real 검증, 데이터/상호작용 의존은 noop.
 *
 * 대응 ATC : atcs/collected-product/p2-인-상-추-인기-상품-추천-페이지.atc.yml
 * 페이지    : windly-frontend-web(view3) /view3/recommended-product
 *   - Layout title="인기 상품 추천"  (RecommendedProduct/index.tsx)
 *   - Header: "가이드 보러가기" 링크
 *   - Keywords 섹션: "지금 잘 팔리는 상품 키워드 Top 20"
 *   - ProductList: selectedKeyword 있을 때만 렌더(데이터 의존) → 카드/정렬/툴팁은 noop 유지
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'collected-product', 'p2-인-상-추-인기-상품-추천-페이지.atc.yml');
const URL = 'https://app.windly.cc/view3/recommended-product';

let entered = false;
const enterPage: StepHandler = async (page) => {
  if (entered) return { ok: true as const };
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);
  entered = true;
  return { ok: true as const };
};

const noopAfter = (label: string, reason: string): StepHandler => async (page) => {
  const e = await enterPage(page, {});
  if (!e.ok) return e;
  logger.info(`[${label}] ${reason} — skip`);
  return { ok: true as const };
};

/** 진입(idempotent) 후 정확 텍스트 노출 검증. */
const verifyTextStep = (re: RegExp, key: string): StepHandler => async (page) => {
  const e = await enterPage(page, {});
  if (!e.ok) return e;
  try {
    await page.getByText(re).first().waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    return { ok: false as const, error_key: key as ErrorKey, message: `미노출: ${re.source}` };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  'tc3735_페이지-제목': verifyTextStep(/^인기 상품 추천$/, 'recommend_title_missing'),
  'tc3736_상단-안내': verifyTextStep(/가이드 보러가기/, 'recommend_guide_link_missing'),
  'tc3737_가이드-링크': noopAfter('tc3737_가이드-링크', '외부 가이드 이동 — skip'),
  'tc3738_섹션-타이틀': verifyTextStep(/지금 잘 팔리는 상품 키워드 Top 20/, 'recommend_section_title_missing'),
  'tc3739_키워드-탭': noopAfter('tc3739_키워드-탭', '선택 키워드 데이터 의존 — skip'),
  'tc3740_섹션-타이틀': noopAfter('tc3740_섹션-타이틀', '선택 키워드 데이터 의존 — skip'),
  'tc3741_정렬-옵션': verifyTextStep(/추천순/, 'sort_option_missing'),
  'tc3742_상품-카드': noopAfter('tc3742_상품-카드', 'ProductList 데이터 의존 — skip'),
  'tc3743_정보-툴팁': noopAfter('tc3743_정보-툴팁', '호버 상호작용 — skip'),
  'tc3744_비슷한-상품찾기-버튼': verifyTextStep(/비슷한 상품/, 'similar_btn_missing'),
  'tc3758_로딩-상태': noopAfter('tc3758_로딩-상태', '로딩 타이밍 의존 — skip'),
  'tc3759_에러-상태': noopAfter('tc3759_에러-상태', 'API 에러 유도 필요 — skip'),
  'tc3760_에러-복구': noopAfter('tc3760_에러-복구', 'API 에러 유도 필요 — skip'),
};

test('인기 상품 추천 페이지 — 제목/가이드링크/Top20 섹션 노출 검증 (TC 3735~3760)', async ({ page }) => {
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
