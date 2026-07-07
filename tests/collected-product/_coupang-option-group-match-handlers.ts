/**
 * 쿠팡 추천 옵션그룹명 매칭 handler 모듈 — test() 호출 없음 (e2e import 안전).
 *
 * 대응 ATC: atcs/collected-product/coupang-option-group-match.atc.yml
 *
 * 배경(2026-06): 쿠팡이 추천 옵션그룹명 사용을 필수화. 수집상품 옵션그룹을
 * 쿠팡 카테고리의 mandatory attributes(추천 옵션그룹) 개수에 맞추고 이름을
 * 매칭한 뒤, 옵션가 기준(base SKU)을 선택한다. 업로드는 다음 TC 가 진행.
 *
 * 매칭 전략(2026-07 UI 개정):
 *   쿠팡이 "추천"을 "필수"로 강제. 사용 토글이 사라져 매칭 행이 상시 노출됨.
 *   그룹 add/delete 로 개수를 맞추던 방식도 폐기 — 부족분은 별도 "쿠팡 필수 옵션그룹 추가"
 *   영역이 자동으로 뜨고, 거기에 옵션값(아무 숫자)만 넣으면 된다.
 *   1) 매칭 행 렌더 대기 (쿠팡 카테고리 fetch race). 없으면 쿠팡 미타겟/필수 없음.
 *   2) 필수 태그를 그룹에 매칭 — 윈들리 자동매칭(info)은 유지, 미선택 그룹만 남는 이름을 채움.
 *   3) "쿠팡 필수 옵션그룹 추가" 영역이 있으면(필수 수 > 내 그룹 수) 옵션값에 아무 숫자 입력.
 *   4) 실제 그룹 옵션값을 A-Z 정규화 + 단위형식·고유성 자동보정 (fixOptionValues).
 *
 * sesame UI 출처:
 *   - OptionGroup.tsx: 그룹별 "쿠팡 필수 옵션그룹명 매칭" 행 + 필수 Tag(div, class info|default)
 *     (info = 선택/매칭됨, default = 미선택)
 *   - "쿠팡 필수 옵션그룹 추가": 미충족 필수명 + 옵션값 input(placeholder="옵션을 입력하세요")
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

// 2026-07 UI 개정: 토글 폐기(무조건 필수). 그룹별 매칭 행 라벨이 아래로 바뀜.
const MANDATORY_MATCH_LABEL = '쿠팡 필수 옵션그룹명 매칭';
// "쿠팡 필수 옵션그룹 추가" 영역의 옵션값 input placeholder.
// 필수명 타입에 따라 placeholder 가 다르다:
//   - 문자형(사이즈 등) = "옵션을 입력하세요"
//   - 숫자+단위형(개당 수량/수량 등) = "숫자를 입력하세요" (단위 radio 는 첫 항목 기본 선택돼 있음)
// 둘 다 아무 숫자를 넣으면 됨. 일반 옵션행(옵션명을 입력하세요)과는 placeholder 로 구분된다.
const ADD_SECTION_OPTION_PLACEHOLDERS = ['옵션을 입력하세요', '숫자를 입력하세요'] as const;
const ADD_SECTION_INPUT_SELECTOR = ADD_SECTION_OPTION_PLACEHOLDERS.map(
  (p) => `input[placeholder="${p}"]`,
).join(', ');

/**
 * 추천 옵션그룹명 중 "(택N)" 묶음은 택일 — 같은 N 은 첫 항목만 채택, prefix 없는 건 전부 유지.
 * 태그 클릭용 원본 텍스트(prefix 포함)는 그대로 반환한다.
 * 예: ["(택1) 개당 용량", "(택1) 개당 중량", "수량"] → ["(택1) 개당 용량", "수량"].
 */
function collapseChooseOneNames(names: string[]): string[] {
  const seenChoose = new Set<string>();
  const out: string[] = [];
  for (const name of names) {
    const m = name.match(/^\(택(\d+)\)/);
    if (m !== null) {
      if (seenChoose.has(m[1])) continue;
      seenChoose.add(m[1]);
    }
    out.push(name);
  }
  return out;
}

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

/** 그룹별 "쿠팡 필수 옵션그룹명 매칭" 행이 렌더돼 있으면 true. */
async function isMandatorySectionVisible(page: Page): Promise<boolean> {
  return page.evaluate((sectionText: string) => {
    return Array.from(document.querySelectorAll('*')).some(
      (el) =>
        el.children.length === 0 &&
        (el.textContent ?? '').trim() === sectionText,
    );
  }, MANDATORY_MATCH_LABEL);
}

/**
 * 필수 옵션그룹명 매칭 행 렌더 대기. 쿠팡 카테고리·마켓 데이터 fetch 후 렌더되므로
 * 즉시 읽으면 race 로 "미노출" 오판한다. 최대 ~12초 폴링.
 * @returns 렌더됐으면 true. 끝까지 안 뜨면 false(= 쿠팡 미타겟 / 필수 없음).
 */
