/**
 * ESM 2.0(옥션+지마켓) "추천옵션 모드" 옵션설정 모달 조작 공용 헬퍼.
 *
 * 의존성 정책 (CLAUDE.md (h)): @playwright/test + lib/logger 만 의존.
 *   lib/ 는 atcs/ tests/ recoveries/ 어느 것도 import 하지 않는다.
 *   → TC 핸들러(tests/)와 복구(recoveries/)가 둘 다 이 모듈을 import 해 같은 플로우를 공유.
 *
 * 케이스(2026-06-11 라이브 정찰, sesame 소스 부재):
 *   ESM 추천옵션 모드 ON 상품은 업로드 설정 탭의 "ESM 2.0 옵션설정"에서 윈들리 옵션그룹을
 *   묶어 하나의 추천옵션 상품으로 등록해야 업로드 가능. 미설정이면 업로드 설정 탭 빨강 +
 *   에러 "ESM 2.0 필수옵션과 윈들리에서 설정한 옵션을 매칭하고 생성하기를 클릭해 주세요."
 *   핵심 함정: 윈들리 옵션 Tag 칩을 **전부** 선택(info)해야 생성하기가 활성화됨.
 */

import type { Page } from '@playwright/test';
import { logger } from './logger';

/** ESM 옵션설정 모달의 매칭 섹션 헤더 leaf 텍스트. */
export const ESM_MATCH_SECTION_HEADER = 'ESM 2.0 옵션과 윈들리에서 설정한 옵션 매칭';
/** ESM 미설정 에러 메시지 (업로드 설정 탭 빨강 사유 식별용). */
export const ESM_ERROR_MESSAGE = '위의 에러를 확인하고 수정해 주세요.';
/** ESM 2.0 옵션설정 섹션 헤더 leaf. */
const ESM_SECTION_LABEL = 'ESM 2.0 옵션설정';
/** 윈들리 옵션 Tag 칩의 식별 클래스 토큰 (라이브 DOM 정찰로 확인). */
const CHIP_CLASS_TOKEN = 'ewh4rnx0';

/**
 * 현재 페이지가 ESM 추천옵션 미설정 에러 상태인지 판별 (업로드 설정 탭에서 호출).
 * "ESM 2.0 옵션설정" 섹션 + ESM 에러 메시지가 함께 보이면 true.
 */
export async function isEsmRecommendOptionError(page: Page): Promise<boolean> {
  return page.evaluate(
    (arg: { sectionLabel: string; errorMsg: string }): boolean => {
      const norm = (s: string | null): string => (s ?? '').trim();
      const leaves = Array.from(document.querySelectorAll('*')).filter(
        (e) => e.children.length === 0,
      );
      const hasSection = leaves.some((e) => norm(e.textContent) === arg.sectionLabel);
      const hasError = leaves.some((e) => norm(e.textContent) === arg.errorMsg);
      return hasSection && hasError;
    },
    { sectionLabel: ESM_SECTION_LABEL, errorMsg: ESM_ERROR_MESSAGE },
  );
}

/** 업로드 설정 탭으로 이동. 탭 버튼 미발견 시 false. */
export async function goToUploadSettingsTab(page: Page): Promise<boolean> {
  const tab = page.getByRole('button', { name: '업로드 설정' }).first();
  try {
    await tab.waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    return false;
  }
  await tab.click();
  await page.waitForTimeout(1_500);
  return true;
}

export type EsmModalOpenResult = 'opened' | 'absent' | 'not-opened';

/** "ESM 2.0 옵션설정" 섹션의 "옵션설정" 버튼 클릭 → 매칭 섹션 헤더 노출 대기. */
export async function openEsmOptionModal(page: Page): Promise<EsmModalOpenResult> {
  const btn = page.getByRole('button', { name: '옵션설정', exact: true }).first();
  if ((await btn.count()) === 0) return 'absent';
  await btn.scrollIntoViewIfNeeded().catch(() => undefined);
  await btn.click();
  const header = page.getByText(ESM_MATCH_SECTION_HEADER, { exact: true }).first();
  try {
    await header.waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    return 'not-opened';
  }
  await page.waitForTimeout(800);
  return 'opened';
}

interface ChipMark {
  state: 'mark' | 'done' | 'no-section';
  chip?: string;
}

