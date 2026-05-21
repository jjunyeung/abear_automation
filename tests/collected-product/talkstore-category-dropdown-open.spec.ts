/**
 * 톡스토어 카테고리 Dropdown 열림 검증.
 *
 * 대응 ATC: atcs/collect/talkstore-category-dropdown-open.atc.yml
 * TC 원본: Case No 1086, 1087 (드롭다운 열림 부분) / 수집상품 › 톡스토어 › 기본정보 / P0
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
import {
  openFirstCollectedProductStep,
  clickTabByLabelStep,
} from './_talkstore-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'collected-product', 'talkstore-category-dropdown-open.atc.yml');

const openCategoryDropdownStep: StepHandler = async (page) => {
  // "톡스토어 카테고리" 텍스트 노드를 가진 element (Text component = span 또는 div).
  // 그 element 의 ancestor 중 FieldWrapper (자식에 button SelectedBox 가 있는 div) 찾기.
  const handle = await page.evaluateHandle(() => {
    const all = Array.from(document.querySelectorAll('*'));
    const labelElt = all.find((el) => {
      // 직접 textContent 가 정확히 "톡스토어 카테고리" 인 element (자식 element 없는 leaf 또는 단일 text node).
      if (el.children.length === 0 && el.textContent?.trim() === '톡스토어 카테고리') return true;
      return false;
    });
    if (!labelElt) return null;
    // ancestor chain 에서 button 자식을 가진 가장 가까운 element.
    let cur: Element | null = labelElt;
    while (cur) {
      const parent: Element | null = cur.parentElement;
      if (!parent) break;
      const btn = parent.querySelector('button') as HTMLElement | null;
      if (btn) return btn;
      cur = parent;
    }
    return null;
  });
  const btn = handle.asElement();
  if (!btn) {
    return {
      ok: false as const,
      error_key: 'talkstore_category_button_missing' as ErrorKey,
      message: '톡스토어 카테고리 Dropdown 버튼 매칭 X',
    };
  }
  await btn.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  // Dropdown SelectedBox 는 onMouseDown 으로 트리거. Playwright click() 으로 full mouse event 발사.
  await btn.click();
  await page.waitForTimeout(800);

  // 열림 검증 — searchPlaceholder="카테고리 검색하기" placeholder input 노출.
  const searchInput = page.getByPlaceholder(/카테고리\s*검색하기/).first();
  const opened = await searchInput
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (!opened) {
    return {
      ok: false as const,
      error_key: 'talkstore_category_dropdown_not_opened' as ErrorKey,
      message: '드롭다운 클릭 후 검색 input 미노출',
    };
  }
  // 다시 닫음 (esc 또는 dropdown 외부 클릭).
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_first_collected_product: openFirstCollectedProductStep,
  click_info_tab: clickTabByLabelStep(/^기본\s*정보$/),
  open_talkstore_category_dropdown: openCategoryDropdownStep,
};

test.skip('톡스토어 카테고리 Dropdown 열림', async ({ page }) => {
  // ⚠️ skip 사유: Dropdown.tsx 의 SelectedBox onMouseDown 트리거가 ancestor 매칭 fragile.
  // 톡스토어 카테고리 위 다른 마켓 카테고리 dropdown 들 + CategoryButtonGroup 의 button 들과
  // ancestor 안 button 검색이 충돌. uniqueKey="talkstore" 가 DOM 노출 안 됨.
  // 검증을 위해선 specific role/data-attribute 가 필요 — 코드 측 개선 또는 spec 별 inline xpath 필요.
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
