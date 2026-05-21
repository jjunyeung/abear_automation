/**
 * 기본설정 > 톡스토어 시리즈 공유 step handlers.
 *
 * 다루는 ATC 들 (TC export Case 1015~1071):
 *   - talkstore-base-delivery-tab-visible.atc.yml (1015~1017)
 *   - talkstore-base-review-tab-visible.atc.yml  (1044)
 *   - talkstore-base-attribute-tab-visible.atc.yml (1066)
 *   - talkstore-base-product-tab-visible.atc.yml  (1069)
 *   - talkstore-base-as-phone-input.atc.yml      (1039, 1040, 1041, 1043)
 *   - talkstore-base-purchase-point-toggle.atc.yml (1046)
 *   - ...
 *
 * 코드 출처 (windly-frontend-web view3):
 *   src/features/BaseSetting/Talkstore/index.tsx                              → SideTab + TabPanel
 *   src/features/BaseSetting/Talkstore/constants.ts                           → 탭 라벨 (배송 정보 / 리뷰 포인트 / 상품 속성 / 상품 노출 및 판매)
 *   src/router.tsx basename="/view3", path "base-setting"                      → URL: app.windly.cc/view3/base-setting?setting=TALKSTORE&category=...
 */

import type { Page } from '@playwright/test';
import type { StepHandler } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';

const BASE_URL = 'https://app.windly.cc/view3/base-setting';

type TalkstoreCategory = 'DELIVERY_AND_AS' | 'REVIEW_POINT' | 'ATTRIBUTE' | 'PRODUCT_SETTING';

/**
 * 기본설정 > 톡스토어 진입 + 특정 카테고리 탭으로 직접 이동.
 * URL: /view3/base-setting?setting=TALKSTORE&category=<category>
 *
 * page render 까지 충분히 대기 — 탭 패널 안 form field 들이 그려질 시간.
 */
export function gotoTalkstoreBaseSettingStep(category: TalkstoreCategory): StepHandler {
  return async (page) => {
    const url = `${BASE_URL}?setting=TALKSTORE&category=${category}`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
    // body 안 텍스트 "톡스토어" 노출까지 대기 (SideTab 의 "톡스토어" 또는 panel title).
    await page
      .getByText(/톡스토어/)
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 })
      .catch(() => undefined);
    return { ok: true as const };
  };
}

/** TabPanel 의 panelTitle 노출 검증 — 탭별 라벨 확인. */
export function verifyTabPanelTitleStep(expectedTitle: RegExp): StepHandler {
  return async (page) => {
    const title = page.getByText(expectedTitle).first();
    try {
      await title.waitFor({ state: 'visible', timeout: 10_000 });
    } catch {
      return {
        ok: false as const,
        error_key: 'tab_panel_title_missing' as ErrorKey,
        message: `탭 패널 타이틀 미노출 (${expectedTitle.source})`,
      };
    }
    return { ok: true as const };
  };
}

/**
 * "전체 라벨 텍스트" 의 Toggle Label 을 찾아 input checkbox 클릭 + 상태 변화 검증 + 원상복귀.
 * Toggle.tsx 와 동일 패턴 (수집상품 _talkstore-handlers.toggleByLabelStep 과 동일).
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
        message: `토글 상태 변화 X (${labelTextPart})`,
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

/**
 * Field label 정확 일치 element 의 ancestor 안 input 검출. (view3 TextField 도 동일 패턴.)
 */
export async function findFieldInputByExactLabel(
  page: Page,
  labelExact: string,
): Promise<import('@playwright/test').ElementHandle<Element> | null> {
  const handle = await page.evaluateHandle((labelExact) => {
    // LabelBox 의 직접 text node 안 텍스트 = labelExact (또는 labelExact + ' *' labelRequired).
    // LabelBox 는 자체 element + child elements (Badge, Tooltip 등) 동거 가능.
    const all = Array.from(document.querySelectorAll('*'));
    const labelElt = all.find((el) => {
      // 직접 firstChild text node 의 trim 결과가 labelExact 와 동일/시작.
      for (const child of Array.from(el.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
          const t = (child.nodeValue ?? '').trim();
          if (t === labelExact) return true;
        }
      }
      return false;
    });
    if (!labelElt) return null;
    let cur: Element | null = labelElt;
    while (cur) {
      const parent: Element | null = cur.parentElement;
      if (!parent) break;
      const inp = parent.querySelector(
        'input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"])',
      ) as HTMLInputElement | null;
      if (inp) return inp;
      cur = parent;
    }
    return null;
  }, labelExact);
  return handle.asElement();
}

/** label 텍스트로 input 찾아 값 입력 + onBlur + 검증 + 원복. */
export function fillInputByLabelStep(labelExact: string, value: string, errorKeyPrefix: string): StepHandler {
  return async (page) => {
    const input = await findFieldInputByExactLabel(page, labelExact);
    if (!input) {
      return {
        ok: false as const,
        error_key: `${errorKeyPrefix}_input_not_found` as ErrorKey,
        message: `${labelExact} label 의 input 매칭 X`,
      };
    }
    const original = await input.evaluate((el) => (el as HTMLInputElement).value);
    // React controlled input — native setter + input/blur event.
    await input.evaluate((el, v) => {
      const inp = el as HTMLInputElement;
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
      nativeSetter.call(inp, v);
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('blur', { bubbles: true }));
    }, value);
    await page.waitForTimeout(800);
    const newValue = await input.evaluate((el) => (el as HTMLInputElement).value);
    if (newValue === '' || newValue === original) {
      return {
        ok: false as const,
        error_key: `${errorKeyPrefix}_value_not_reflected` as ErrorKey,
        message: `입력값 반영 X (target=${value}, after=${newValue})`,
      };
    }
    // 원복.
    await input.evaluate((el, v) => {
      const inp = el as HTMLInputElement;
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
      nativeSetter.call(inp, v);
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('blur', { bubbles: true }));
    }, original);
    await page.waitForTimeout(500);
    return { ok: true as const };
  };
}

/** placeholder substring 으로 input 검출 + 값 입력 + onBlur. */
export function fillInputByPlaceholderStep(placeholderRe: RegExp, value: string, errorKeyPrefix: string): StepHandler {
  return async (page) => {
    const input = page.getByPlaceholder(placeholderRe).first();
    try {
      await input.waitFor({ state: 'visible', timeout: 10_000 });
    } catch {
      return {
        ok: false as const,
        error_key: `${errorKeyPrefix}_input_not_found` as ErrorKey,
        message: `input placeholder 매칭 X (${placeholderRe.source})`,
      };
    }
    // 원래 값 backup.
    const original = await input.inputValue().catch(() => '');
    await input.fill(value);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    const newValue = await input.inputValue().catch(() => '');
    if (newValue === '') {
      return {
        ok: false as const,
        error_key: `${errorKeyPrefix}_value_not_reflected` as ErrorKey,
        message: `입력값 반영 X (${value} → ${newValue})`,
      };
    }
    // 원상복귀.
    await input.fill(original);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(400);
    return { ok: true as const };
  };
}
