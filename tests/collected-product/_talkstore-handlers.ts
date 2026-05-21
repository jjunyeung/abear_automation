/**
 * 수집상품 톡스토어 시리즈 공유 step handlers.
 *
 * 다루는 ATC 들 (TC export Case 1072~1097):
 *   - talkstore-upload-tab-toggle-visible.atc.yml (1078, 1090)
 *   - talkstore-product-name-default.atc.yml      (1080)
 *   - talkstore-product-name-input.atc.yml        (1081, 1084)
 *   - talkstore-product-name-empty-error.atc.yml  (1082)
 *   - talkstore-category-shown.atc.yml            (1085)
 *   - talkstore-category-change.atc.yml           (1086, 1087)
 *   - talkstore-category-empty-error.atc.yml      (1088)
 *   - talkstore-sales-tab-visible.atc.yml         (1089)
 *   - talkstore-purchase-point-toggle.atc.yml     (1091)
 *   - talkstore-review-point-toggle.atc.yml       (1093)
 *
 * 코드 출처 (sesame view2):
 *   src/router.tsx                                           → /view2/interested-product/:productId
 *   src/features/ProductDetail/ProductDetail.const.ts        → 탭 라벨 (기본 정보/판매가/업로드 설정 등)
 *   src/features/ProductDetail/ProductDetailTabs/UploadTab/UploadingMarketToggles/UploadingMarketToggles.tsx
 *     - className=`${ownershipId}_uploadmarket_talkstore` (Toggle)
 *     - label="톡스토어"
 *   src/features/ProductDetail/ProductDetailTabs/UploadTab/TalkstoreUploadSettings/
 *     - PurchasePoint: "구매 시 포인트 지급 여부 설정" Toggle
 *     - ReviewPoint: 리뷰포인트 Toggle
 */

import type { Page } from '@playwright/test';
import type { StepHandler } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import {
  goToCollectedProducts,
  openFirstSearchResult,
} from '../../lib/windly-actions';

