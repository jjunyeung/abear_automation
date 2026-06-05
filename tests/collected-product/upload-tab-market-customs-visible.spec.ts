/**
 * 수집상품 상세 → 업로드 설정 탭 → 업로드 대상 마켓 토글 + 관부가세 설정 영역 노출 (non-destructive).
 *
 * 대응 ATC : atcs/collected-product/upload-tab-market-customs-visible.atc.yml
 * TC 원본  : Case No 3499, 3500, 3515, 3516 / P0 (4건).
 *            토글 변경(3501) / 관부가세 옵션 변경(3517) 은 서버 onUpdateProduct 호출 destructive 라 skip.
 *
 * 코드 출처:
 *   - sesame/.../UploadTab/UploadingMarketToggles/UploadingMarketToggles.tsx
 *       Subheader title="업로드 대상 마켓" + 마켓별 Toggle (input class*="_uploadmarket_<key>")
 *   - sesame/.../UploadTab/CommonUploadSettings/CustomsTax/index.tsx
 *       Subheader title="관부가세 설정" + SegmentedButton 3개
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import {
  openFirstCollectedProductStep,
  clickTabByLabelStep,
  waitForUploadingMarketTogglesStep,
} from './_talkstore-handlers';
import type { ErrorKey } from '../../lib/errors';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'collected-product',
  'upload-tab-market-customs-visible.atc.yml',
);

const CUSTOMS_SECTION_TITLE = '관부가세 설정';
const CUSTOMS_TAX_OPTIONS = ['부과 대상 아님', '관부가세 포함', '관부가세 미포함'];

// [TC 3499] 업로드 대상 마켓 Subheader + 마켓 토글 input 1개 이상 노출.
const verifyMarketTogglesVisibleStep: StepHandler = async (page) => {
  const header = page.getByText(/^업로드\s*대상\s*마켓$/).first();
  if (!(await header.isVisible().catch(() => false))) {
    return {
      ok: false as const,
      error_key: 'upload_market_subheader_missing' as ErrorKey,
      message: '업로드 대상 마켓 Subheader 미노출',
    };
  }
  const toggleCount = await page
    .locator('input[class*="_uploadmarket_"]')
    .count()
    .catch(() => 0);
  if (toggleCount < 1) {
    return {
      ok: false as const,
      error_key: 'upload_market_toggles_missing' as ErrorKey,
      message: `마켓 토글 input[class*="_uploadmarket_"] 0건 (기대 ≥1)`,
    };
  }
  return { ok: true as const };
};

// [TC 3500] 마켓 토글들이 checked/disabled 속성으로 활성/비활성 상태를 구분 표시.
const verifyMarketToggleStatesStep: StepHandler = async (page) => {
  const stats = await page.evaluate(() => {
    const inputs = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[class*="_uploadmarket_"]'),
    );
    return {
      total: inputs.length,
      // checked/disabled 는 DOM 속성으로 항상 읽을 수 있어야 상태 구분이 가능.
      hasStateAttributes: inputs.every(
        (el) => typeof el.checked === 'boolean' && typeof el.disabled === 'boolean',
      ),
    };
  });
  if (stats.total < 1 || !stats.hasStateAttributes) {
    return {
      ok: false as const,
      error_key: 'upload_market_toggle_state_unreadable' as ErrorKey,
      message: `토글 상태 속성 판독 불가 (total=${stats.total})`,
    };
  }
  return { ok: true as const };
};

// [TC 3515] 관부가세 설정 Subheader 노출.
const verifyCustomsTaxSectionStep: StepHandler = async (page) => {
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (!bodyText.includes(CUSTOMS_SECTION_TITLE)) {
    return {
      ok: false as const,
      error_key: 'customs_tax_section_missing' as ErrorKey,
      message: `${CUSTOMS_SECTION_TITLE} 섹션 미노출`,
    };
  }
  return { ok: true as const };
};

// [TC 3516] 관부가세 옵션 3개 모두 노출.
const verifyCustomsTaxOptionsStep: StepHandler = async (page) => {
  const bodyText = await page.evaluate(() => document.body.innerText);
  const missing = CUSTOMS_TAX_OPTIONS.filter((opt) => !bodyText.includes(opt));
  if (missing.length > 0) {
    return {
      ok: false as const,
      error_key: 'customs_tax_options_missing' as ErrorKey,
      message: `관부가세 옵션 누락: ${missing.join(' / ')}`,
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_first_product_detail: openFirstCollectedProductStep,
  click_upload_tab: clickTabByLabelStep(/^업로드 설정$/),
  wait_uploading_market_toggles: waitForUploadingMarketTogglesStep,
  verify_market_toggles_visible: verifyMarketTogglesVisibleStep,
  verify_market_toggle_states: verifyMarketToggleStatesStep,
  verify_customs_tax_section: verifyCustomsTaxSectionStep,
  verify_customs_tax_options: verifyCustomsTaxOptionsStep,
};

test('[TC 3499/3500/3515/3516] 수집상품 상세 → [업로드 설정] 탭 → "업로드 대상 마켓" 토글 + "관부가세 설정" 3 옵션 노출 (변경 액션은 destructive 라 skip)', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
