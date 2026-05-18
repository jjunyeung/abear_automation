/**
 * 윈들리 상품 상세의 탭 에러 자동 수정 — 모든 탭에 동일 패턴 적용 가능.
 *
 * 윈들리 UI 패턴 (사용자 가이드):
 *   - 빨간 탭 클릭 → 탭 하단/상단에 에러 배너 메시지 노출.
 *   - 에러 배너 형식 예: "[11번가-국내] 기본 배송비는 7,000원 이하로 입력해주세요."
 *   - 에러가 있는 input/textbox 에는 빨간 보더 + 빨간 ⊘ 아이콘.
 *   - hover 시 툴팁 노출.
 *
 * 이 모듈은 아래 패턴의 에러를 자동 수정한다:
 *   - "X는 N원 이하로 입력해주세요"  → 해당 input 을 N (또는 N-1) 로 set
 *   - "X는 N원 이상으로 입력해주세요"  → 해당 input 을 N 로 set
 *   - "X를 입력해주세요" / "X를 선택해주세요"  → 가까이 있는 "AI 추천" / "자동" 버튼 클릭
 *
 * 위 패턴 외는 throw → runner 가 D12 로 1 회 실패 처리.
 */

import type { Locator, Page } from '@playwright/test';
import { logger } from './logger';

export interface TabError {
  /** 원본 에러 메시지. */
  raw: string;
  /** 마켓명 (없을 수 있음). */
  market: string;
  /** 필드 라벨 또는 동작 대상 버튼명. */
  fieldLabel: string;
  /** max=한도 초과 / min=한도 부족 / missing=빈 필드 / click_button=버튼 클릭 요청 / unknown */
  kind: 'max' | 'min' | 'missing' | 'click_button' | 'unknown';
  /** 한도 또는 목표 값 (max/min 일 때). */
  limit: number | null;
  /** 단위 ("원", "개", ...). */
  unit: string;
}

/** kind != 'unknown' AND fieldLabel 이 있으면 자동 수정 패턴 있음 (실제 fix 가능 여부는 별도 — 라벨↔input 매칭이 가능해야 함). */
export function isAutoFixablePattern(err: TabError): boolean {
  return err.kind !== 'unknown' && err.fieldLabel.length > 0;
}

function parseTabErrorBanner(text: string): TabError {
  const raw = text.trim();
  const result: TabError = {
    raw,
    market: '',
    fieldLabel: '',
    kind: 'unknown',
    limit: null,
    unit: '',
  };

  // [<market>] prefix 추출.
  let body = raw;
  const mMarket = body.match(/^\[([^\]]+)\]\s*/);
  if (mMarket !== null) {
    result.market = mMarket[1];
    body = body.slice(mMarket[0].length);
  }

  // 패턴: "<field>(는)? <N><unit> 이하로 입력해주세요" — non-greedy field.
  const mMax = body.match(
    /^(.+?)\s*는?\s*([\d,]+)\s*([가-힣]*)\s*이하로?\s*입력해주세요/,
  );
  if (mMax !== null) {
    result.fieldLabel = mMax[1].trim().replace(/는$/, '').trim();
    result.limit = Number(mMax[2].replace(/,/g, ''));
    result.unit = mMax[3] ?? '';
    result.kind = 'max';
    return result;
  }

  // "<field>(는)? <N><unit> 이상으로 입력해주세요"
  const mMin = body.match(
    /^(.+?)\s*는?\s*([\d,]+)\s*([가-힣]*)\s*이상으로?\s*입력해주세요/,
  );
  if (mMin !== null) {
    result.fieldLabel = mMin[1].trim().replace(/는$/, '').trim();
    result.limit = Number(mMin[2].replace(/,/g, ''));
    result.unit = mMin[3] ?? '';
    result.kind = 'min';
    return result;
  }

  // "<field>(을|를) (입력|선택|설정)해주세요"
  const mMissing = body.match(/^(.+?)\s*(을|를)\s*(입력|선택|설정)해주세요/);
  if (mMissing !== null) {
    result.fieldLabel = mMissing[1].trim();
    result.kind = 'missing';
    return result;
  }

  // "<button> 버튼을 눌러 ... (확인|처리|수정)해 주세요"
  const mClick = body.match(/^(.+?)\s*버튼을?\s*눌러/);
  if (mClick !== null) {
    result.fieldLabel = mClick[1].trim();
    result.kind = 'click_button';
    return result;
  }

  return result;
}

