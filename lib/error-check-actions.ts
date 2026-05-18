/**
 * 윈들리 상품 상세의 에러체크 트리거 / 탭 dot 상태 읽기 공용 헬퍼.
 *
 * 의존성 정책 (CLAUDE.md (h)):
 *   - lib/ 는 atcs/ tests/ recoveries/ 어디도 import 하지 않음.
 *   - @playwright/test 만 의존.
 *   - 타입은 from-scratch 정의 또는 `lib/` 의 다른 파일.
 *
 * 사용처:
 *   - tests/error-check/product-error-fix.spec.ts
 *   - tests/error-check/trigger-error-check.spec.ts
 *   - 향후 추가될 에러체크 관련 spec.
 */

import type { Page } from '@playwright/test';

/** 윈들리 상품 상세의 7개 탭 (좌→우 순서). */
export const TAB_NAMES = [
  '기본 정보',
  '이미지',
  '옵션',
  '판매가',
  '상품 속성',
  '상세페이지',
  '업로드 설정',
] as const;

/** 윈들리 에러체크 버튼의 식별 시그니처 — Material Design check icon SVG path 시작 패턴.
 *  텍스트 없는 svg-only 아이콘 버튼이라 path d 속성 prefix 로 매치. */
const CHECKMARK_PATH_SIG = 'M9 16.17L4.83 12L3.41 13.41L9 19L21 7';

/** 탭 dot 색상 분류 결과. 'none' = dot 미감지. */
export type TabDotStatus = 'red' | 'yellow' | 'green' | 'none';

export interface TabStatus {
  name: string;
  status: TabDotStatus;
}

/**
 * 페이지 상단의 체크마크 svg 아이콘 버튼 클릭 (에러체크 트리거).
 *
 * @returns 버튼 발견 및 클릭 성공 여부.
 */
export async function clickErrorCheckButton(page: Page): Promise<boolean> {
  const idx = await page.evaluate((sig: string) => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (let i = 0; i < btns.length; i++) {
      const btn = btns[i];
      const r = btn.getBoundingClientRect();
      if (r.y > 80 || r.width === 0) continue;
      const text = (btn.textContent ?? '').trim();
      if (text.length > 0) continue;
      const svg = btn.querySelector('svg');
      if (svg === null) continue;
      if (svg.outerHTML.includes(sig)) return i;
    }
    return -1;
  }, CHECKMARK_PATH_SIG);
  if (idx < 0) return false;
  await page
    .locator('button')
    .nth(idx)
    .click({ timeout: 5_000 })
    .catch(() => undefined);
  await page.waitForTimeout(2_500);
  return true;
}

/**
 * 7개 탭의 dot 색상을 검사하여 status 배열 반환.
 *
 * - 빨간색 (R≥200, G≤110, B≤110): 에러
 * - 노란색 (R≥200, G≥150, B≤110): 경고
 * - 초록색 (R≤100, G≥150, B≤130): 정상
 * - none: dot 미감지 (에러체크 미실행 또는 dot 없음)
 *
 * 4~24px 박스만 dot 후보로 간주하여 일반 텍스트/아이콘 색상 오탐 방지.
 */
