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
  // Dropdown DOM (sesame components/atoms/Dropdown/Dropdown.tsx):
  //   <DropdownContainer>
  //     <LabelBox>톡스토어 카테고리</LabelBox>          (styled(Box) = div)
  //     <DropdownInnerContainer>
  //       <SelectedBox onMouseDown>...</SelectedBox>     (styled.button — 컨테이너당 유일 button)
  //   </DropdownContainer>
  // 기존 버그: label 에서 ancestor 를 올라가며 첫 button 을 찾으면 위쪽 다른 마켓
  //          dropdown / CategoryButtonGroup 버튼과 충돌. → LabelBox 의 부모(DropdownContainer)
  //          로 정확히 좁힌 뒤 그 안 단일 button 만 잡는다.
  // caution 상태면 LabelBox 안에 CategoryCautionGuideButton("사용 가이드") 가 추가로 렌더되어
  // querySelector('button') 가 그 가이드 버튼을 잡을 수 있다. SelectedBox 는 width:100% 풀폭 button
  // 이므로 DropdownContainer 안 button 중 가장 넓은 것을 고른다.
  const handle = await page.evaluateHandle(() => {
    const candidates = Array.from(document.querySelectorAll('*')).filter((el) => {
      const t = (el.textContent || '').trim();
      return t.startsWith('톡스토어 카테고리') && t.length < 30;
    });
    let labelBox: Element | null = null;
    let minLen = Infinity;
    for (const el of candidates) {
      const len = (el.textContent || '').trim().length;
      if (len < minLen) {
        minLen = len;
        labelBox = el;
      }
    }
    const container = labelBox?.parentElement; // DropdownContainer
    if (!container) return null;
    const btns = Array.from(container.querySelectorAll('button')) as HTMLElement[];
    if (btns.length === 0) return null;
    btns.sort((a, b) => b.offsetWidth - a.offsetWidth); // SelectedBox = 풀폭
    return btns[0];
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

  // 마켓별 카테고리 dropdown 들이 모두 "카테고리 검색하기" 검색 input 을 DOM 에 갖고 있고
  // 닫힌 것은 hidden 이다. 따라서 .first() 로는 안 되고, 클릭으로 "visible 한 검색 input 이
  // 새로 생기는지" 로 판정한다 (열림 = talkstore 것이 visible 로 전환).
  const visibleSearchCount = () =>
    page.locator('input[placeholder*="카테고리 검색"]:visible').count();
  const before = await visibleSearchCount();

  // Dropdown SelectedBox 는 onMouseDown 으로 트리거.
  await btn.dispatchEvent('mousedown');
  await page.waitForTimeout(1_000);

  let after = await visibleSearchCount();
  if (after <= before) {
    // mousedown 만으로 안 열리면 click 으로 재시도.
    await btn.click().catch(() => undefined);
    await page.waitForTimeout(1_000);
    after = await visibleSearchCount();
  }
  const opened = after > before;
  if (!opened) {
    return {
      ok: false as const,
      error_key: 'talkstore_category_dropdown_not_opened' as ErrorKey,
      message: `드롭다운 클릭 후 visible 검색 input 증가 없음 (before=${before}, after=${after})`,
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

test('톡스토어 카테고리 Dropdown 열림', async ({ page }) => {
  // LabelBox 부모(DropdownContainer) 스코프로 talkstore dropdown 의 SelectedBox 만 정확히 클릭하도록
  // openCategoryDropdownStep 을 수정 → 기존 ancestor 충돌 해소. (이전 skip 사유 해결)
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