async function waitForMandatorySection(page: Page): Promise<boolean> {
  for (let i = 0; i < 12; i += 1) {
    if (await isMandatorySectionVisible(page)) return true;
    await page.waitForTimeout(1_000);
  }
  return false;
}

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
  }, MANDATORY_MATCH_LABEL);
}

/**
 * "쿠팡 필수 옵션그룹 추가" 영역의 옵션값 input 을 아무 숫자로 채운다.
 * 이 영역은 필수 수 > 내 옵션그룹 수 일 때만 렌더되며(윈들리가 미충족 필수명을 자동 표시),
 * 값 input 은 placeholder "옵션을 입력하세요"(문자형) / "숫자를 입력하세요"(숫자+단위형) 로
 * 일반 옵션행("옵션명을 입력하세요")과 구분된다. 단위 radio 는 첫 항목이 기본 선택돼 있어 건드리지 않는다.
 * 이미 숫자가 들어있으면 유지(멱등). 여러 개면 전부 채운다.
 * @returns 새로 채운 input 수.
 */
async function fillMandatoryAddSection(page: Page): Promise<number> {
  const inputs = page.locator(ADD_SECTION_INPUT_SELECTOR);
  const count = await inputs.count();
  if (count === 0) {
    logger.info('[add_section] "쿠팡 필수 옵션그룹 추가" 영역 없음 — skip');
    return 0;
  }
  let filled = 0;
  for (let i = 0; i < count; i += 1) {
    const inp = inputs.nth(i);
    const cur = (await inp.inputValue().catch(() => '')).trim();
    if (/^\d+$/.test(cur)) {
      logger.info(`[add_section] ${i + 1}번째 이미 숫자(${cur}) — 유지`);
      continue;
    }
    await inp.scrollIntoViewIfNeeded().catch(() => undefined);
    await inp.click();
    await inp.fill(String(i + 1)); // 아무 숫자면 됨
    await inp.press('Tab');
    await page.waitForTimeout(1_500);
    filled += 1;
    logger.info(`[add_section] ${i + 1}번째 옵션값 → ${i + 1}`);
  }
  return filled;
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
  }, MANDATORY_MATCH_LABEL);
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
    { sectionText: MANDATORY_MATCH_LABEL, rowIndex, name },
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
 * 비파괴 매칭: 윈들리 자동매칭(그룹명 기준 info 선택)은 그대로 두고, 아직 아무 필수명도
 * 선택 안 된 그룹만 "아직 안 쓰인" 필수명으로 채운다.
 *   - 색상 그룹이 이미 '색상'으로 자동 매칭돼 있으면 건드리지 않는다(의미 보존).
 *   - 미선택 그룹은 남는 필수명을 순서대로 배정.
 *   - 남는 필수명이 없으면(그룹 수 > 필수 수) 그 초과 그룹은 그대로 둔다(추가 삭제 없음).
 * @returns { matched: 실제 그룹 중 매칭된 수, groups: 전체 실제 그룹 수 }.
 */
async function assignUnmatchedGroups(
  page: Page,
  effectiveNames: string[],
): Promise<{ matched: number; groups: number }> {
  for (let guard = 0; guard < effectiveNames.length * 2 + 4; guard += 1) {
    const matches = await readGroupMatches(page);
    const used = new Set(matches.filter((m) => m.length > 0));
    const unmatchedIdx = matches.findIndex((m) => m.length === 0);
    if (unmatchedIdx < 0) break; // 실제 그룹 전부 매칭됨
    const name = effectiveNames.find((n) => !used.has(n));
    if (name === undefined) break; // 남는 필수명 없음 (그룹 수 > 필수 수)
    const ok = await clickTagInRow(page, unmatchedIdx, name);
    if (!ok) {
      logger.info(`[match] 그룹 ${unmatchedIdx + 1} → "${name}" 매칭 실패 (비활성/미발견)`);
      break;
    }
    logger.info(`[match] 그룹 ${unmatchedIdx + 1} → ${name} 매칭`);
  }
  const final = await readGroupMatches(page);
  return { matched: final.filter((m) => m.length > 0).length, groups: final.length };
}

interface CollectedGroup {
  key: string;
  units: string[];
  /** 옵션 id → 현재 값 (스크롤 수집, DOM 순서 유지). */
  options: Array<{ id: string; value: string }>;
}

/**
 * 옵션 리스트를 끝까지 스크롤하며 **모든** 옵션을 그룹별로 수집(가상화 대응).
 * 옵션 id(option_input_<id>)로 dedup 하므로 mount/unmount 와 무관하게 전수 확보.
 */
