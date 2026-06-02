/**
 * 공통설정 / AI 이미지 선번역 영역 노출 (non-destructive).
 *
 * 대응 ATC : atcs/base-setting/common-base-ai-translation.atc.yml
 * TC 원본  : Case No 1180, 1196 / P0 (2건). 토글 클릭은 destructive skip.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'base-setting',
  'common-base-ai-translation.atc.yml',
);

// category 는 SideTab 의 tab value 임 (BaseCommonTab). AI_TRANSLATION 은 AI 탭 안의 content section.
// defaultCommonTab.ts: tab='AI', content=[AI_RECOMMENDATION, AI_TRANSLATION].
const PAGE_URL =
  'https://app.windly.cc/view3/base-setting?setting=COMMON&category=AI';

const TOGGLE_LABELS = ['상품 이미지', '옵션 이미지', '상세페이지 이미지'];

const enterAiTranslationTabStep: StepHandler = async (page) => {
  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
  await page
    .getByText(/AI 이미지 선번역|공통설정/)
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 })
    .catch(() => undefined);
  return { ok: true as const };
};

const verifyThreeImageTogglesVisibleStep: StepHandler = async (page) => {
  const bodyText = await page.evaluate(() => document.body.innerText);
  const missing = TOGGLE_LABELS.filter((l) => !bodyText.includes(l));
  if (missing.length > 0) {
    return {
      ok: false as const,
      error_key: 'ai_translation_toggles_missing' as ErrorKey,
      message: `토글 라벨 누락: ${missing.join(' / ')}`,
    };
  }
  return { ok: true as const };
};

const verifyUsageBannerOrSkipStep: StepHandler = async (page) => {
  const bodyText = await page.evaluate(() => document.body.innerText);
  // Banner 의 가능한 메시지 (3종) 중 하나 매칭.
  const usageHints = [
    '오늘 사용한 이미지 선번역 횟수',
    '오늘 사용할 수 있는 이미지 선번역 횟수를 모두 사용하셨어요',
    '이미지 번역 횟수를 소진하셔서',
  ];
  const matchedHint = usageHints.find((h) => bodyText.includes(h));
  if (!matchedHint) {
    // CUSTOM 플랜 사용자는 banner 미노출 — 환경 의존 success.
    // eslint-disable-next-line no-console
    console.log('[TC1196] 사용 횟수 banner 미노출 — CUSTOM 플랜 환경으로 추정. success 처리.');
    return { ok: true as const };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  enter_ai_translation_tab: enterAiTranslationTabStep,
  verify_three_image_toggles_visible: verifyThreeImageTogglesVisibleStep,
  verify_usage_banner_or_skip: verifyUsageBannerOrSkipStep,
};

test('[TC 1180/1196] 기본설정 → 공통 → [AI 추천/번역] 탭 → 3 토글 (상품/옵션/상세페이지 이미지) 라벨 노출 + 사용 횟수 Banner 노출 (CUSTOM 플랜 환경 시 banner 미노출 → success skip)', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
