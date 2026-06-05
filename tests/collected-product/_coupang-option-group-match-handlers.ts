/**
 * 쿠팡 추천 옵션그룹명 매칭 handler 모듈 — test() 호출 없음 (e2e import 안전).
 *
 * 대응 ATC: atcs/collected-product/coupang-option-group-match.atc.yml
 *
 * 배경(2026-06): 쿠팡이 추천 옵션그룹명 사용을 필수화. 수집상품 옵션그룹을
 * 쿠팡 카테고리의 mandatory attributes(추천 옵션그룹) 개수에 맞추고 이름을
 * 1:1 매칭한 뒤, 옵션가 기준(base SKU)을 선택한다. 업로드는 다음 TC 가 진행.
 *
 * sesame UI 출처:
 *   - OptionTab.tsx: "옵션그룹 추가" 버튼, deleteOptionGroups(모달 "옵션 그룹 삭제")
 *   - ActiveOptionToggle.tsx: Toggle label "쿠팡의 추천 옵션그룹명 사용" (input[type=checkbox])
 *   - OptionGroup.tsx: 그룹별 "쿠팡의 추천 옵션그룹명" 행 + 추천 Tag(div, class info|default)
 *   - SalesPriceTable: "옵션가 기준" 컬럼 = input[type=radio]
 */

import type { Page } from '@playwright/test';
import type { StepHandler, StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import {
  goToCollectedProducts,
  searchByProductCode,
  openFirstSearchResult,
} from '../../lib/windly-actions';
import {
  clickErrorCheckButton,
  readTabStatuses,
  summarizeTabStatuses,
  readRedFieldLocations,
} from '../../lib/error-check-actions';
import { emitOutput } from '../../lib/atc-output';
import { logger } from '../../lib/logger';

const RECOMMEND_TOGGLE_LABEL = '쿠팡의 추천 옵션그룹명 사용';
const RECOMMEND_SECTION_TEXT = '쿠팡의 추천 옵션그룹명';
const ADD_GROUP_BUTTON = '옵션그룹 추가';
const DELETE_GROUP_CONFIRM = '옵션 그룹 삭제';

/** TabGroup 의 탭은 텍스트 매칭으로 클릭 (기존 spec 패턴과 동일). */
async function clickTab(page: Page, name: string): Promise<boolean> {
  const tab = page.getByText(name, { exact: true }).first();
  try {
    await tab.waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    return false;
  }
  await tab.click();
  await page.waitForTimeout(1_500);
  return true;
}

const openCollectedListStep: StepHandler = async (page) => {
  await goToCollectedProducts(page);
  return { ok: true as const };
};

const openTargetProductStep: StepHandler = async (page, inputs) => {
  const id =
    typeof inputs['source_product_id'] === 'string'
      ? (inputs['source_product_id'] as string).trim()
      : '';

  if (id.length > 0) {
    const count = await searchByProductCode(page, id);
    if (count === 0) {
      return {
        ok: false as const,
        error_key: 'product_not_found' as ErrorKey,
        message: `상품 코드 ${id} 검색 결과 0개`,
      };
    }
    try {
      await openFirstSearchResult(page);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        ok: false as const,
        error_key: 'detail_open_failed' as ErrorKey,
        message: `상세 진입 실패: ${msg}`,
      };
    }
  } else {
    const card = page.locator('a[href*="/view2/interested-product/"]').first();
    try {
      await card.waitFor({ state: 'visible', timeout: 30_000 });
    } catch {
      return {
        ok: false as const,
        error_key: 'no_collected_products' as ErrorKey,
        message: '수집상품 카드 0개',
      };
    }
    await card.click();
    await page
      .waitForURL(/\/view2\/interested-product\/\d+/, { timeout: 30_000 })
      .catch(() => undefined);
  }
  await page.waitForTimeout(1_500);

  // 진입한 상품 코드를 URL 에서 추출해 output 으로 발급 (다음 업로드 TC 가 받아감).
  const matched = page.url().match(/\/view2\/interested-product\/(\d+)/);
  const resolvedId = matched?.[1] ?? id;
  if (resolvedId.length > 0) {
    emitOutput('source_product_id', resolvedId);
    logger.info(`[open_target_product] source_product_id=${resolvedId}`);
  }
  return { ok: true as const };
};