/** 매칭 섹션에서 미선택 윈들리 칩 1개를 마킹. 전부 선택됐으면 done. */
async function markNextUnselectedChip(page: Page): Promise<ChipMark> {
  return page.evaluate(
    (arg: { headerText: string; chipToken: string }): ChipMark => {
      const norm = (s: string | null): string => (s ?? '').trim();
      const hasToken = (el: Element, tok: string): boolean =>
        (el.getAttribute('class') ?? '').split(/\s+/).includes(tok);

      const headerLeaf = Array.from(document.querySelectorAll('*')).find(
        (e) => e.children.length === 0 && norm(e.textContent) === arg.headerText,
      );
      if (!headerLeaf) return { state: 'no-section' };
      let section: Element | null = headerLeaf.parentElement;
      for (let d = 0; d < 6 && section; d += 1) {
        if (
          Array.from(section.querySelectorAll('button')).some(
            (b) => norm(b.textContent) === '생성하기',
          )
        )
          break;
        section = section.parentElement;
      }
      if (!section) return { state: 'no-section' };

      const chips = Array.from(section.querySelectorAll('div')).filter((d) =>
        hasToken(d, arg.chipToken),
      );
      const target = chips.find((c) => !hasToken(c, 'info'));
      if (!target) return { state: 'done' };
      target.setAttribute('data-atc-esm-chip', '1');
      return { state: 'mark', chip: norm(target.textContent) };
    },
    { headerText: ESM_MATCH_SECTION_HEADER, chipToken: CHIP_CLASS_TOKEN },
  );
}

/**
 * 매칭 섹션의 윈들리 옵션 칩을 전부 선택(info).
 * @returns 새로 선택한 칩 수.
 * @throws 매칭 섹션을 못 찾으면 throw.
 */
export async function selectAllWindlyChips(page: Page): Promise<number> {
  let selected = 0;
  for (let guard = 0; guard < 12; guard += 1) {
    const r = await markNextUnselectedChip(page);
    if (r.state === 'no-section') {
      throw new Error('ESM 매칭 섹션을 찾지 못함 (모달 구조 변경 가능)');
    }
    if (r.state === 'done') break;
    const chip = page.locator('[data-atc-esm-chip]').first();
    if ((await chip.count()) === 0) break;
    await chip.scrollIntoViewIfNeeded().catch(() => undefined);
    await chip.click().catch(() => undefined);
    await page.evaluate(() =>
      document.querySelector('[data-atc-esm-chip]')?.removeAttribute('data-atc-esm-chip'),
    );
    await page.waitForTimeout(1_000);
    selected += 1;
    logger.info(`[esm] 윈들리 옵션 칩 "${r.chip}" 선택`);
  }
  return selected;
}

/** 활성화된 "생성하기" 클릭. 비활성이면(매칭 미완료) false. */
export async function clickGenerate(page: Page): Promise<boolean> {
  const gen = page.getByRole('button', { name: '생성하기' }).first();
  try {
    await gen.waitFor({ state: 'visible', timeout: 8_000 });
  } catch {
    return false;
  }
  for (let i = 0; i < 12; i += 1) {
    if (!(await gen.isDisabled().catch(() => true))) {
      await gen.click();
      await page.waitForTimeout(2_500);
      return true;
    }
    await page.waitForTimeout(600);
  }
  return false;
}

/** footer "저장" 클릭 → 모달(매칭 섹션) 닫힘 대기. 버튼 미발견 시 false. */
export async function saveEsmOption(page: Page): Promise<boolean> {
  const save = page.getByRole('button', { name: '저장', exact: true }).first();
  try {
    await save.waitFor({ state: 'visible', timeout: 8_000 });
  } catch {
    return false;
  }
  await save.click();
  const header = page.getByText(ESM_MATCH_SECTION_HEADER, { exact: true }).first();
  await header.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_500);
  return true;
}

/**
 * ESM 추천옵션 미설정 에러를 한 번에 수정하는 오케스트레이터 (복구용).
 * 업로드 설정 탭 → ESM 옵션설정 모달 → 윈들리 칩 전부 선택 → 생성하기 → 저장.
 * 어느 단계든 실패하면 throw (D12 — 복구 자체 실패는 runner 가 1회 실패로 기록).
 */
export async function fixEsmRecommendOption(page: Page): Promise<void> {
  if (!(await goToUploadSettingsTab(page))) {
    throw new Error('업로드 설정 탭 미노출');
  }
  const opened = await openEsmOptionModal(page);
  if (opened === 'absent') {
    throw new Error('ESM 2.0 옵션설정 버튼 미발견 (ESM 미대상/추천옵션 모드 아님)');
  }
  if (opened === 'not-opened') {
    throw new Error('ESM 2.0 옵션설정 모달이 열리지 않음');
  }
  await selectAllWindlyChips(page);
  if (!(await clickGenerate(page))) {
    throw new Error('생성하기 비활성 — 윈들리 칩 선택이 완료되지 않음');
  }
  if (!(await saveEsmOption(page))) {
    throw new Error('ESM 옵션설정 저장 버튼 미발견/실패');
  }
  logger.info('[esm] 추천옵션 매칭 + 생성 + 저장 완료');
}
