/**
 * 윈들리 상품 상세 "기본 정보" 탭의 카테고리 드롭다운 조작 헬퍼.
 *
 * 의존성 정책 (CLAUDE.md (h)): @playwright/test 만 의존. lib/ 외부 import 없음.
 *
 * 용도: 카테고리가 비어(에러/빨강) 업로드 불가일 때, 카테고리 드롭다운을 열어
 *       검색어(예: 바지)로 검색 → 맨 위 결과를 선택해 카테고리를 채운다.
 *
 * UI 출처 (sesame):
 *   - InfoTab/index.tsx: 마켓별 카테고리 Dropdown (label "...카테고리", searchable)
 *   - Dropdown.tsx: 트리거 SelectedBox (status='error' 면 빨간 테두리)
 *   - Dropdown/Option/OptionGroup: 검색칸 placeholder "카테고리 검색하기",
 *     "검색 결과" 섹션 + Option(radio id `*_searchOption_*` + label[for])
 */

import type { Page } from '@playwright/test';
import { logger } from './logger';

const SEARCH_PLACEHOLDER = '카테고리 검색하기';

/** 검색칸에 keyword 입력 → 디바운스/검색 대기 → "검색 결과" 맨 위 항목 클릭. */
async function searchAndPickTop(page: Page, keyword: string): Promise<boolean> {
  const search = page.locator(`input[placeholder="${SEARCH_PLACEHOLDER}"]`).first();
  try {
    await search.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    logger.info('[category] 검색칸(카테고리 검색하기) 미노출 — 드롭다운이 안 열렸을 수 있음');
    return false;
  }
  await search.click({ timeout: 8_000 });
  await search.fill('');
  await search.pressSequentially(keyword, { delay: 20 });
  // 디바운스(300ms) + 검색 API + 렌더 여유.
  await page.waitForTimeout(1_800);

  // "검색 결과" 섹션의 맨 위 Option(label[for=*_searchOption_*]) 마킹.
  const marked = await page.evaluate(() => {
    const norm = (s: string | null): string => (s ?? '').trim();
    // "검색 중..." 이면 아직 대기.
    if (Array.from(document.querySelectorAll('*')).some((e) => norm(e.textContent) === '검색 중...')) {
      return 'loading';
    }
    const radios = Array.from(
      document.querySelectorAll('input[type="radio"]'),
    ) as HTMLInputElement[];
    const firstResult = radios.find((r) => /_searchOption_/.test(r.id));
    if (!firstResult) return 'none';
    const label = document.querySelector(`label[for="${CSS.escape(firstResult.id)}"]`);
    const clickTarget = label ?? firstResult.parentElement ?? firstResult;
    clickTarget.setAttribute('data-atc-cat-pick', '1');
    return 'ok';
  });

  if (marked === 'loading') {
    await page.waitForTimeout(2_000);
  }
  if (marked !== 'ok') {
    // 한 번 더 시도 (로딩 지연).
    const retry = await page.evaluate(() => {
      const radios = Array.from(
        document.querySelectorAll('input[type="radio"]'),
      ) as HTMLInputElement[];
      const firstResult = radios.find((r) => /_searchOption_/.test(r.id));
      if (!firstResult) return false;
      const label = document.querySelector(`label[for="${CSS.escape(firstResult.id)}"]`);
      const clickTarget = label ?? firstResult.parentElement ?? firstResult;
      clickTarget.setAttribute('data-atc-cat-pick', '1');
      return true;
    });
    if (!retry) return false;
  }

  await page.locator('[data-atc-cat-pick]').first().click({ timeout: 8_000 });
  await page.evaluate(() =>
    document.querySelector('[data-atc-cat-pick]')?.removeAttribute('data-atc-cat-pick'),
  );
  await page.waitForTimeout(1_500); // 적용 + 드롭다운 닫힘 + 상품 업데이트
  logger.info('[category] 검색 결과 맨 위 선택 완료');
  return true;
}

/**
 * 기본 정보 탭의 빨간(error) 마켓 카테고리 드롭다운 수를 센다 (수정 X, 마킹 X).
 *
 * 라벨 "...카테고리"(스마트스토어/쿠팡/...) 행의 트리거 <button>(SelectedBox)이
 * 빨간 테두리인 것만 카운트. `fixRedCategoriesBySearch` 의 탐지 로직과 동일 기준.
 *
 * @returns 빨간 카테고리 드롭다운 트리거 수. 0 이면 카테고리 정상.
 */