async function collectAllOptions(page: Page): Promise<CollectedGroup[]> {
  // 그룹 키를 DOM 순서로 확보 (name input).
  const keys = await page.evaluate(() => {
    const isNI = (el: Element): boolean => {
      const c = el.getAttribute('class') ?? '';
      return (
        el.tagName === 'INPUT' &&
        /(^|\s)option-group-[\w-]/.test(c) &&
        !c.includes('option-group-active')
      );
    };
    return (Array.from(document.querySelectorAll('input')) as HTMLInputElement[])
      .filter(isNI)
      .map((ni) => (ni.getAttribute('class') ?? '').match(/option-group-([^\s]+)/)?.[1] ?? '')
      .filter((k) => k.length > 0);
  });

  const groups: CollectedGroup[] = [];
  for (const key of keys) {
    // 옵션 행은 viewport 기준 IntersectionObserver 로 가상화된다(sesame SortableOptionWithIntersection).
    // window/컨테이너 스크롤만으론 화면 밖 그룹(수량 등)이 viewport 에 안 들어와 영영 렌더 안 됨.
    // 그룹 헤더를 scrollIntoViewIfNeeded 로 viewport 에 넣어(=Playwright 가 올바른 스크롤 컨테이너 처리)
    // 렌더를 트리거한 뒤, 이 그룹 컨테이너를 내부 스크롤하며 `option_input_<key>:` 를 전수 수집.
    await page
      .locator(`input[class*="option-group-${key}"]`)
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => undefined);
    await page.evaluate(bringGroupToTopFn, key).catch(() => undefined);
    await page.waitForTimeout(600);
    await page.evaluate(scrollOneGroupContainerToTopFn, key).catch(() => undefined);
    await page.waitForTimeout(300);

    const optMap = new Map<string, string>();
    for (let s = 0; s < 25; s += 1) {
      // 그룹2(추가된 그룹) 옵션은 className 이 `option_input_<uuid>`(그룹 접두사 없음)이고,
      // 그룹1(원본 수집) 은 `option_input_<groupId>:<uuid>` 다. 접두사에 의존하지 말고 **그룹 카드
      // DOM 소속** 으로 옵션을 수집한다 (name input → 카드 → 카드 안 option_input).
      const snap = await page.evaluate((k: string) => {
        const norm = (x: string | null): string => (x ?? '').trim();
        const isNI = (el: Element): boolean => {
          const c = el.getAttribute('class') ?? '';
          return el.tagName === 'INPUT' && /(^|\s)option-group-[\w-]/.test(c) && !c.includes('option-group-active');
        };
        const ni = Array.from(document.querySelectorAll('input')).find((i) =>
          (i.getAttribute('class') ?? '').split(/\s+/).includes(`option-group-${k}`),
        );
        let card: Element | null = ni?.parentElement ?? null;
        for (let up = 0; up < 14 && card !== null; up += 1) {
          const parent: Element | null = card.parentElement;
          if (parent && Array.from(parent.querySelectorAll('input')).filter(isNI).length > 1) break;
          card = parent;
        }
        if (card === null) return [] as Array<{ id: string; value: string }>;
        return (Array.from(card.querySelectorAll('input')) as HTMLInputElement[])
          .filter((i) => /(^|\s)option_input_/.test(i.getAttribute('class') ?? ''))
          .map((i) => ({
            id: (i.getAttribute('class') ?? '').match(/option_input_([^\s]+)/)?.[1] ?? '',
            value: norm(i.value),
          }));
      }, key);
      for (const o of snap) if (o.id.length > 0) optMap.set(o.id, o.value);
      const moved = await page.evaluate(stepScrollOneGroupContainerFn, key);
      await page.waitForTimeout(250);
      if (!moved) break;
    }
    groups.push({
      key,
      units: [],
      options: [...optMap.entries()].map(([id, value]) => ({ id, value })),
    });
  }

  // 단위(입력 가능한 옵션)는 그룹 카드 DOM 구간 기반으로 권위있게 읽는다(keyByY 미의존).
  const unitMap = await page.evaluate(readGroupUnitsFn);
  for (const g of groups) {
    if (unitMap[g.key] !== undefined) g.units = unitMap[g.key];
  }
  return groups;
}