const openOptionTabStep: StepHandler = async (page) => {
  const ok = await clickTab(page, '옵션');
  if (!ok) {
    return {
      ok: false as const,
      error_key: 'option_tab_not_found' as ErrorKey,
      message: '옵션 탭 미노출 (상세 mount 실패 가능)',
    };
  }
  return { ok: true as const };
};

/** 그룹별 추천 옵션그룹명 행이 노출돼 있으면 토글 ON 상태. */
async function isRecommendSectionVisible(page: Page): Promise<boolean> {
  return page.evaluate((sectionText: string) => {
    return Array.from(document.querySelectorAll('*')).some(
      (el) =>
        el.children.length === 0 &&
        (el.textContent ?? '').trim() === sectionText,
    );
  }, RECOMMEND_SECTION_TEXT);
}

const ensureRecommendToggleOnStep: StepHandler = async (page) => {
  // 이미 켜져 있으면 통과.
  if (await isRecommendSectionVisible(page)) {
    logger.info('[ensure_recommend_toggle_on] 이미 ON');
    return { ok: true as const };
  }

  // 토글 label "쿠팡의 추천 옵션그룹명 사용" 이 있는 <label> 안의 checkbox 클릭.
  const toggleLabel = page.locator('label', { hasText: RECOMMEND_TOGGLE_LABEL }).first();
  if ((await toggleLabel.count()) === 0) {
    return {
      ok: false as const,
      error_key: 'coupang_recommend_toggle_absent' as ErrorKey,
      message:
        '쿠팡의 추천 옵션그룹명 사용 토글 미노출 — 쿠팡이 업로드 대상이 아니거나 카테고리에 추천 옵션그룹이 없음',
    };
  }
  await toggleLabel.scrollIntoViewIfNeeded().catch(() => undefined);
  await toggleLabel.click();
  await page.waitForTimeout(2_000);

  if (!(await isRecommendSectionVisible(page))) {
    return {
      ok: false as const,
      error_key: 'coupang_recommend_toggle_failed' as ErrorKey,
      message: '토글 클릭 후에도 추천 옵션그룹명 행이 노출되지 않음',
    };
  }
  logger.info('[ensure_recommend_toggle_on] 토글 ON 완료');
  return { ok: true as const };
};

interface MatchState {
  groupCount: number;
  recommendedNames: string[];
}

/** 현재 옵션그룹 수 + 추천 옵션그룹명(distinct, 순서 유지) 을 DOM 에서 읽는다. */
async function readMatchState(page: Page): Promise<MatchState> {
  return page.evaluate((sectionText: string) => {
    const norm = (s: string | null): string => (s ?? '').trim();

    // 옵션그룹 수 = "옵션그룹 N" 헤더 개수 (leaf text).
    const groupCount = Array.from(document.querySelectorAll('*')).filter(
      (el) => el.children.length === 0 && /^옵션그룹\s*\d+$/.test(norm(el.textContent)),
    ).length;

    // 추천 옵션그룹명: "쿠팡의 추천 옵션그룹명" 텍스트를 가진 행(row) 의 형제 Tag 들.
    // Tag = TagContainer div, class 에 info|default 토큰 포함, leaf text = 속성명.
    const labelEl = Array.from(document.querySelectorAll('*')).find(
      (el) => el.children.length === 0 && norm(el.textContent) === sectionText,
    );
    const names: string[] = [];
    if (labelEl) {
      // 라벨에서 위로 몇 단계 올라가 같은 행(row) 컨테이너를 찾는다.
      let row: Element | null = labelEl.parentElement;
      for (let i = 0; i < 4 && row; i += 1) {
        const tags = Array.from(row.querySelectorAll('*')).filter((el) => {
          const cls = el.getAttribute('class') ?? '';
          const tokens = cls.split(/\s+/);
          const isTag = tokens.includes('info') || tokens.includes('default');
          const t = norm(el.textContent);
          return isTag && t.length > 0 && el.children.length === 0;
        });
        if (tags.length > 0) {
          for (const tag of tags) {
            const t = norm(tag.textContent);
            if (t && !names.includes(t)) names.push(t);
          }
          break;
        }
        row = row.parentElement;
      }
    }
    return { groupCount, recommendedNames: names };
  }, RECOMMEND_SECTION_TEXT);
}

/** "옵션그룹 추가" 버튼 클릭 후 반영 대기. */
async function addOneGroup(page: Page): Promise<boolean> {
  const btn = page.getByRole('button', { name: ADD_GROUP_BUTTON }).first();
  if ((await btn.count()) === 0 || (await btn.isDisabled().catch(() => true))) {
    return false;
  }
  await btn.click();
  await page.waitForTimeout(2_500); // onUpdateProduct(네트워크) + 새 그룹 렌더
  return true;
}