/**
 * 탭 클릭 → 에러 배너 모두 수집 → 파싱.
 * 반환: 페이지에 표시된 에러 배너의 파싱 결과 리스트.
 */
export async function readBannerErrors(page: Page): Promise<TabError[]> {
  // 빨간 배너는 빨간 ⊘ 아이콘 + 빨간 보더/배경 + 안내 텍스트. 일반 도움말 텍스트와
  // 구분하기 위해 (a) 가까이에 빨간색 element 가 있고 (b) 정확히 "입력해주세요" /
  // "선택해주세요" 로 끝나거나 "이하로/이상으로" 패턴 포함 — 둘 다 만족해야 함.
  const candidates = await page.evaluate(() => {
    const isRed = (rgb: string): boolean => {
      const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (m === null) return false;
      const r = Number(m[1]);
      const g = Number(m[2]);
      const b = Number(m[3]);
      return r >= 200 && g <= 130 && b <= 130;
    };
    const out: string[] = [];
    const all = Array.from(document.querySelectorAll('*')) as HTMLElement[];
    for (const el of all) {
      const txt = (el.textContent ?? '').trim();
      if (txt.length < 10 || txt.length > 150) continue;
      // leaf-ish (자식 4개 이하).
      if (el.children.length > 4) continue;
      // 정확한 에러 패턴 (안내 문구 회피).
      if (
        !/(?:이하로?|이상으로?|을|를)\s*입력해주세요\s*\.?\s*$|선택해주세요\s*\.?\s*$|설정해주세요\s*\.?\s*$|확인해\s*주세요\s*\.?\s*$|버튼을?\s*눌러/.test(
          txt,
        )
      )
        continue;
      // 자기 자신 또는 가까운 ancestor / sibling 에 빨간 element 존재 확인.
      let hasRed = false;
      let cur: HTMLElement | null = el;
      for (let i = 0; i < 4 && cur !== null && !hasRed; i++) {
        const cs = window.getComputedStyle(cur);
        if (
          isRed(cs.backgroundColor) ||
          isRed(cs.borderTopColor) ||
          isRed(cs.color)
        ) {
          hasRed = true;
          break;
        }
        // 자식 중 빨간 요소 (e.g., ⊘ 아이콘) 검사.
        const descendants = Array.from(cur.querySelectorAll('*')) as HTMLElement[];
        for (const d of descendants) {
          const r = d.getBoundingClientRect();
          if (r.width < 4 || r.width > 24 || r.height < 4 || r.height > 24) continue;
          const dcs = window.getComputedStyle(d);
          if (
            isRed(dcs.backgroundColor) ||
            isRed(dcs.color) ||
            isRed(dcs.fill ?? '') ||
            isRed(dcs.borderTopColor)
          ) {
            hasRed = true;
            break;
          }
        }
        cur = cur.parentElement;
      }
      if (!hasRed) continue;
      out.push(txt);
    }
    return Array.from(new Set(out));
  });

  return candidates.map(parseTabErrorBanner);
}

/**
 * 라벨로 식별되는 input 찾기. 라벨 element 의 형제/부모 안에서 input 검색.
 * @returns red-bordered/⊘ 표시된 input 우선.
 */