/** 가상화된 옵션 input(option_input_<id>)을 렌더될 때까지 스크롤로 찾아 value 로 채운다. */
async function scrollAndFillOption(page: Page, groupKey: string, id: string, value: string): Promise<boolean> {
  const sel = `input[class*="option_input_${id}"]`;
  // 옵션 행은 viewport 기준 가상화 — 그룹 key 로 그룹 헤더를 먼저 viewport 상단에 넣어야 그 그룹 옵션
  // 컨테이너가 렌더된다(그룹2 옵션 id 는 그룹 접두사가 없어 id 로 그룹 추론 불가 → key 명시 필수).
  const gk = groupKey;
  if (gk.length > 0) {
    await page
      .locator(`input[class*="option-group-${gk}"]`)
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => undefined);
    await page.evaluate(bringGroupToTopFn, gk).catch(() => undefined);
    await page.waitForTimeout(400);
    await page.evaluate(scrollOneGroupContainerToTopFn, gk).catch(() => undefined);
    await page.waitForTimeout(200);
  }
  for (let s = 0; s < 20; s += 1) {
    if ((await page.locator(sel).count()) > 0) break;
    let moved: boolean;
    if (gk.length > 0) {
      moved = await page.evaluate(stepScrollOneGroupContainerFn, gk);
    } else {
      moved = await page.evaluate(stepScrollOptionContainersFn);
    }
    await page.waitForTimeout(250);
    if (!moved) {
      if (gk.length > 0) {
        await page.evaluate(scrollOneGroupContainerToTopFn, gk).catch(() => undefined);
      } else {
        await page.evaluate(scrollOptionContainersToTopFn).catch(() => undefined);
      }
      await page.waitForTimeout(250);
    }
  }
  const loc = page.locator(sel).first();
  if ((await loc.count()) === 0) {
    logger.info(`[fill] 옵션 ${id} 미발견(스크롤 후에도)`);
    return false;
  }
  await loc.scrollIntoViewIfNeeded().catch(() => undefined);
  await loc.click();
  await loc.fill(value);
  await loc.press('Tab');
  await page.waitForTimeout(1_200);
  logger.info(`[fill] 옵션 → ${value}`);
  return true;
}

/**
 * 옵션값 전역 수정: 그룹별 **전체** 옵션 기준으로 중복/형식위반/빈값을 고유값으로 교체.
 *  - 단위 그룹: `^\d+(\.\d+)?(단위들)$` 위반/중복인 옵션을 그룹 전역에서 안 겹치는 `${n}${unit}`
 *    (generic 단위 — g/cm/ml/개…)로. 이미 유효+고유한 값(첫 등장)은 보존.
 *  - 단위 없는 그룹: 빈/중복만 "옵션N".
 * 가상화로 중복 짝이 같은 화면에 안 떠도, 전수 수집 후 전역 판정하므로 누락 없음.
 * @returns 적용한 fix 수.
 */
async function fixOptionValues(page: Page): Promise<number> {
  const groups = await collectAllOptions(page);
  let applied = 0;
  for (const g of groups) {
    const unit = g.units[0] ?? '';
    const re = g.units.length > 0 ? new RegExp(`^\\d+(\\.\\d+)?(${g.units.join('|')})$`) : null;
    const used = new Set<string>();
    const seen = new Set<string>();
    const fixes: Array<{ id: string; value: string }> = [];
    for (const opt of g.options) {
      const v = opt.value;
      const valid = re !== null ? re.test(v) : v.length > 0;
      if (valid && !seen.has(v)) {
        seen.add(v);
        used.add(v);
        continue;
      }
      let value = '';
      if (unit.length > 0) {
        let n = 1;
        while (used.has(`${n}${unit}`)) n += 1;
        value = `${n}${unit}`;
      } else {
        let n = 1;
        while (used.has(`옵션${n}`)) n += 1;
        value = `옵션${n}`;
      }
      used.add(value);
      fixes.push({ id: opt.id, value });
    }
    for (const f of fixes) {
      const ok = await scrollAndFillOption(page, g.key, f.id, f.value);
      if (ok) applied += 1;
    }
  }
  return applied;
}

/**
 * 브라우저 컨텍스트 실행용 — 옵션 리스트 스크롤 컨테이너(sesame OptionListContainer, overflow:auto
 * max-height:480px)를 맨 위로. 기존엔 이미 렌더된 option_input 에서 조상을 거슬러 컨테이너를 찾아,
 * 가상화로 아무 행도 안 뜬 그룹(화면 밖 수량 그룹 등)의 컨테이너를 못 찾는 닭-달걀 문제가 있었다.
 * name input → 그룹 카드 → 카드 안 overflow 스크롤 div 로 렌더 여부와 무관하게 찾는다.
 */
function scrollOptionContainersToTopFn(): void {
  const isGroupNameInput = (el: Element): boolean => {
    const c = el.getAttribute('class') ?? '';
    return el.tagName === 'INPUT' && /(^|\s)option-group-[\w-]/.test(c) && !c.includes('option-group-active');
  };
  const nameInputs = Array.from(document.querySelectorAll('input')).filter(isGroupNameInput);
  const containers = new Set<HTMLElement>();
  for (const ni of nameInputs) {
    let card: Element | null = ni.parentElement;
    for (let up = 0; up < 14 && card !== null; up += 1) {
      const parent: Element | null = card.parentElement;
      if (parent && Array.from(parent.querySelectorAll('input')).filter(isGroupNameInput).length > 1) break;
      card = parent;
    }
    if (card === null) continue;
    // getComputedStyle 을 카드 전 descendant 에 부르면 매우 느리다(타임아웃). 먼저 값싼
    // scrollHeight>clientHeight 로 스크롤 가능 후보만 추린 뒤, 그 소수에만 getComputedStyle 로
    // overflow:auto/scroll(진짜 OptionListContainer) 을 확인 — 정확성(그룹2 컨테이너 포착)+속도 둘 다.
    for (const d of Array.from(card.querySelectorAll('*')) as HTMLElement[]) {
      if (d.scrollHeight <= d.clientHeight + 5) continue;
      const oy = getComputedStyle(d).overflowY;
      if (oy === 'auto' || oy === 'scroll') containers.add(d);
    }
  }
  containers.forEach((c) => {
    c.scrollTop = 0;
  });
}