/**
 * gi 번째 옵션그룹의 삭제 버튼(헤더의 빨간 icon-only 버튼) → 모달 "옵션 그룹 삭제" 확인.
 * 그룹 삭제 버튼은 color="red" 라 빨간색으로, 옵션 행의 회색 remove 버튼과 구분된다.
 * 빨간 삭제 버튼들의 DOM 순서 = 그룹 순서이므로 gi 로 정확히 타깃.
 */
async function deleteGroupAtIndex(page: Page, gi: number): Promise<boolean> {
  const marked = await page.evaluate((targetIdx: number) => {
    const norm = (s: string | null): string => (s ?? '').trim();
    const isRed = (rgb: string): boolean => {
      const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (m === null) return false;
      return Number(m[1]) >= 180 && Number(m[2]) <= 110 && Number(m[3]) <= 110;
    };
    const redBtns = Array.from(document.querySelectorAll('button')).filter((b) => {
      if (norm(b.textContent).length > 0) return false;
      const r = b.getBoundingClientRect();
      if (r.x < 250 || r.y < 130 || r.width === 0) return false; // 사이드바/상단 툴바 제외
      if (b.querySelector('svg') === null) return false;
      const els = [b, ...Array.from(b.querySelectorAll('*'))];
      return els.some((el) => {
        const cs = window.getComputedStyle(el);
        return (
          isRed(cs.color) ||
          isRed(cs.fill ?? '') ||
          isRed(cs.stroke ?? '') ||
          isRed(cs.borderTopColor)
        );
      });
    });
    if (targetIdx >= redBtns.length) return 0;
    redBtns[targetIdx].setAttribute('data-atc', 'del-group');
    return 1;
  }, gi);
  if (marked === 0) return false;

  await page.locator('[data-atc="del-group"]').first().click();
  const confirm = page.getByRole('button', { name: DELETE_GROUP_CONFIRM }).first();
  try {
    await confirm.waitFor({ state: 'visible', timeout: 8_000 });
  } catch {
    return false;
  }
  await confirm.click();
  await page.waitForTimeout(2_500);
  await page
    .evaluate(() => document.querySelector('[data-atc="del-group"]')?.removeAttribute('data-atc'))
    .catch(() => undefined);
  return true;
}

/**
 * 각 옵션그룹(추천 행 순서)이 현재 매칭된 쿠팡 추천명을 읽는다.
 * 반환 배열 index = 그룹 순서, 값 = 매칭된 추천명('info' Tag) 또는 '' (미매칭).
 * 윈들리가 그룹명===추천명일 때 자동 매칭(by title)하므로, 클릭 없이도 매칭 상태가 보인다.
 */
async function readGroupMatches(page: Page): Promise<string[]> {
  return page.evaluate((sectionText: string) => {
    const norm = (s: string | null): string => (s ?? '').trim();
    const rows = Array.from(document.querySelectorAll('*')).filter(
      (el) => el.children.length === 0 && norm(el.textContent) === sectionText,
    );
    return rows.map((rowLeaf) => {
      let row: Element | null = rowLeaf.parentElement;
      for (let d = 0; d < 4 && row; d += 1) {
        const tags = Array.from(row.querySelectorAll('*')).filter((el) => {
          const cls = el.getAttribute('class') ?? '';
          const tok = cls.split(/\s+/);
          return (tok.includes('info') || tok.includes('default')) && el.children.length === 0;
        });
        if (tags.length > 0) {
          const info = tags.find((t) => (t.getAttribute('class') ?? '').split(/\s+/).includes('info'));
          return info ? norm(info.textContent) : '';
        }
        row = row.parentElement;
      }
      return '';
    });
  }, RECOMMEND_SECTION_TEXT);
}

