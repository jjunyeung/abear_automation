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

/** "(택N) 이름" 추천명에서 앞 "(택N) " 표시를 제거. 매칭은 ID 로 저장되므로 그룹명은 clean 으로. */
function stripChoosePrefix(name: string): string {
  return name.replace(/^\(택\d+\)\s*/, '').trim();
}

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
    // covered = recommendedNames(effective) 기준만 — 비-effective 매칭(개당중량 등)은 미커버로 본다.
    const covered = matches.filter((m) => recommendedNames.includes(m));
    const uncovered = recommendedNames.filter((n) => !covered.includes(n));
    if (uncovered.length === 0) break;
    // 빈 그룹 또는 비-effective 추천명에 매칭된 그룹을 재매칭 대상으로 (잔여 상태 robust).
    const targetRow = matches.findIndex((m) => m.length === 0 || !recommendedNames.includes(m));
    if (targetRow < 0) break; // 재매칭 가능한 그룹 없음
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
 * 그룹 라벨 정렬: 각 그룹 라벨을 자신의 ID-매칭 추천명(clean)으로 맞춘다.
 *  - 잔여/오염 라벨이 *다른* 추천속성명과 일치하면 validateOption 이 그 속성 기준으로 옵션값을
 *    오검사한다(예: 라벨 "개당 중량" → 수량 그룹의 "1개"에 g/kg 검사 적용 → red). 비어있지 않아도
 *    매칭명과 다르면 덮어쓴다. 매칭 없는 빈 라벨만 "옵션N" fallback. 라벨은 그룹 헤더라 가상화 영향 적음.
 */
async function fixGroupLabels(page: Page): Promise<void> {
  for (let guard = 0; guard < 12; guard += 1) {
    const cleanMatched = (await readGroupMatches(page)).map(stripChoosePrefix);
    const target = await page.evaluate((names: string[]) => {
      const norm = (s: string | null): string => (s ?? '').trim();
      const nameInputs = (
        Array.from(document.querySelectorAll('input')) as HTMLInputElement[]
      ).filter((inp) => {
        const cls = inp.getAttribute('class') ?? '';
        return /(^|\s)option-group-[0-9a-f]/.test(cls) && !cls.includes('option-group-active');
      });
      for (let gi = 0; gi < nameInputs.length; gi += 1) {
        const cur = norm(nameInputs[gi].value);
        const matched = names[gi] ?? '';
        if (matched.length > 0 && cur !== matched) {
          nameInputs[gi].setAttribute('data-atc-fill', '1');
          return { gi, value: matched };
        }
        if (matched.length === 0 && cur.length === 0) {
          nameInputs[gi].setAttribute('data-atc-fill', '1');
          return { gi, value: `옵션${gi + 1}` };
        }
      }
      return null;
    }, cleanMatched);
    if (target === null) break;
    const loc = page.locator('[data-atc-fill]').first();
    await loc.click();
    await loc.fill(target.value);
    await loc.press('Tab');
    await page.waitForTimeout(2_500);
    await page.evaluate(() =>
      document.querySelector('[data-atc-fill]')?.removeAttribute('data-atc-fill'),
    );
    logger.info(`[fill] 그룹 ${target.gi + 1} name → ${target.value}`);
  }
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
  await page.evaluate(scrollOptionContainersToTopFn).catch(() => undefined);
  await page.waitForTimeout(400);
  const acc = new Map<string, { order: number; units: string[]; options: Map<string, string> }>();
  let orderSeq = 0;
  for (let s = 0; s < 40; s += 1) {
    const snap = await page.evaluate(() => {
      const norm = (x: string | null): string => (x ?? '').trim();
      const yOf = (el: Element): number => el.getBoundingClientRect().y;
      const nameInputs = (
        Array.from(document.querySelectorAll('input')) as HTMLInputElement[]
      ).filter((i) => {
        const c = i.getAttribute('class') ?? '';
        return /(^|\s)option-group-[0-9a-f]/.test(c) && !c.includes('option-group-active');
      });
      const gMeta = nameInputs.map((ni) => ({
        key: (ni.getAttribute('class') ?? '').match(/option-group-([^\s]+)/)?.[1] ?? '',
        y: yOf(ni),
      }));
      const keyByY = (y: number): string => {
        let k = gMeta[0]?.key ?? '';
        for (const g of gMeta) if (g.y <= y) k = g.key;
        return k;
      };
      const unitsByKey: Record<string, string[]> = {};
      const leaves = Array.from(document.querySelectorAll('*')).filter((e) => e.children.length === 0);
      for (let i = 0; i < leaves.length; i += 1) {
        if (norm(leaves[i].textContent) !== '입력 가능한 옵션') continue;
        for (let j = i + 1; j < Math.min(i + 5, leaves.length); j += 1) {
          const t = norm(leaves[j].textContent);
          if (t.length > 0) {
            unitsByKey[keyByY(yOf(leaves[i]))] = t
              .split(',')
              .map((u) => u.trim())
              .filter((u) => u.length > 0);
            break;
          }
        }
      }
      const opts = (
        Array.from(document.querySelectorAll('input')) as HTMLInputElement[]
      ).filter((i) => /(^|\s)option_input_/.test(i.getAttribute('class') ?? ''));
      const optList = opts.map((i) => ({
        id: (i.getAttribute('class') ?? '').match(/option_input_(\S+)/)?.[1] ?? '',
        value: norm(i.value),
        groupKey: keyByY(yOf(i)),
      }));
      return { groupKeys: gMeta.map((g) => g.key), unitsByKey, optList };
    });
    for (const k of snap.groupKeys) {
      if (k.length > 0 && !acc.has(k)) acc.set(k, { order: orderSeq++, units: [], options: new Map() });
    }
    for (const [k, u] of Object.entries(snap.unitsByKey)) {
      const g = acc.get(k);
      if (g && u.length > 0) g.units = u;
    }
    for (const o of snap.optList) {
      const g = acc.get(o.groupKey);
      if (g && o.id.length > 0) g.options.set(o.id, o.value);
    }
    const moved = await page.evaluate(stepScrollOptionContainersFn);
    await page.waitForTimeout(500);
    if (!moved) break;
  }
  return [...acc.entries()]
    .sort((a, b) => a[1].order - b[1].order)
    .map(([key, g]) => ({
      key,
      units: g.units,
      options: [...g.options.entries()].map(([id, value]) => ({ id, value })),
    }));
}