export async function countRedCategoryDropdowns(page: Page): Promise<number> {
  return page.evaluate(() => {
    const norm = (s: string | null): string => (s ?? '').trim();
    const isRed = (rgb: string): boolean => {
      const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (m === null) return false;
      return Number(m[1]) >= 180 && Number(m[2]) <= 110 && Number(m[3]) <= 110;
    };
    const isRedBorder = (el: Element): boolean => {
      const cs = window.getComputedStyle(el);
      return (
        isRed(cs.borderTopColor) ||
        isRed(cs.borderRightColor) ||
        isRed(cs.borderBottomColor) ||
        isRed(cs.borderLeftColor)
      );
    };
    const MARKET = /(스마트스토어|쿠팡|11번가|ESM|옥션|지마켓|롯데온|톡스토어|인터파크|위메프).*카테고리$/;
    const labels = Array.from(document.querySelectorAll('*')).filter(
      (el) => el.children.length === 0 && MARKET.test(norm(el.textContent)) && norm(el.textContent).length < 24,
    );
    let count = 0;
    for (const label of labels) {
      let row: Element | null = label.parentElement;
      for (let d = 0; d < 6 && row; d += 1) {
        const btn = row.querySelector('button');
        if (btn) {
          const redHere =
            isRedBorder(btn) || Array.from(btn.querySelectorAll('*')).some((c) => isRedBorder(c));
          if (redHere) count += 1;
          break;
        }
        row = row.parentElement;
      }
    }
    return count;
  });
}

/**
 * 기본 정보 탭의 빨간(error) 카테고리 드롭다운을 하나씩 열어 keyword 검색 →
 * 맨 위 결과 선택으로 채운다.
 * @returns 채운 카테고리 드롭다운 수.
 */
export async function fixRedCategoriesBySearch(page: Page, keyword: string): Promise<number> {
  let fixed = 0;
  for (let guard = 0; guard < 6; guard += 1) {
    // 빨간 카테고리 드롭다운 트리거 1개 마킹 (라벨 "...카테고리" + 빨간 테두리 트리거).
    const found = await page.evaluate(() => {
      const norm = (s: string | null): string => (s ?? '').trim();
      const isRed = (rgb: string): boolean => {
        const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (m === null) return false;
        return Number(m[1]) >= 180 && Number(m[2]) <= 110 && Number(m[3]) <= 110;
      };
      const isRedBorder = (el: Element): boolean => {
        const cs = window.getComputedStyle(el);
        return (
          isRed(cs.borderTopColor) ||
          isRed(cs.borderRightColor) ||
          isRed(cs.borderBottomColor) ||
          isRed(cs.borderLeftColor)
        );
      };
      // 마켓 카테고리 라벨의 행(row) 안 <button>(SelectedBox)이 빨간 테두리면 마킹.
      const MARKET = /(스마트스토어|쿠팡|11번가|ESM|옥션|지마켓|롯데온|톡스토어|인터파크|위메프).*카테고리$/;
      const labels = Array.from(document.querySelectorAll('*')).filter(
        (el) => el.children.length === 0 && MARKET.test(norm(el.textContent)) && norm(el.textContent).length < 24,
      );
      for (const label of labels) {
        let row: Element | null = label.parentElement;
        for (let d = 0; d < 6 && row; d += 1) {
          const btn = row.querySelector('button');
          if (btn) {
            const redHere =
              isRedBorder(btn) || Array.from(btn.querySelectorAll('*')).some((c) => isRedBorder(c));
            if (redHere && !btn.hasAttribute('data-atc-cat-done')) {
              btn.setAttribute('data-atc-cat-open', '1');
              return norm(label.textContent);
            }
            break; // 이 라벨의 트리거 버튼을 찾았으나 red 아님 → 다음 라벨로
          }
          row = row.parentElement;
        }
      }
      return null;
    });

    if (found === null) break;

    // 드롭다운 열기.
    const trigger = page.locator('[data-atc-cat-open]').first();
    await trigger.scrollIntoViewIfNeeded().catch(() => undefined);
    await trigger.click({ timeout: 8_000 }).catch(() => undefined);
    await page.waitForTimeout(800);

    const ok = await searchAndPickTop(page, keyword);

    // 처리 표시 (재시도 루프에서 같은 트리거 재선택 방지) + open 마크 제거.
    await page.evaluate(() => {
      const t = document.querySelector('[data-atc-cat-open]');
      if (t) {
        t.removeAttribute('data-atc-cat-open');
        t.setAttribute('data-atc-cat-done', '1');
      }
    });

    if (ok) fixed += 1;
    else break; // 결과 못 고름 → 무한루프 방지
  }
  // done 마크 정리.
  await page
    .evaluate(() =>
      document
        .querySelectorAll('[data-atc-cat-done]')
        .forEach((e) => e.removeAttribute('data-atc-cat-done')),
    )
    .catch(() => undefined);
  return fixed;
}