/** rowIndex 그룹의 추천 행에서 text===name 인 default Tag 를 클릭해 매칭. */
async function clickTagInRow(page: Page, rowIndex: number, name: string): Promise<boolean> {
  const marked = await page.evaluate(
    (arg: { sectionText: string; rowIndex: number; name: string }) => {
      const norm = (s: string | null): string => (s ?? '').trim();
      const rows = Array.from(document.querySelectorAll('*')).filter(
        (el) => el.children.length === 0 && norm(el.textContent) === arg.sectionText,
      );
      if (arg.rowIndex >= rows.length) return 0;
      let row: Element | null = rows[arg.rowIndex].parentElement;
      for (let d = 0; d < 4 && row; d += 1) {
        const tags = Array.from(row.querySelectorAll('*')).filter((el) => {
          const cls = el.getAttribute('class') ?? '';
          const tok = cls.split(/\s+/);
          return (tok.includes('info') || tok.includes('default')) && el.children.length === 0;
        });
        if (tags.length > 0) {
          const target = tags.find((t) => norm(t.textContent) === arg.name);
          if (!target) return 0;
          if ((target.getAttribute('class') ?? '').split(/\s+/).includes('info')) return 2;
          target.setAttribute('data-atc', 'match-tag');
          return 1;
        }
        row = row.parentElement;
      }
      return 0;
    },
    { sectionText: RECOMMEND_SECTION_TEXT, rowIndex, name },
  );
  if (marked === 2) return true; // 이미 매칭
  if (marked !== 1) return false;
  await page.locator('[data-atc="match-tag"]').first().click();
  await page.evaluate(() =>
    document.querySelector('[data-atc="match-tag"]')?.removeAttribute('data-atc'),
  );
  await page.waitForTimeout(2_000);
  return true;
}

/**
 * 내용 기반 매칭: 아직 안 덮인 추천명을 미매칭 그룹에 하나씩 할당.
 * 그룹명===추천명인 그룹은 이미 매칭(info)되어 자동으로 덮이므로 클릭 불필요 —
 * 결과적으로 "자연 매칭 그룹은 유지, 매칭 안 되는 그룹만 미매칭으로 남음".
 * @returns 덮인 추천명 수.
 */
async function assignMatchableNames(page: Page, recommendedNames: string[]): Promise<number> {
  for (let guard = 0; guard < 12; guard += 1) {
    const matches = await readGroupMatches(page);
    const covered = matches.filter((m) => m.length > 0);
    const uncovered = recommendedNames.filter((n) => !covered.includes(n));
    if (uncovered.length === 0) break;
    const targetRow = matches.findIndex((m) => m.length === 0);
    if (targetRow < 0) break; // 미매칭 그룹 없음
    const name = uncovered[0];
    const ok = await clickTagInRow(page, targetRow, name);
    if (!ok) {
      logger.info(`[match] 그룹 ${targetRow + 1} 에 "${name}" Tag 할당 실패 (비활성/미발견)`);
      break;
    }
    logger.info(`[match] 그룹 ${targetRow + 1} → ${name} 매칭`);
  }
  const final = await readGroupMatches(page);
  return recommendedNames.filter((n) => final.includes(n)).length;
}

/**
 * 매칭 후 비어있는 그룹(주로 새로 추가한 그룹)의 그룹명 + 옵션값을 채운다.
 *   - 그룹명: 해당 그룹에 매칭된 쿠팡 추천 속성명(recommendedNames[i])
 *   - 옵션값: 그룹의 "입력 가능한 옵션"(usableUnits) 첫 값. 제약 없으면 '1'
 * 이미 채워진 그룹(기존 그룹)은 건너뛴다 — idempotent.
 */
