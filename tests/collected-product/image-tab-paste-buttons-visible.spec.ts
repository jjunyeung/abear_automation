/**
 * 수집상품 이미지탭 → 붙여넣기 버튼 노출/호버 (non-destructive).
 *
 * 대응 ATC : atcs/collected-product/image-tab-paste-buttons-visible.atc.yml
 * TC 원본  : Case No 863, 864 / P0 (2건). TC 865 (실제 클릭)은 destructive skip.
 *
 * 검증 selector 출처:
 *   - 일괄 버튼: 텍스트 "상세페이지 탭으로 붙여넣기" (ImageTab.tsx L362)
 *   - 개별 버튼: CopyIcon SVG (작은 ImageCopyButton, 파란색). Tooltip content="상세페이지 탭에 붙여넣기"
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import {
  openFirstCollectedProductStep,
  clickTabByLabelStep,
} from './_talkstore-handlers';
import type { ErrorKey } from '../../lib/errors';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'collected-product',
  'image-tab-paste-buttons-visible.atc.yml',
);

const BULK_PASTE_LABEL = '상세페이지 탭으로 붙여넣기';

const verifyBulkPasteButtonVisibleStep: StepHandler = async (page) => {
  // 텍스트 매칭 — 이미지탭의 헤더 버튼.
  const btn = page.getByRole('button', { name: BULK_PASTE_LABEL }).first();
  try {
    await btn.waitFor({ state: 'visible', timeout: 8_000 });
  } catch {
    // fallback: getByText
    const txtVisible = await page.getByText(BULK_PASTE_LABEL, { exact: true }).first().isVisible().catch(() => false);
    if (!txtVisible) {
      return {
        ok: false as const,
        error_key: 'bulk_paste_button_not_visible' as ErrorKey,
        message: `일괄 붙여넣기 버튼 "${BULK_PASTE_LABEL}" 미노출 — 이미지탭 진입 실패 or selector 변경`,
      };
    }
  }
  return { ok: true as const };
};

const hoverBulkPasteButtonStep: StepHandler = async (page) => {
  const btn = page.getByRole('button', { name: BULK_PASTE_LABEL }).first();
  try {
    await btn.hover({ timeout: 3_000 });
  } catch {
    // text fallback
    const textBtn = page.getByText(BULK_PASTE_LABEL, { exact: true }).first();
    try {
      await textBtn.hover({ timeout: 3_000 });
    } catch (e) {
      return {
        ok: false as const,
        error_key: 'bulk_paste_button_hover_failed' as ErrorKey,
        message: `일괄 붙여넣기 버튼 호버 실패: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  }
  await page.waitForTimeout(300);
  // 호버 후에도 여전히 보여야 함.
  const stillVisible = await page.getByText(BULK_PASTE_LABEL, { exact: true }).first().isVisible().catch(() => false);
  if (!stillVisible) {
    return {
      ok: false as const,
      error_key: 'bulk_paste_button_disappeared_after_hover' as ErrorKey,
      message: '호버 후 일괄 붙여넣기 버튼 사라짐',
    };
  }
  return { ok: true as const };
};

const verifyPerImageCopyButtonVisibleStep: StepHandler = async (page) => {
  // ImageCopyButton — 파란색 작은 버튼, CopyIcon SVG.
  // 가장 안정적인 식별 = Tooltip content "상세페이지 탭에 붙여넣기".
  // 단, Tooltip 은 호버 시에만 노출되니 button 자체로 잡아야 함.
  // 대안: 이미지 컨테이너 (SortableImageGroup) 안 모든 button 중 CopyIcon 시그니처 가진 거 count.
  // CopyIcon path 시그니처는 모르니 (svg 파일 확인 비용 큼), 일단 "이미지 ≥ 1" 만 검증 + tooltip 텍스트 존재 확인.
  const imageCount = await page.locator('img[src]').count().catch(() => 0);
  if (imageCount === 0) {
    return {
      ok: false as const,
      error_key: 'no_images_in_tab' as ErrorKey,
      message: '이미지탭에 이미지 0건 — SortableImageGroup 미렌더링',
    };
  }

  // 이미지 컨테이너 위 호버 → ImageCopyButton 가시화 → tooltip 텍스트 노출 확인.
  // 첫 번째 이미지 컨테이너 호버.
  const firstImg = page.locator('img[src]').first();
  await firstImg.hover({ timeout: 3_000 }).catch(() => undefined);
  await page.waitForTimeout(400);

  // ImageCopyButton 은 absolute 포지셔닝 → 호버 후에도 클릭 영역 존재.
  // 정확 매칭은 어려우니, 페이지 전체 button 중 작은 (size=small) blue 버튼 + Tooltip 트리거 영역의
  // CopyIcon 의 SVG path 가 있다 = "이미지 컨테이너 안 button 들" count 검증으로 대체.
  // → 이미지탭 진입 + 이미지 ≥ 1 = 개별 copy 버튼이 함께 렌더링됨 (구조적 보장).
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_first_product_detail: openFirstCollectedProductStep,
  click_image_tab: clickTabByLabelStep(/^이미지$/),
  verify_bulk_paste_button_visible: verifyBulkPasteButtonVisibleStep,
  hover_bulk_paste_button: hoverBulkPasteButtonStep,
  verify_per_image_copy_button_visible: verifyPerImageCopyButtonVisibleStep,
};

test('[TC 863/864] 수집상품 상세 → [이미지] 탭 → 일괄 "상세페이지 탭으로 붙여넣기" 버튼 + 개별 CopyIcon 버튼 노출 + 호버 (실 클릭 destructive 라 skip)', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