/** 브라우저 컨텍스트 실행용 — 옵션 컨테이너 + 윈도우를 한 스텝 내림. 더 못 내려가면 false. */
function stepScrollOptionContainersFn(): boolean {
  const isGroupNameInput = (el: Element): boolean => {
    const c = el.getAttribute('class') ?? '';
    return el.tagName === 'INPUT' && /(^|\s)option-group-[\w-]/.test(c) && !c.includes('option-group-active');
  };
  const nameInputs = Array.from(document.querySelectorAll('input')).filter(isGroupNameInput);
  const containers = new Set<HTMLElement>();
  for (const ni of nameInputs) {
    let card: Element | null = ni.parentElement;
    for (let up = 0; up < 14 && card !== null; up += 1) {
      const parent: Element | null = card.parentElement;
      if (parent && Array.from(parent.querySelectorAll('input')).filter(isGroupNameInput).length > 1) break;
      card = parent;
    }
    if (card === null) continue;
    // getComputedStyle 을 카드 전 descendant 에 부르면 매우 느리다(타임아웃). 먼저 값싼
    // scrollHeight>clientHeight 로 스크롤 가능 후보만 추린 뒤, 그 소수에만 getComputedStyle 로
    // overflow:auto/scroll(진짜 OptionListContainer) 을 확인 — 정확성(그룹2 컨테이너 포착)+속도 둘 다.
    for (const d of Array.from(card.querySelectorAll('*')) as HTMLElement[]) {
      if (d.scrollHeight <= d.clientHeight + 5) continue;
      const oy = getComputedStyle(d).overflowY;
      if (oy === 'auto' || oy === 'scroll') containers.add(d);
    }
  }
  let moved = false;
  containers.forEach((c) => {
    const before = c.scrollTop;
    c.scrollTop = Math.min(c.scrollTop + Math.max(c.clientHeight * 0.6, 120), c.scrollHeight);
    if (c.scrollTop !== before) moved = true;
  });
  const wy = window.scrollY;
  window.scrollBy(0, Math.round(window.innerHeight * 0.6));
  if (window.scrollY !== wy) moved = true;
  return moved;
}

/**
 * 브라우저 컨텍스트 실행용 — key 그룹 헤더(name input)를 viewport **상단** 으로 끌어온다.
 * scrollIntoViewIfNeeded 는 헤더를 viewport 하단 가장자리에 정렬해 그 아래 480px 옵션 컨테이너가 화면
 * 밖에 남아 가상화 행이 안 뜬다. ni 의 모든 조상 스크롤 컨테이너 + 윈도우를 조정해 ni 를 top~120px 에 둔다.
 */
function bringGroupToTopFn(key: string): void {
  const isNI = (el: Element): boolean => {
    const c = el.getAttribute('class') ?? '';
    return el.tagName === 'INPUT' && /(^|\s)option-group-[\w-]/.test(c) && !c.includes('option-group-active');
  };
  const ni = Array.from(document.querySelectorAll('input')).find((i) =>
    (i.getAttribute('class') ?? '').split(/\s+/).includes(`option-group-${key}`),
  );
  if (!ni) return;
  let el: Element | null = (ni as HTMLElement).parentElement;
  while (el !== null) {
    const cs = getComputedStyle(el);
    if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 5) {
      const niTop = ni.getBoundingClientRect().top;
      const elTop = el.getBoundingClientRect().top;
      el.scrollTop += niTop - elTop - 20;
    }
    el = el.parentElement;
  }
  window.scrollBy(0, ni.getBoundingClientRect().top - 120);
}

/** 브라우저 컨텍스트 실행용 — key 그룹의 옵션 리스트 스크롤 컨테이너만 맨 위로. */
function scrollOneGroupContainerToTopFn(key: string): void {
  const isNI = (el: Element): boolean => {
    const c = el.getAttribute('class') ?? '';
    return el.tagName === 'INPUT' && /(^|\s)option-group-[\w-]/.test(c) && !c.includes('option-group-active');
  };
  const ni = Array.from(document.querySelectorAll('input')).find((i) =>
    (i.getAttribute('class') ?? '').split(/\s+/).includes(`option-group-${key}`),
  );
  if (!ni) return;
  let card: Element | null = ni.parentElement;
  for (let up = 0; up < 14 && card !== null; up += 1) {
    const parent: Element | null = card.parentElement;
    if (parent && Array.from(parent.querySelectorAll('input')).filter(isNI).length > 1) break;
    card = parent;
  }
  if (card === null) return;
  // prefilter(scrollHeight>clientHeight) 없이 overflow 만으로 감지 — 아직 행이 안 뜬(=스크롤 불가)
  // 컨테이너도 잡아야 bootstrap 된다(스크롤→viewport 진입→행 렌더→다음 스텝 스크롤 가능). per-group 이라 스캔 범위 작음.
  for (const d of Array.from(card.querySelectorAll('*')) as HTMLElement[]) {
    const oy = getComputedStyle(d).overflowY;
    if (oy === 'auto' || oy === 'scroll') d.scrollTop = 0;
  }
}