async function fillIncompleteGroups(page: Page, recommendedNames: string[]): Promise<void> {
  // 매 반복마다 re-query — fill 시 React 재렌더로 DOM 노드가 교체돼 마크가 날아갈 수 있음.
  for (let guard = 0; guard < 12; guard += 1) {
    const target = await page.evaluate((names: string[]) => {
      const norm = (s: string | null): string => (s ?? '').trim();
      const yOf = (el: Element): number => el.getBoundingClientRect().y;

      // 그룹명 input: class `option-group-<id>` (active 토글 제외). DOM 순서 = 그룹 순서.
      const nameInputs = (
        Array.from(document.querySelectorAll('input')) as HTMLInputElement[]
      ).filter((inp) => {
        const cls = inp.getAttribute('class') ?? '';
        return /(^|\s)option-group-[0-9a-f]/.test(cls) && !cls.includes('option-group-active');
      });
      const groups = nameInputs.map((ni, gi) => ({ gi, y: yOf(ni), empty: norm(ni.value).length === 0 }));
      const groupOf = (y: number): number => {
        let gi = 0;
        for (const g of groups) if (g.y <= y) gi = g.gi;
        return gi;
      };

      // 그룹별 usableUnits: "입력 가능한 옵션" leaf 다음 텍스트, y 로 그룹 매핑.
      const unitsByGroup: Record<number, string> = {};
      const leaves = Array.from(document.querySelectorAll('*')).filter((e) => e.children.length === 0);
      for (let i = 0; i < leaves.length; i += 1) {
        if (norm(leaves[i].textContent) !== '입력 가능한 옵션') continue;
        for (let j = i + 1; j < Math.min(i + 5, leaves.length); j += 1) {
          const t = norm(leaves[j].textContent);
          if (t.length > 0) {
            unitsByGroup[groupOf(yOf(leaves[i]))] = t.split(',')[0].trim();
            break;
          }
        }
      }

      // 1순위: 빈 그룹명.
      for (const g of groups) {
        if (g.empty) {
          nameInputs[g.gi].setAttribute('data-atc-fill', '1');
          return { kind: 'name', gi: g.gi, value: names[g.gi] ?? '' };
        }
      }
      // 2순위: 옵션값 input (class `option_input_<id>`).
      //  - 단위 그룹(쿠팡 숫자+단위 속성): 값이 ^\d+(\.\d+)?(unit)$ 아니면 "1<unit>" 로 교정
      //    (예: 빈칸/"단" → "1단"). validation L585-590 의 regex/unitExample 과 동일.
      //  - 단위 없는 그룹(예: 색상): 빈칸일 때만 "1" 로 채움. 기존 값(예: A)은 안 건드림.
      const optInputs = (
        Array.from(document.querySelectorAll('input')) as HTMLInputElement[]
      ).filter((inp) => /(^|\s)option_input_/.test(inp.getAttribute('class') ?? ''));
      for (const oi of optInputs) {
        const gi = groupOf(yOf(oi));
        const unit = unitsByGroup[gi] ?? '';
        const cur = norm(oi.value);
        if (unit.length > 0) {
          const re = new RegExp(`^\\d+(\\.\\d+)?(${unit})$`);
          if (!re.test(cur)) {
            oi.setAttribute('data-atc-fill', '1');
            return { kind: 'option', gi, value: `1${unit}` };
          }
        } else if (cur.length === 0) {
          oi.setAttribute('data-atc-fill', '1');
          return { kind: 'option', gi, value: '1' };
        }
      }
      return null;
    }, recommendedNames);

    if (target === null) break;
    if (target.value.length === 0) {
      // 채울 값이 없음(이론상 name 은 항상 있음) — 무한루프 방지.
      await page.evaluate(() =>
        document.querySelector('[data-atc-fill]')?.removeAttribute('data-atc-fill'),
      );
      logger.info(`[fill] 그룹 ${target.gi + 1} ${target.kind} 채울 값 없음 — 건너뜀`);
      break;
    }

    const loc = page.locator('[data-atc-fill]').first();
    await loc.click();
    await loc.fill(target.value);
    await loc.press('Tab');
    await page.waitForTimeout(2_000);
    await page.evaluate(() =>
      document.querySelector('[data-atc-fill]')?.removeAttribute('data-atc-fill'),
    );
    logger.info(`[fill] 그룹 ${target.gi + 1} ${target.kind} → ${target.value}`);
  }
}