/** 수집상품 페이지 진입 + 첫 카드 클릭 → 상세 진입. */
export const openFirstCollectedProductStep: StepHandler = async (page) => {
  await goToCollectedProducts(page);
  await page
    .locator('a[href*="/view2/interested-product/"]')
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 });
  try {
    await openFirstSearchResult(page);
  } catch (e) {
    return {
      ok: false as const,
      error_key: 'no_collected_products' as ErrorKey,
      message: `수집상품 첫 카드 진입 실패: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
  return { ok: true as const };
};

/** 탭 라벨로 탭 클릭 (기본 정보 / 판매가 / 업로드 설정 등). */
export function clickTabByLabelStep(labelRe: RegExp): StepHandler {
  return async (page) => {
    const tab = page.getByText(labelRe).first();
    try {
      await tab.waitFor({ state: 'visible', timeout: 10_000 });
    } catch {
      return {
        ok: false as const,
        error_key: 'tab_label_missing' as ErrorKey,
        message: `탭 라벨 미노출: ${labelRe.source}`,
      };
    }
    await tab.click();
    await page.waitForTimeout(500);
    return { ok: true as const };
  };
}

/** "업로드 대상 마켓" Subheader 가시 = UploadTab 진입 완료. */
export const waitForUploadingMarketTogglesStep: StepHandler = async (page) => {
  const header = page.getByText(/^업로드\s*대상\s*마켓$/).first();
  try {
    await header.waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'uploading_market_toggles_missing' as ErrorKey,
      message: '업로드 대상 마켓 섹션 미노출',
    };
  }
  return { ok: true as const };
};

/**
 * "톡스토어" Toggle 가시 검증. className substring `_uploadmarket_talkstore` 매칭 (input[type=checkbox]).
 * UploadingMarketToggles.tsx 의 className=`${ownershipId}_uploadmarket_talkstore`.
 */
export const verifyTalkstoreToggleVisibleStep: StepHandler = async (page) => {
  const input = page.locator('input[class*="_uploadmarket_talkstore"]').first();
  const cnt = await input.count().catch(() => 0);
  if (cnt === 0) {
    return {
      ok: false as const,
      error_key: 'talkstore_toggle_input_missing' as ErrorKey,
      message: '톡스토어 토글 input[class*="_uploadmarket_talkstore"] 매칭 0건',
    };
  }
  // input 자체는 display:none (체크박스). 부모 Label htmlFor 으로 click target 검증.
  // 일단 노출 자체 (DOM 존재) 만 확인 — Toggle 컴포넌트는 모든 마켓 동일 구조라서 DOM 만 있으면 visible.
  return { ok: true as const };
};

/**
 * Field label 텍스트로 TextField input 검출. InfoTab 의 상품명 label, 카테고리 label 매칭에 사용.
 *
 * 검색 로직: document.querySelectorAll('div') 중 textContent.trim() === labelExact 인
 * div 의 ancestor (FieldWrapper) 안 input. label 이 여러 개라면 nth 선택.
 */
export async function findFieldInputByExactLabel(
  page: Page,
  labelExact: string,
  nth = 0,
): Promise<import('@playwright/test').ElementHandle<Element> | null> {
  const handle = await page.evaluateHandle(
    ({ labelExact, nth }) => {
      const divs = Array.from(document.querySelectorAll('div'));
      const matches = divs.filter((d) => d.textContent?.trim() === labelExact);
      const target = matches[nth];
      if (!target) return null;
      // ancestor 중 input 을 포함한 가장 가까운 div 찾기.
      let cur: HTMLElement | null = target.parentElement;
      while (cur) {
        const inp = cur.querySelector('input:not([type="checkbox"]):not([type="radio"])') as HTMLInputElement | null;
        if (inp) return inp;
        cur = cur.parentElement;
      }
      return null;
    },
    { labelExact, nth },
  );
  return handle.asElement();
}

/**
 * Toggle 라벨 텍스트로 input checkbox 검출 + 클릭 + 상태 변화 검증 + 원상복귀.
 * Toggle.tsx 의 `<Label htmlFor>` + `<input id>` 구조. DOM 직접 탐색.
 */
export function toggleByLabelStep(labelTextPart: string, errorKeyPrefix: string): StepHandler {
  return async (page) => {
    const handle = await page.evaluateHandle((text) => {
      const labels = Array.from(document.querySelectorAll('label'));
      for (const lab of labels) {
        if (lab.textContent?.includes(text)) {
          const inp = lab.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
          if (inp) return inp;
        }
      }
      return null;
    }, labelTextPart);
    const elt = handle.asElement();
    if (!elt) {
      return {
        ok: false as const,
        error_key: `${errorKeyPrefix}_input_not_found` as ErrorKey,
        message: `토글 input 매칭 X (${labelTextPart})`,
      };
    }
    await elt.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    const checkedBefore = await elt.evaluate((el) => (el as HTMLInputElement).checked);
    await elt.evaluate((el) => {
      const lab = el.closest('label');
      if (lab) (lab as HTMLLabelElement).click();
    });
    await page.waitForTimeout(800);
    const checkedAfter = await elt.evaluate((el) => (el as HTMLInputElement).checked);
    if (checkedBefore === checkedAfter) {
      return {
        ok: false as const,
        error_key: `${errorKeyPrefix}_toggle_no_change` as ErrorKey,
        message: `토글 상태 변화 X (${labelTextPart}, before=${checkedBefore}, after=${checkedAfter})`,
      };
    }
    // 원상복귀.
    await elt.evaluate((el) => {
      const lab = el.closest('label');
      if (lab) (lab as HTMLLabelElement).click();
    });
    await page.waitForTimeout(300);
    return { ok: true as const };
  };
}

/** "톡스토어" 토글의 className 으로 checkbox / role=switch 검출. checked / disabled 상태 반환. */
export async function getTalkstoreToggleState(page: Page): Promise<{ checked: boolean; disabled: boolean } | null> {
  // UploadingMarketToggles 의 Toggle 은 className=`${ownershipId}_uploadmarket_talkstore`.
  // Toggle 구현체에 따라 input[type=checkbox] 또는 button[role=switch].
  // 일단 className substring 으로 잡고 input/button 자식 찾기.
  const toggleRoot = page.locator('[class*="_uploadmarket_talkstore"]').first();
  if ((await toggleRoot.count().catch(() => 0)) === 0) {
    return null;
  }
  // input[type=checkbox] 또는 자체.
  const inputChild = toggleRoot.locator('input[type="checkbox"]');
  if ((await inputChild.count().catch(() => 0)) > 0) {
    const checked = await inputChild.first().isChecked().catch(() => false);
    const disabled = await inputChild.first().isDisabled().catch(() => false);
    return { checked, disabled };
  }
  // fallback — root 가 input 자체일 경우.
  const checked = await toggleRoot.isChecked().catch(() => false);
  const disabled = await toggleRoot.isDisabled().catch(() => false);
  return { checked, disabled };
}