/** 브라우저 컨텍스트 실행용 — key 그룹의 옵션 리스트 컨테이너를 한 스텝 내림. 더 못 내려가면 false. */
function stepScrollOneGroupContainerFn(key: string): boolean {
  const isNI = (el: Element): boolean => {
    const c = el.getAttribute('class') ?? '';
    return el.tagName === 'INPUT' && /(^|\s)option-group-[\w-]/.test(c) && !c.includes('option-group-active');
  };
  const ni = Array.from(document.querySelectorAll('input')).find((i) =>
    (i.getAttribute('class') ?? '').split(/\s+/).includes(`option-group-${key}`),
  );
  if (!ni) return false;
  let card: Element | null = ni.parentElement;
  for (let up = 0; up < 14 && card !== null; up += 1) {
    const parent: Element | null = card.parentElement;
    if (parent && Array.from(parent.querySelectorAll('input')).filter(isNI).length > 1) break;
    card = parent;
  }
  if (card === null) return false;
  let moved = false;
  for (const d of Array.from(card.querySelectorAll('*')) as HTMLElement[]) {
    const oy = getComputedStyle(d).overflowY;
    if (oy !== 'auto' && oy !== 'scroll') continue;
    const before = d.scrollTop;
    d.scrollTop = Math.min(d.scrollTop + Math.max(d.clientHeight * 0.6, 120), d.scrollHeight);
    if (d.scrollTop !== before) moved = true;
  }
  return moved;
}

/**
 * 브라우저 컨텍스트 실행용 — 각 옵션그룹 카드의 "입력 가능한 옵션" 단위(개/박스/세트 등)를 그룹 key 별로 읽는다.
 * 전역 y좌표(keyByY)에 의존하면 가상화·스크롤 타이밍 때문에 수량 그룹의 단위를 통째로 놓쳐(units=[]) 옵션값이
 * 알파벳으로 남는 문제가 있었다. 대신 각 그룹 name input 에서 조상으로 올라가되 다른 그룹 name input 을
 * 포함하기 직전(= 그 그룹 카드)에서만 라벨을 찾아 자기 카드의 단위만 정확히 귀속한다.
 */
function readGroupUnitsFn(): Record<string, string[]> {
  const norm = (s: string | null): string => (s ?? '').trim();
  const isGroupNameInput = (el: Element): boolean => {
    const c = el.getAttribute('class') ?? '';
    return (
      el.tagName === 'INPUT' &&
      /(^|\s)option-group-[\w-]/.test(c) &&
      !c.includes('option-group-active')
    );
  };
  const nameInputs = Array.from(document.querySelectorAll('input')).filter(isGroupNameInput);
  const out: Record<string, string[]> = {};
  for (const ni of nameInputs) {
    const key = (ni.getAttribute('class') ?? '').match(/option-group-([^\s]+)/)?.[1] ?? '';
    if (key.length === 0) continue;
    let el: Element | null = ni.parentElement;
    let units: string[] = [];
    for (let up = 0; up < 10 && el !== null; up += 1) {
      if (Array.from(el.querySelectorAll('input')).filter(isGroupNameInput).length > 1) break;
      const label = Array.from(el.querySelectorAll('*')).find(
        (e) => e.children.length === 0 && norm(e.textContent) === '입력 가능한 옵션',
      );
      if (label) {
        const parent = label.parentElement;
        const sibLeaves = parent
          ? Array.from(parent.querySelectorAll('*')).filter((e) => e.children.length === 0)
          : [];
        for (let j = sibLeaves.indexOf(label) + 1; j > 0 && j < sibLeaves.length; j += 1) {
          const t = norm(sibLeaves[j].textContent);
          if (t.length > 0) {
            units = t
              .split(',')
              .map((u) => u.trim())
              .filter((u) => u.length > 0);
            break;
          }
        }
        break;
      }
      el = el.parentElement;
    }
    out[key] = units;
  }
  return out;
}

/**
 * 모든 옵션그룹의 윈들리 "A-Z" 버튼을 눌러 옵션값을 알파벳(A,B,C…)으로 일괄 정규화.
 * (#4 옵션 A-Z 정규화 TC 의 apply_a_z 패턴을 그룹 전체로 확장.)
 *  - 각 "A-Z" 버튼 클릭 → .anchored-modal 의 icon-only sub 버튼 클릭 → 적용.
 *  - 다음 그룹 처리 전 모달이 남지 않도록 Escape 로 정리.
 *  - 멱등(이미 A-Z 면 동일 결과)이라 재실행 안전.
 * @returns A-Z 를 적용한 그룹 수.
 */
