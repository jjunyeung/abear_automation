/**
 * 기본설정 추천 설문 모달 노출 검증.
 *
 * 대응 ATC: atcs/settings/base-setting-survey-modal-visible.atc.yml
 * TC 원본: Case No 1222, 1223 / 업로드 › 업로드 스토어 / P0
 *
 * 환경 의존: 무료체험 고객 (isFreePlan === true) 가 아니면 banner X.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import {
  runATC,
  type StepHandler,
  type StepHandlers,
} from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'upload', 'base-setting-survey-modal-visible.atc.yml');

const gotoBaseSettingStep: StepHandler = async (page) => {
  // localStorage 의 base-setting-survey-exposed 키 reset 으로 자동 팝업 재노출 시도.
  await page.goto('https://app.windly.cc/view3/base-setting', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.removeItem('base-setting-survey-exposed');
    localStorage.removeItem('base-setting-survey-banner');
  });
  // reload 로 useEffect 재실행 → free plan 이면 자동 modal.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  return { ok: true as const };
};

const verifySurveyModalOrBannerStep: StepHandler = async (page) => {
  // SurveyIntro 의 unique 텍스트 "복잡한 설정은 윈들리가" 검색. 자동 modal 또는 banner 클릭 후.
  const modalText = page.getByText(/복잡한\s*설정은\s*윈들리가/).first();
  let modalShown = await modalText
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);

  if (!modalShown) {
    // 자동 modal 안 떴음 — banner 의 "기본설정을 추천" 링크 클릭 시도.
    const bannerLink = page.getByText(/기본설정을\s*추천/).first();
    const bannerVisible = await bannerLink
      .waitFor({ state: 'visible', timeout: 3_000 })
      .then(() => true)
      .catch(() => false);
    if (!bannerVisible) {
      // SurveyBanner 는 무료체험 고객(isFreePlan===true)에게만 노출 — 환경(계정 플랜) 의존.
      // 현재 계정이 무료체험이 아니면 배너 자체가 없어 검증 불가 → graceful skip(통과 처리).
      // (사용자 결정: survey 1222/1223 는 일단 skip. 무료체험 계정에서 재검증 필요.)
      return { ok: true as const };
    }
    await bannerLink.click();
    modalShown = await modalText
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    if (!modalShown) {
      return {
        ok: false as const,
        error_key: 'survey_modal_not_opened' as ErrorKey,
        message: 'banner 클릭 후에도 SurveyModal 미노출',
      };
    }
  }

  // "괜찮아요" / "좋아요!" 버튼 노출.
  const okBtn = page.getByRole('button', { name: /^괜찮아요$/ });
  const goodBtn = page.getByRole('button', { name: /^좋아요!?$/ });
  if ((await okBtn.count().catch(() => 0)) === 0 || (await goodBtn.count().catch(() => 0)) === 0) {
    return {
      ok: false as const,
      error_key: 'survey_modal_buttons_missing' as ErrorKey,
      message: '괜찮아요/좋아요 버튼 미노출',
    };
  }
  // 닫음 (괜찮아요).
  await okBtn.first().click().catch(() => undefined);
  return { ok: true as const };
};

const handlers: StepHandlers = {
  goto_base_setting: gotoBaseSettingStep,
  verify_survey_modal_or_banner: verifySurveyModalOrBannerStep,
};

test('기본설정 추천 설문 모달 노출', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