const matchOptionGroupsStep: StepHandler = async (page) => {
  const state = await readMatchState(page);
  logger.info(
    `[match_option_groups] 현재 그룹=${state.groupCount}, 추천=${state.recommendedNames.length} [${state.recommendedNames.join(', ')}]`,
  );

  if (state.recommendedNames.length === 0) {
    return {
      ok: false as const,
      error_key: 'no_recommended_option_groups' as ErrorKey,
      message: '추천 옵션그룹명을 읽지 못함 (토글 OFF 또는 카테고리 추천 없음)',
    };
  }

  const target = state.recommendedNames.length;

  // 1) 부족하면 먼저 추가 (빈 그룹). 초과분은 매칭 후 삭제 — 위치가 아니라 미매칭 그룹을 지움.
  let addGuard = 0;
  while ((await readMatchState(page)).groupCount < target && addGuard < 6) {
    addGuard += 1;
    const cur = (await readMatchState(page)).groupCount;
    const ok = await addOneGroup(page);
    if (!ok) {
      return {
        ok: false as const,
        error_key: 'add_option_group_failed' as ErrorKey,
        message: `옵션그룹 추가 실패 (현재 ${cur}, 목표 ${target}) — 업로드된 상품이거나 3개 초과`,
      };
    }
    logger.info(`[match_option_groups] 옵션그룹 추가 (${cur} → ${cur + 1})`);
  }

  // 2) 매칭 먼저 — 추천명을 매칭 가능한 그룹에 할당. 자연 매칭(그룹명===추천명) 그룹은 유지되고,
  //    매칭 안 되는 그룹만 미매칭으로 남는다.
  const covered = await assignMatchableNames(page, state.recommendedNames);
  if (covered < target) {
    return {
      ok: false as const,
      error_key: 'option_group_match_incomplete' as ErrorKey,
      message: `매칭 미완료: 추천 ${target}개 중 ${covered}개만 매칭됨 (그룹 부족/Tag 비활성)`,
    };
  }
  logger.info(`[match_option_groups] 매칭 완료 ${covered}/${target}`);

  // 3) 초과분 삭제 — 매칭 안 된(남는) 그룹을 지워 개수를 추천 수에 맞춘다.
  let delGuard = 0;
  while ((await readMatchState(page)).groupCount > target && delGuard < 6) {
    delGuard += 1;
    const matches = await readGroupMatches(page);
    let gi = matches.findIndex((m) => m.length === 0); // 미매칭 그룹 우선
    if (gi < 0) gi = matches.length - 1; // (이론상 없음) fallback: 마지막
    const beforeCount = matches.length;
    const ok = await deleteGroupAtIndex(page, gi);
    if (!ok) {
      return {
        ok: false as const,
        error_key: 'delete_option_group_failed' as ErrorKey,
        message: `초과(미매칭) 옵션그룹 삭제 실패 — 그룹 ${gi + 1}`,
      };
    }
    logger.info(`[match_option_groups] 미매칭 옵션그룹 삭제 (그룹 ${gi + 1}, ${beforeCount} → ${beforeCount - 1})`);
  }

  const afterCount = (await readMatchState(page)).groupCount;
  if (afterCount !== target) {
    return {
      ok: false as const,
      error_key: 'option_group_count_mismatch' as ErrorKey,
      message: `개수 맞춤 실패: 현재 ${afterCount}, 목표 ${target}`,
    };
  }

  // 4) 빈 그룹(추가한 그룹)의 그룹명 + 옵션값 채우기.
  await fillIncompleteGroups(page, state.recommendedNames);

  return { ok: true as const };
};

/**
 * SalesPriceTable 의 "옵션가 기준" 라디오만 정확히 집는다.
 * RadioTableCell 이 Radio 에 className 을 안 넘겨 id 가 `radio_<index>_undefined_<uid>`
 * 형태이고 value 가 숫자(SKU index) — 이 두 조건으로 페이지의 다른 라디오와 구분한다
 * (evaluate 안에서 인라인으로 동일 조건 사용).
 */
const selectBaseSkuStep: StepHandler = async (page) => {
  const ok = await clickTab(page, '판매가');
  if (!ok) {
    return {
      ok: false as const,
      error_key: 'sales_tab_not_found' as ErrorKey,
      message: '판매가 탭 미노출',
    };
  }
  await page.waitForTimeout(1_000);

  const before = await page.evaluate(() => {
    const isBase = (r: HTMLInputElement) =>
      /^radio_.*_undefined_/.test(r.id) && /^-?\d+$/.test(r.value);
    const rs = (
      Array.from(document.querySelectorAll('input[type="radio"]')) as HTMLInputElement[]
    ).filter(isBase);
    return { total: rs.length, checked: rs.some((r) => r.checked) };
  });

  if (before.total === 0) {
    return {
      ok: false as const,
      error_key: 'base_sku_radio_not_found' as ErrorKey,
      message: '판매가 탭 옵션가 기준 라디오 미발견 (id radio_*_undefined_* 패턴 0개)',
    };
  }
  if (before.checked) {
    logger.info('[select_base_sku] 옵션가 기준 이미 선택됨 (base-SKU 라디오 기준)');
    return { ok: true as const };
  }

  // 첫 활성 옵션가 기준 라디오를 네이티브 클릭 → React onClick(onSelect) 발화.
  const clicked = await page.evaluate(() => {
    const isBase = (r: HTMLInputElement) =>
      /^radio_.*_undefined_/.test(r.id) && /^-?\d+$/.test(r.value);
    const rs = (
      Array.from(document.querySelectorAll('input[type="radio"]')) as HTMLInputElement[]
    ).filter(isBase);
    const target = rs.find((r) => !r.disabled);
    if (!target) return false;
    target.scrollIntoView({ block: 'center' });
    target.click();
    return true;
  });
  if (!clicked) {
    return {
      ok: false as const,
      error_key: 'base_sku_radio_not_clickable' as ErrorKey,
      message: '활성 옵션가 기준 라디오 없음 (전부 disabled)',
    };
  }
  await page.waitForTimeout(2_500);

  const confirmed = await page.evaluate(() => {
    const isBase = (r: HTMLInputElement) =>
      /^radio_.*_undefined_/.test(r.id) && /^-?\d+$/.test(r.value);
    const rs = (
      Array.from(document.querySelectorAll('input[type="radio"]')) as HTMLInputElement[]
    ).filter(isBase);
    return rs.some((r) => r.checked);
  });
  if (!confirmed) {
    return {
      ok: false as const,
      error_key: 'base_sku_not_selected' as ErrorKey,
      message: '라디오 클릭 후에도 옵션가 기준 미선택 (defaultSkuIndex 반영 실패)',
    };
  }
  logger.info('[select_base_sku] 옵션가 기준 선택 완료');
  return { ok: true as const };
};