export async function readTabStatuses(page: Page): Promise<TabStatus[]> {
  const tabNames = [...TAB_NAMES];
  return page.evaluate((names: string[]) => {
    type Status = 'red' | 'yellow' | 'green' | 'none';
    const classify = (rgb: string): Status | null => {
      const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (m === null) return null;
      const r = Number(m[1]);
      const g = Number(m[2]);
      const b = Number(m[3]);
      const a = rgb.match(/rgba?\([^)]+,\s*([\d.]+)\)/);
      if (a !== null && Number(a[1]) < 0.1) return null;
      if (r >= 200 && g <= 110 && b <= 110) return 'red';
      if (r >= 200 && g >= 150 && b <= 110) return 'yellow';
      if (g >= 150 && r <= 100 && b <= 130) return 'green';
      return null;
    };
    return names.map((name) => {
      const tabBtn = Array.from(document.querySelectorAll('button')).find(
        (el) => (el.textContent ?? '').trim() === name,
      );
      if (tabBtn === undefined) return { name, status: 'none' as Status };
      const areas: Element[] = [tabBtn];
      if (tabBtn.parentElement !== null) {
        areas.push(tabBtn.parentElement);
        areas.push(...Array.from(tabBtn.parentElement.children));
      }
      areas.push(...Array.from(tabBtn.querySelectorAll('*')));
      let result: Status = 'none';
      for (const area of areas) {
        const all = [area, ...Array.from(area.querySelectorAll('*'))];
        for (const el of all) {
          const cs = window.getComputedStyle(el);
          const r = el.getBoundingClientRect();
          if (r.width < 4 || r.width > 24 || r.height < 4 || r.height > 24)
            continue;
          for (const colorVal of [
            cs.backgroundColor,
            cs.borderTopColor,
            cs.color,
            cs.fill ?? '',
          ]) {
            const c = classify(colorVal);
            if (c === null) continue;
            if (c === 'red') return { name, status: 'red' as Status };
            if (c === 'yellow') result = 'yellow';
            else if (c === 'green' && result === 'none') result = 'green';
          }
        }
      }
      return { name, status: result };
    });
  }, tabNames);
}

/** 7개 탭 status 의 빨/노/초/없음 카운트 합산. 검증/로그용 요약. */
export function summarizeTabStatuses(statuses: TabStatus[]): {
  red: number;
  yellow: number;
  green: number;
  none: number;
  total_classified: number;
} {
  const red = statuses.filter((s) => s.status === 'red').length;
  const yellow = statuses.filter((s) => s.status === 'yellow').length;
  const green = statuses.filter((s) => s.status === 'green').length;
  const none = statuses.filter((s) => s.status === 'none').length;
  return { red, yellow, green, none, total_classified: red + yellow + green };
}

/** 빨간 보더 input/textarea 의 위치 + 인접 라벨. 진단용 (수정 X). */
export interface RedFieldLocation {
  x: number;
  y: number;
  width: number;
  height: number;
  /** 라벨 텍스트 (못 찾으면 빈 문자열). */
  label: string;
  /** 'input' | 'textarea'. */
  tag: string;
  /** 현재 값 (앞 80자). */
  value: string;
}

/**
 * 현재 탭의 빨간 보더 input / textarea 들의 bounding box + 라벨을 read.
 * - 라벨 우선순위: id 매칭 label[for] > 직전 sibling 텍스트 > ancestor 의 직전 sibling 텍스트.
 */
export async function readRedFieldLocations(page: Page): Promise<RedFieldLocation[]> {
  return page.evaluate(() => {
    const isRedBorder = (rgb: string): boolean => {
      const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (m === null) return false;
      const r = Number(m[1]);
      const g = Number(m[2]);
      const b = Number(m[3]);
      return r >= 200 && g <= 110 && b <= 110;
    };
    const findLabel = (inp: HTMLElement): string => {
      const id = inp.id;
      if (id !== '') {
        const lbl = document.querySelector(`label[for="${id}"]`);
        const t = (lbl?.textContent ?? '').trim();
        if (t.length > 0 && t.length < 60) return t;
      }
      const prev = inp.previousElementSibling;
      if (prev !== null) {
        const t = (prev.textContent ?? '').trim();
        if (t.length > 0 && t.length < 60) return t;
      }
      let cur: HTMLElement | null = inp.parentElement;
      for (let i = 0; i < 4 && cur !== null; i++) {
        const sib = cur.previousElementSibling;
        if (sib !== null) {
          const t = (sib.textContent ?? '').trim();
          if (t.length > 0 && t.length < 60) return t;
        }
        cur = cur.parentElement;
      }
      return '';
    };
    const out: RedFieldLocation[] = [];
    const inputs = Array.from(
      document.querySelectorAll('input, textarea'),
    ) as HTMLInputElement[];
    for (const inp of inputs) {
      const cs = window.getComputedStyle(inp);
      const r = inp.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (!isRedBorder(cs.borderTopColor)) continue;
      out.push({
        x: Math.round(r.x),
        y: Math.round(r.y),
        width: Math.round(r.width),
        height: Math.round(r.height),
        label: findLabel(inp),
        tag: inp.tagName.toLowerCase(),
        value: (inp.value ?? '').slice(0, 80),
      });
    }
    return out;
  });
}