async function applyAZToAllGroups(page: Page): Promise<number> {
  const azBtns = page.getByRole('button', { name: /^A-Z$/ });
  const count = await azBtns.count();
  logger.info(`[apply_a_z] A-Z 버튼 ${count}개 발견`);
  if (count === 0) return 0;
  let applied = 0;
  for (let i = 0; i < count; i += 1) {
    const btn = azBtns.nth(i);
    if ((await btn.count()) === 0) continue;
    await btn.scrollIntoViewIfNeeded().catch(() => undefined);
    await btn.click().catch(() => undefined);
    await page.waitForTimeout(700);
    const subSel = await page.evaluate((idx: number) => {
      const modals = Array.from(document.querySelectorAll('.anchored-modal')) as HTMLElement[];
      for (const modal of modals) {
        const mr = modal.getBoundingClientRect();
        if (mr.width === 0 || mr.height === 0) continue;
        const btns = Array.from(modal.querySelectorAll('button')) as HTMLButtonElement[];
        for (const b of btns) {
          const br = b.getBoundingClientRect();
          if (br.width === 0 || br.height === 0) continue;
          if ((b.textContent ?? '').trim().length > 0) continue;
          if (b.querySelector('svg') === null) continue;
          const uniq = `__atc_az_${idx}`;
          b.setAttribute('data-atc-az', uniq);
          return `[data-atc-az="${uniq}"]`;
        }
      }
      return '';
    }, i);
    if (subSel === '') {
      logger.info(`[apply_a_z] 그룹 ${i + 1} 모달 sub 버튼 미발견 — skip`);
      await page.keyboard.press('Escape').catch(() => undefined);
      continue;
    }
    await page.locator(subSel).first().click({ timeout: 5_000 }).catch(() => undefined);
    await page.waitForTimeout(1_500);
    await page
      .evaluate((sel: string) => document.querySelector(sel)?.removeAttribute('data-atc-az'), subSel)
      .catch(() => undefined);
    await page.keyboard.press('Escape').catch(() => undefined);
    await page.waitForTimeout(300);
    applied += 1;
    logger.info(`[apply_a_z] 그룹 ${i + 1} A-Z 적용`);
  }
  return applied;
}

async function fillGroups(page: Page): Promise<void> {
  // 2026-07: 그룹명 "그룹 N" 리네임 폐기 — 매칭이 라벨이 아니라 태그(info) 기준으로 바뀌어
  // 라벨 오검사 위험이 없고, 리네임이 윈들리 자동매칭(그룹명 기준)을 되레 깰 수 있음.
  // 1) 옵션명 A-Z 정규화 — 윈들리 "A-Z" 버튼으로 옵션값을 알파벳 일괄 정규화 (모든 그룹).
  await applyAZToAllGroups(page);
  // 2) 옵션값 전역 보정 — A-Z 후에도 남는 쿠팡 단위형식 위반/중복/빈값을 그룹 전역 고유값으로 교체.
  //    가상화로 숨은 옵션까지 전수 수집. race(stale 클로저 revert)로 되살아날 수 있어 0건 수렴까지 반복.
  for (let round = 0; round < 3; round += 1) {
    const fixes = await fixOptionValues(page);
    if (fixes === 0) break;
    logger.info(`[fill] 옵션값 라운드 ${round + 1}: ${fixes}건 수정 — 재수집/재검사`);
    await page.waitForTimeout(1_500);
  }
}