/** 가상화된 옵션 input(option_input_<id>)을 렌더될 때까지 스크롤로 찾아 value 로 채운다. */
async function scrollAndFillOption(page: Page, id: string, value: string): Promise<boolean> {
  const sel = `input[class*="option_input_${id}"]`;
  for (let s = 0; s < 40; s += 1) {
    if ((await page.locator(sel).count()) > 0) break;
    const moved = await page.evaluate(stepScrollOptionContainersFn);
    await page.waitForTimeout(350);
    if (!moved) {
      await page.evaluate(scrollOptionContainersToTopFn).catch(() => undefined);
      await page.waitForTimeout(300);
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
  await page.waitForTimeout(2_500);
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
      const ok = await scrollAndFillOption(page, f.id, f.value);
      if (ok) applied += 1;
    }
  }
  return applied;
}

/** 브라우저 컨텍스트 실행용 — option_input_ 의 overflow 스크롤 컨테이너들을 맨 위로. */
function scrollOptionContainersToTopFn(): void {
  const opts = Array.from(document.querySelectorAll('input[class*="option_input_"]')) as HTMLElement[];
  const containers = new Set<HTMLElement>();
  for (const o of opts) {
    let el: HTMLElement | null = o.parentElement;
    while (el !== null) {
      if (el.scrollHeight > el.clientHeight + 5 && getComputedStyle(el).overflowY !== 'visible') {
        containers.add(el);
        break;
      }
      el = el.parentElement;
    }
  }
  containers.forEach((c) => {
    c.scrollTop = 0;
  });
}

/** 브라우저 컨텍스트 실행용 — 옵션 컨테이너 + 윈도우를 한 스텝 내림. 더 못 내려가면 false. */
function stepScrollOptionContainersFn(): boolean {
  const opts = Array.from(document.querySelectorAll('input[class*="option_input_"]')) as HTMLElement[];
  const containers = new Set<HTMLElement>();
  for (const o of opts) {
    let el: HTMLElement | null = o.parentElement;
    while (el !== null) {
      if (el.scrollHeight > el.clientHeight + 5 && getComputedStyle(el).overflowY !== 'visible') {
        containers.add(el);
        break;
      }
      el = el.parentElement;
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

async function fillGroups(page: Page): Promise<void> {
  // 1) 그룹 라벨 정렬 — 오염 라벨이 타 속성 검사를 유발하지 않도록 (가상화 영향 적은 헤더).
  await fixGroupLabels(page);
  // 2) 옵션값 전역 수정 — 가상화로 숨은 옵션까지 전수 수집해 그룹 전역 고유성 보장.
  //    race(stale 클로저 revert)로 되살아날 수 있어 0건 수렴까지 반복.
  for (let round = 0; round < 5; round += 1) {
    const fixes = await fixOptionValues(page);
    if (fixes === 0) break;
    logger.info(`[fill] 옵션값 라운드 ${round + 1}: ${fixes}건 수정 — 재수집/재검사`);
    await page.waitForTimeout(3_000);
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

  // "(택N)" 묶음은 택일 — 같은 N 은 하나만 매칭하면 됨 (groupNumber 단위 필수, 윈들리 validateOption).
  const effectiveNames = collapseChooseOneNames(state.recommendedNames);
  if (effectiveNames.length !== state.recommendedNames.length) {
    logger.info(
      `[match_option_groups] (택N) 택일 적용: ${state.recommendedNames.length} → ${effectiveNames.length} [${effectiveNames.join(', ')}]`,
    );
  }

  const target = effectiveNames.length;

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
  //    매칭 안 되는 그룹만 미매칭으로 남는다. (택N) 택일이 적용된 effectiveNames 만 매칭.
  const covered = await assignMatchableNames(page, effectiveNames);
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
    // 미매칭 그룹 또는 effectiveNames 에 없는 매칭(예: 택N 에서 안 고른 개당중량, 잔여 그룹) 우선 삭제.
    let gi = matches.findIndex((m) => m.length === 0 || !effectiveNames.includes(m));
    if (gi < 0) gi = matches.length - 1; // fallback: 마지막
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

  // 4) 그룹명(빈 라벨만) + 옵션값(고유·단위형식·비파괴) 채우기.
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