async function findInputByLabel(page: Page, fieldLabel: string): Promise<Locator | null> {
  // 라벨 텍스트와 정확히 일치하는 element 찾고, 가까운 input 으로 이동.
  const result = await page.evaluate((label: string) => {
    const labels = Array.from(document.querySelectorAll('*')) as HTMLElement[];
    const matching = labels.filter(
      (el) => (el.textContent ?? '').trim() === label && el.children.length === 0,
    );
    if (matching.length === 0) return null;

    // 빨간 보더가 있는 input 을 우선.
    const isRedBorder = (el: HTMLElement): boolean => {
      const cs = window.getComputedStyle(el);
      const bc = cs.borderTopColor;
      const m = bc.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (m === null) return false;
      const r = Number(m[1]);
      const g = Number(m[2]);
      const b = Number(m[3]);
      return r >= 200 && g <= 110 && b <= 110;
    };

    const candidatesRanked: { selector: string; redBorder: boolean }[] = [];
    for (const lbl of matching) {
      // 라벨의 ancestor (~6 단계) 안에서 input 모두 수집.
      let cur: HTMLElement | null = lbl;
      const inputs: HTMLInputElement[] = [];
      for (let i = 0; i < 6 && cur !== null; i++) {
        const found = Array.from(cur.querySelectorAll('input, textarea')) as HTMLInputElement[];
        for (const inp of found) {
          if (!inputs.includes(inp)) inputs.push(inp);
        }
        cur = cur.parentElement;
        if (inputs.length > 0) break;
      }
      for (const inp of inputs) {
        // 고유 식별자: data-id 부여.
        const uniq = `__atc_inp_${Math.random().toString(36).slice(2)}`;
        inp.setAttribute('data-atc-target', uniq);
        candidatesRanked.push({
          selector: `[data-atc-target="${uniq}"]`,
          redBorder: isRedBorder(inp),
        });
      }
    }
    // 빨간 보더 우선.
    candidatesRanked.sort((a, b) => Number(b.redBorder) - Number(a.redBorder));
    return candidatesRanked.length > 0 ? candidatesRanked[0].selector : null;
  }, fieldLabel);

  if (result === null) return null;
  return page.locator(result).first();
}

/**
 * 글자수 초과 카운터 (X/Y자 + X > Y) 검출 + 자동 trim. 빨간 배너 없이도 인라인 카운터만 있는 케이스 대응.
 * @returns 수정한 input 개수.
 */
async function fixOverLimitCounters(page: Page): Promise<number> {
  const counters = page.getByText(/^\d+\s*\/\s*\d+자$/);
  const total = await counters.count();
  let fixed = 0;
  for (let i = 0; i < total; i++) {
    const c = counters.nth(i);
    const text = (await c.innerText().catch(() => '')).trim();
    const m = text.match(/^(\d+)\s*\/\s*(\d+)자$/);
    if (m === null) continue;
    const current = Number(m[1]);
    const limit = Number(m[2]);
    if (Number.isNaN(current) || Number.isNaN(limit) || current <= limit) continue;
    // 카운터 부모 row 의 textbox.
    const tb = c.locator('xpath=ancestor::*[1]').locator('input[type="text"], textarea').first();
    if ((await tb.count()) === 0) continue;
    const value = (await tb.inputValue().catch(() => '')) || '';
    if (value.length === 0) continue;
    const trimmed = value.slice(0, limit);
    logger.info(`[fixOverLimitCounters] 자르기 ${current}→${limit}자 (counter=${text})`);
    await tb.click();
    await tb.fill('');
    await tb.pressSequentially(trimmed, { delay: 5 });
    await tb.press('Tab');
    await page.waitForTimeout(300);
    fixed += 1;
  }
  return fixed;
}

/**
 * 윈들리 상품 상세 탭 (이미 클릭되어 활성화된 상태) 의 에러를 수정한다.
 *
 * 적용 패턴 (둘 다 시도):
 *   1) over-limit 카운터 (X/Y자, X>Y) → 입력 trim
 *   2) 빨간 배너 메시지 (이하로/이상으로 입력해주세요, 설정해주세요 등) → 라벨 매칭 + 값 set / 토글
 *
 * @returns 수정한 에러 개수 (0 이면 throw)
 */