const matchOptionGroupsStep: StepHandler = async (page) => {
  // 0) 필수 매칭 행 렌더 대기 (쿠팡 카테고리 fetch race).
  if (!(await waitForMandatorySection(page))) {
    return {
      ok: false as const,
      error_key: 'coupang_mandatory_section_absent' as ErrorKey,
      message:
        '쿠팡 필수 옵션그룹명 매칭 행 미노출 — 쿠팡이 업로드 대상이 아니거나 카테고리에 필수 옵션그룹이 없음',
    };
  }

  const state = await readMatchState(page);
  logger.info(
    `[match_option_groups] 현재 그룹=${state.groupCount}, 필수=${state.recommendedNames.length} [${state.recommendedNames.join(', ')}]`,
  );

  if (state.recommendedNames.length === 0) {
    return {
      ok: false as const,
      error_key: 'no_mandatory_option_groups' as ErrorKey,
      message: '필수 옵션그룹명을 읽지 못함 (카테고리 필수 없음)',
    };
  }

  // "(택N)" 묶음은 택일 — 같은 N 은 하나만 매칭하면 됨 (윈들리 validateOption).
  const effectiveNames = collapseChooseOneNames(state.recommendedNames);
  if (effectiveNames.length !== state.recommendedNames.length) {
    logger.info(
      `[match_option_groups] (택N) 택일 적용: ${state.recommendedNames.length} → ${effectiveNames.length} [${effectiveNames.join(', ')}]`,
    );
  }

  // 1) 태그 매칭 (비파괴) — 그룹 add/delete 없음. 윈들리 자동매칭 유지 + 미선택 그룹만 채움.
  const { matched, groups } = await assignUnmatchedGroups(page, effectiveNames);
  if (matched < groups) {
    return {
      ok: false as const,
      error_key: 'option_group_match_incomplete' as ErrorKey,
      message: `매칭 미완료: 실제 옵션그룹 ${groups}개 중 ${matched}개만 필수명 매칭됨 (필수 수 부족/Tag 비활성)`,
    };
  }
  logger.info(`[match_option_groups] 실제 그룹 매칭 완료 ${matched}/${groups}`);

  // 2) "쿠팡 필수 옵션그룹 추가" 영역이 있으면(필수 수 > 내 그룹 수) 옵션값에 아무 숫자 입력.
  const addFilled = await fillMandatoryAddSection(page);
  if (addFilled > 0) {
    logger.info(`[match_option_groups] 필수 옵션그룹 추가 영역 ${addFilled}건 채움`);
  }

  // 3) 실제 그룹 옵션값 A-Z 정규화 + 고유·단위형식 보정.
  await fillGroups(page);

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
 * 이 TC 의 검증 대상 탭 — 옵션그룹 매칭(옵션) + 옵션가 기준 선택(판매가) 만.
 * 업로드 설정·기본 정보·이미지·상품 속성·상세페이지 등은 이 TC 의 책임이 아니므로
 * red 여도 실패로 보지 않는다 (갓 수집 상품의 무관 탭 red 로 인한 flaky 제거).
 * 단 무관 탭 red 는 로그로 남겨 가시성은 유지한다.
 */
const ERROR_CHECK_SCOPE_TABS = ['옵션', '판매가'] as const;

/**
 * 실제 윈들리 에러체크 실행 → 옵션·판매가 탭의 빨간(에러) dot 0건 검증.
 * 스코프 탭이 빨가면 그 탭으로 이동해 빨간 필드 위치를 진단으로 수집한다.
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
  const inScopeRed = redTabs.filter((t) => ERROR_CHECK_SCOPE_TABS.includes(t as (typeof ERROR_CHECK_SCOPE_TABS)[number]));
  const outOfScopeRed = redTabs.filter((t) => !ERROR_CHECK_SCOPE_TABS.includes(t as (typeof ERROR_CHECK_SCOPE_TABS)[number]));
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

  if (inScopeRed.length > 0) {
    // 스코프(옵션·판매가) 빨간 탭으로 이동해 빨간 필드 진단 수집.
    const diagnostics: string[] = [];
    for (const tabName of inScopeRed) {
      const moved = await clickTab(page, tabName);
      if (!moved) continue;
      const fields = await readRedFieldLocations(page);
      const labels = fields.map((f) => f.label || `${f.tag}@(${f.x},${f.y})`).slice(0, 6);
      diagnostics.push(`${tabName}[${labels.join(', ') || '필드 미특정'}]`);
    }
    const tail = outOfScopeRed.length > 0 ? ` (스코프 외 red 무시: ${outOfScopeRed.join(', ')})` : '';
    // 빨간 탭을 탭별 복구 key 로 반환 → runner 전역 자동복구가 recoveries/tab_<탭>_error 를
    // 자동 시도 (복구 성공 시 이 step 재실행으로 재검증, 실패 시 '복구 후 재발' unhandled).
    // 매핑 안 되는 탭(이론상 없음)은 generic error_check_failed 로 폴백.
    const SCOPE_TAB_TO_KEY: Record<string, ErrorKey> = {
      옵션: 'tab_option_error',
      판매가: 'tab_price_error',
    };
    const firstRed = inScopeRed[0];
    const recoveryKey: ErrorKey = SCOPE_TAB_TO_KEY[firstRed] ?? ('error_check_failed' as ErrorKey);
    return {
      ok: false as const,
      error_key: recoveryKey,
      message: `에러체크 빨간 에러 탭(옵션/판매가) ${inScopeRed.length}건: ${diagnostics.join(' / ') || inScopeRed.join(', ')}${tail}`,
    };
  }

  logger.info(
    `[error_check] 옵션·판매가 red 0건 — 통과` +
      `${outOfScopeRed.length > 0 ? ` (스코프 외 red 무시: ${outOfScopeRed.join(', ')})` : ''}` +
      `${sum.yellow > 0 ? ` (노란 경고 ${sum.yellow}건: ${yellowTabs.join(', ')})` : ''}`,
  );
  return { ok: true as const };
};

export const coupangOptionGroupMatchHandlers: StepHandlers = {
  open_collected_list: openCollectedListStep,
  open_target_product: openTargetProductStep,
  open_option_tab: openOptionTabStep,
  match_option_groups: matchOptionGroupsStep,
  select_base_sku: selectBaseSkuStep,
  error_check: errorCheckStep,
};