/**
 * 실제 윈들리 에러체크 실행 → 7개 탭 dot 결과로 빨간(에러) 0건 검증.
 * 빨간 탭이 있으면 그 탭으로 이동해 빨간 필드 위치를 진단으로 수집한다.
 */
const errorCheckStep: StepHandler = async (page) => {
  const clicked = await clickErrorCheckButton(page);
  if (!clicked) {
    return {
      ok: false as const,
      error_key: 'error_check_button_not_found' as ErrorKey,
      message: '상단 에러체크(체크마크) 버튼 미발견',
    };
  }
  // clickErrorCheckButton 내부에서 2.5s 대기. dot 렌더 여유 추가.
  await page.waitForTimeout(1_500);

  const statuses = await readTabStatuses(page);
  const sum = summarizeTabStatuses(statuses);
  const redTabs = statuses.filter((s) => s.status === 'red').map((s) => s.name);
  const yellowTabs = statuses.filter((s) => s.status === 'yellow').map((s) => s.name);
  logger.info(
    `[error_check] red=${sum.red} yellow=${sum.yellow} green=${sum.green} none=${sum.none}` +
      ` | 빨강: ${redTabs.join(', ') || '없음'} | 노랑: ${yellowTabs.join(', ') || '없음'}`,
  );

  if (sum.total_classified === 0) {
    // dot 이 하나도 분류 안 됨 = 에러체크 미실행 가능성. 통과로 위장하지 않고 실패 보고.
    return {
      ok: false as const,
      error_key: 'error_check_not_run' as ErrorKey,
      message: '에러체크 후 탭 dot 을 하나도 감지 못함 — 에러체크가 실제로 실행됐는지 확인 필요',
    };
  }

  if (sum.red > 0) {
    // 빨간 탭들로 이동해 빨간 필드 진단 수집.
    const diagnostics: string[] = [];
    for (const tabName of redTabs) {
      const moved = await clickTab(page, tabName);
      if (!moved) continue;
      const fields = await readRedFieldLocations(page);
      const labels = fields.map((f) => f.label || `${f.tag}@(${f.x},${f.y})`).slice(0, 6);
      diagnostics.push(`${tabName}[${labels.join(', ') || '필드 미특정'}]`);
    }
    return {
      ok: false as const,
      error_key: 'error_check_failed' as ErrorKey,
      message: `에러체크 빨간 에러 탭 ${sum.red}건: ${diagnostics.join(' / ') || redTabs.join(', ')}`,
    };
  }

  logger.info(
    `[error_check] 빨간 에러 0건${sum.yellow > 0 ? ` (노란 경고 ${sum.yellow}건: ${yellowTabs.join(', ')})` : ''}`,
  );
  return { ok: true as const };
};

export const coupangOptionGroupMatchHandlers: StepHandlers = {
  open_collected_list: openCollectedListStep,
  open_target_product: openTargetProductStep,
  open_option_tab: openOptionTabStep,
  ensure_recommend_toggle_on: ensureRecommendToggleOnStep,
  match_option_groups: matchOptionGroupsStep,
  select_base_sku: selectBaseSkuStep,
  error_check: errorCheckStep,
};