export async function fixTabErrors(page: Page): Promise<number> {
  await page.waitForTimeout(800);

  // 1) 인라인 over-limit 카운터 fix.
  const counterFixed = await fixOverLimitCounters(page);

  // 2) 빨간 배너 메시지 fix.
  const errors = await readBannerErrors(page);
  if (errors.length === 0 && counterFixed === 0) {
    throw new Error('[fixTabErrors] 에러 배너 + over-limit 카운터 모두 없음');
  }
  if (errors.length > 0) {
    logger.info(`[fixTabErrors] 배너 에러 ${errors.length}건: ${JSON.stringify(errors)}`);
  }

  let fixed = counterFixed;
  for (const err of errors) {
    if (err.kind === 'max' && err.limit !== null && err.fieldLabel.length > 0) {
      const tb = await findInputByLabel(page, err.fieldLabel);
      if (tb === null) {
        logger.warn(`[fixTabErrors] 라벨 '${err.fieldLabel}' input 미발견 — skip`);
        continue;
      }
      // 한도 그대로 (또는 한도-1) 입력.
      const target = String(err.limit);
      logger.info(`[fixTabErrors] '${err.fieldLabel}' 을 ${target}${err.unit} 로 변경`);
      await tb.click();
      await tb.fill('');
      await tb.pressSequentially(target, { delay: 5 });
      await tb.press('Tab');
      fixed += 1;
      await page.waitForTimeout(400);
      continue;
    }
    if (err.kind === 'min' && err.limit !== null && err.fieldLabel.length > 0) {
      const tb = await findInputByLabel(page, err.fieldLabel);
      if (tb === null) {
        logger.warn(`[fixTabErrors] 라벨 '${err.fieldLabel}' input 미발견 — skip`);
        continue;
      }
      const target = String(err.limit);
      logger.info(`[fixTabErrors] '${err.fieldLabel}' 을 ${target}${err.unit} 로 변경 (min)`);
      await tb.click();
      await tb.fill('');
      await tb.pressSequentially(target, { delay: 5 });
      await tb.press('Tab');
      fixed += 1;
      await page.waitForTimeout(400);
      continue;
    }
    if (err.kind === 'click_button' && err.fieldLabel.length > 0) {
      // dialog 자동 수락 (confirm/prompt 가 떴을 때 hang 방지).
      const dialogHandler = (d: import('@playwright/test').Dialog): void => {
        d.accept().catch(() => undefined);
      };
      page.on('dialog', dialogHandler);
      try {
        // 1) 페이지에서 같은 이름의 버튼 클릭 → 모달 오픈.
        const btn = page.getByRole('button', { name: new RegExp(`^${err.fieldLabel}$`) }).first();
        if ((await btn.count()) === 0 || !(await btn.isVisible().catch(() => false))) {
          logger.warn(`[fixTabErrors] '${err.fieldLabel}' 버튼 미발견`);
          continue;
        }
        logger.info(`[fixTabErrors] '${err.fieldLabel}' 버튼 클릭`);
        await btn.click({ timeout: 5_000 }).catch(() => undefined);
        await page.waitForTimeout(1_500);

        // 2) self-fix 버튼 시도 (있으면 클릭).
        const selfFixBtn = page
          .getByRole('button', {
            name: /^기본\s*상품명\s*적용$|^기본값\s*적용$|^자동\s*축약$/,
          })
          .first();
        if (
          (await selfFixBtn.count()) > 0 &&
          (await selfFixBtn.isVisible().catch(() => false))
        ) {
          logger.info(`[fixTabErrors] modal self-fix 클릭`);
          await selfFixBtn.click({ timeout: 5_000 }).catch(() => undefined);
          await page.waitForTimeout(2_000);
        }

        // 3) self-fix 결과와 무관하게 — modal 안 input 의 한글 텍스트 길이가 10자 초과면 강제 10자로 trim.
        //    self-fix 가 작동 안 했을 때 fallback 으로 작동.
        const trimmed = await page
          .evaluate(() => {
            const inputs = Array.from(
              document.querySelectorAll('input[type="text"], textarea'),
            ) as HTMLInputElement[];
            let count = 0;
            for (const inp of inputs) {
              const r = inp.getBoundingClientRect();
              if (r.width === 0 || r.height === 0) continue;
              const v = inp.value ?? '';
              if (v.length <= 10) continue;
              if (!/[가-힣]/.test(v)) continue;
              const next = v.slice(0, 10);
              const setter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                'value',
              )?.set;
              if (setter !== undefined) setter.call(inp, next);
              inp.dispatchEvent(new Event('input', { bubbles: true }));
              inp.dispatchEvent(new Event('change', { bubbles: true }));
              count += 1;
            }
            return count;
          })
          .catch(() => 0);
        if (trimmed > 0) logger.info(`[fixTabErrors] modal input ${trimmed}건 10자 trim`);

        // 4) 적용/저장 버튼 클릭 — short timeout, hang 방지.
        const applyBtn = page
          .getByRole('button', { name: /^적용$|^저장$|^완료$|^확인$/ })
          .first();
        if (
          (await applyBtn.count()) > 0 &&
          (await applyBtn.isVisible().catch(() => false))
        ) {
          await applyBtn.click({ timeout: 5_000 }).catch(() => undefined);
        }
        await page.waitForTimeout(1_500);

        // 5) 모달이 안 닫혔을 가능성 → ESC 키로 강제 close (다음 사이클 hang 방지).
        await page.keyboard.press('Escape').catch(() => undefined);
        await page.waitForTimeout(500);
        await page.keyboard.press('Escape').catch(() => undefined);
        await page.waitForTimeout(500);

        fixed += 1;
        continue;
      } finally {
        page.off('dialog', dialogHandler);
      }
    }
    if (err.kind === 'missing') {
      // 단위가격 — "표시 대상 아님" 토글 (= 사용 안 함) 클릭 (테스트용 상품이라 OFF로 처리).
      if (/단위가격/.test(err.fieldLabel)) {
        const offBtns = page.getByRole('button', { name: /^표시\s*대상\s*아님$/ });
        const count = await offBtns.count();
        let any = false;
        for (let i = 0; i < count; i++) {
          const btn = offBtns.nth(i);
          if (await btn.isVisible().catch(() => false)) {
            await btn.click().catch(() => undefined);
            await page.waitForTimeout(400);
            any = true;
          }
        }
        if (any) {
          logger.info(
            `[fixTabErrors] 단위가격 → 표시 대상 아님 (${count}개 섹션)`,
          );
          fixed += 1;
          continue;
        }
      }
    }
    // 그 외 자동 수정 패턴 미정 — throw 로 runner 에 알림.
    logger.warn(`[fixTabErrors] 자동 수정 패턴 미정: ${err.raw}`);
  }

  if (fixed === 0) {
    throw new Error(
      `[fixTabErrors] 에러 ${errors.length}건 모두 자동 수정 불가. 첫 메시지: ${errors[0]?.raw}`,
    );
  }
  return fixed;
}

/**
 * 빨간 탭을 클릭하고 fixTabErrors 호출. recoveries/<tab_*_error>.ts 에서 공통 사용.
 */
export async function openTabAndFixErrors(
  page: Page,
  tabName: string,
): Promise<number> {
  const tab = page.getByRole('button', { name: tabName }).first();
  await tab.waitFor({ state: 'visible', timeout: 10_000 });
  await tab.click();
  await page.waitForTimeout(1_500);
  return fixTabErrors(page);
}

/**
 * 탭 진입 후 fix 시도. 에러가 없으면 throw 대신 0 반환 (walk-through 접근에서 사용).
 *
 * 차이점:
 *   - openTabAndFixErrors: 에러 0건이면 throw → 단건 recovery 용도
 *   - walkAndFixTab     : 에러 0건이면 0 반환 → 모든 탭 순회 + 각각 시도 용도
 */
export async function walkAndFixTab(
  page: Page,
  tabName: string,
): Promise<{ fixed: number; skipped: boolean; reason?: string }> {
  const tab = page.getByRole('button', { name: tabName }).first();
  try {
    await tab.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return { fixed: 0, skipped: true, reason: '탭 버튼 미발견' };
  }
  await tab.click().catch(() => undefined);
  await page.waitForTimeout(1_500);
  try {
    const fixed = await fixTabErrors(page);
    return { fixed, skipped: false };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/에러 배너 \+ over-limit 카운터 모두 없음/.test(msg)) {
      return { fixed: 0, skipped: true, reason: 'no errors' };
    }
    if (/모두 자동 수정 불가/.test(msg)) {
      return { fixed: 0, skipped: true, reason: msg };
    }
    return { fixed: 0, skipped: true, reason: `fix 예외: ${msg}` };
  }
}
