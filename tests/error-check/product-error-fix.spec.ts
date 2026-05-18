/**
 * 수집상품 에러체크 - 모든 탭 walk-through 자동 수정 ATC — Playwright spec
 *
 * 대응 ATC: atcs/error-check/product-error-fix.atc.yml
 *
 * 새 접근 (사용자 가이드):
 *   기존: 에러체크 → 빨간 탭 detect → on_error 매핑 → recoveries/<key>.ts → restart
 *   변경: 에러체크 → 7개 탭 모두 한번씩 진입 → 각 탭에서 fixTabErrors 즉시 호출 →
 *         pass 단위 반복 (max 3) → 마지막에 verify
 *
 * 장점:
 *   - 빨간 dot 만으로 detect 안 되는 에러 (배너만 있고 dot 색이 yellow 인 케이스 등) 도 잡힘
 *   - on_error/recovery 분기 없이 단일 step 안에서 모든 fix 시도
 *   - 한 탭의 fix 가 다른 탭에 영향을 주는 cascade 도 multi-pass 로 흡수
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
  goToCollectedProducts,
  openFirstSearchResult,
  searchByProductCode,
} from '../../lib/windly-actions';
import { walkAndFixTab } from '../../lib/tab-error-fix';
import { logger } from '../../lib/logger';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'error-check',
  'product-error-fix.atc.yml',
);

/** windly 상품 상세의 탭 7개. 좌→우 순서. */
const TAB_NAMES = [
  '기본 정보',
  '이미지',
  '옵션',
  '판매가',
  '상품 속성',
  '상세페이지',
  '업로드 설정',
];

/** Material Design check icon SVG path 시그니처 (에러체크 트리거 버튼 식별). */
const CHECKMARK_PATH_SIG = 'M9 16.17L4.83 12L3.41 13.41L9 19L21 7';

const TAB_TO_KEY: Record<string, string> = {
  '기본 정보': 'tab_basic_error',
  이미지: 'tab_image_error',
  옵션: 'tab_option_error',
  판매가: 'tab_price_error',
  '상품 속성': 'tab_attribute_error',
  상세페이지: 'tab_detail_error',
  '업로드 설정': 'tab_upload_settings_error',
};

// ─────────────────────────────────────────────────────────────────────────────
// 공용 헬퍼
// ─────────────────────────────────────────────────────────────────────────────

/** 페이지 상단 체크마크 svg 아이콘 버튼 클릭 (에러체크 트리거). */
async function clickErrorCheckButton(
  page: import('@playwright/test').Page,
): Promise<boolean> {
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

/** 7개 탭의 dot 색상을 검사하여 status 배열 반환. */
async function readTabStatuses(
  page: import('@playwright/test').Page,
): Promise<{ name: string; status: 'red' | 'yellow' | 'green' | 'none' }[]> {
  return page.evaluate((tabNames: string[]) => {
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
    return tabNames.map((name) => {
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
  }, TAB_NAMES);
}

// ─────────────────────────────────────────────────────────────────────────────
// Step handlers
// (login / enter_workspace 는 setup project = tests/auth.setup.ts 가 처리)
// ─────────────────────────────────────────────────────────────────────────────

const openCollectedListStep: StepHandler = async (page, _inputs) => {
  await goToCollectedProducts(page);
  return { ok: true as const };
};

const searchProductStep: StepHandler = async (page, inputs) => {
  const id =
    typeof inputs['source_product_id'] === 'string'
      ? (inputs['source_product_id'] as string)
      : '';
  if (id.length === 0) {
    return {
      ok: false as const,
      error_key: 'missing_input' as ErrorKey,
      message: 'inputs.source_product_id 누락',
    };
  }
  const count = await searchByProductCode(page, id);
  if (count === 0) {
    return {
      ok: false as const,
      error_key: 'product_not_found' as ErrorKey,
      message: `상품 코드 ${id} 검색 결과 0개`,
    };
  }
  return { ok: true as const };
};

const openDetailStep: StepHandler = async (page, _inputs) => {
  try {
    await openFirstSearchResult(page);
    return { ok: true as const };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false as const,
      error_key: 'detail_open_failed' as ErrorKey,
      message: `상세 진입 실패: ${msg}`,
    };
  }
};

const triggerErrorCheckStep: StepHandler = async (page, _inputs) => {
  // 잔여 모달 정리.
  await page.keyboard.press('Escape').catch(() => undefined);
  await page.waitForTimeout(200);
  await page.keyboard.press('Escape').catch(() => undefined);
  await page.waitForTimeout(200);

  const ok = await clickErrorCheckButton(page);
  if (!ok) {
    return {
      ok: false as const,
      error_key: 'error_check_btn_not_found' as ErrorKey,
      message: '체크마크 svg 시그니처를 가진 에러체크 버튼 미발견',
    };
  }
  // 첫 트리거 후 status snapshot — 진단용 로그.
  const statuses = await readTabStatuses(page);
  logger.info(
    `[trigger_error_check] 초기 탭 상태: ${JSON.stringify(statuses)}`,
  );
  return { ok: true as const };
};

/**
 * 7개 탭을 순서대로 모두 진입하면서 각 탭의 에러를 즉시 fix 시도. multi-pass.
 *
 * pass 1: 모든 탭 한번씩 → fix counter 누적
 * pass 2: 1에서 1건이라도 fix 됐으면 다시 모든 탭 → fix
 * pass 3: 동일
 * pass 에서 0건이면 조기 종료.
 *
 * 각 탭에서 walkAndFixTab 호출 — fix 실행 또는 'no errors' / 'unfixable' 로 skip.
 * unfixable 은 본 step 에선 fail 로 처리하지 않음 (다음 pass / 다른 탭의 cascade 로 풀릴 수 있음).
 * 최종 판정은 verify_all_clean 에서.
 */
const walkTabsAndFixStep: StepHandler = async (page, _inputs) => {
  const MAX_PASSES = 3;
  const summary: Array<{ pass: number; tab: string; fixed: number; reason?: string }> = [];

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    let fixedThisPass = 0;
    logger.info(`[walk_tabs_and_fix] === pass ${pass + 1}/${MAX_PASSES} ===`);

    for (const tabName of TAB_NAMES) {
      const r = await walkAndFixTab(page, tabName);
      summary.push({ pass: pass + 1, tab: tabName, fixed: r.fixed, reason: r.reason });
      if (r.fixed > 0) {
        logger.info(
          `[walk_tabs_and_fix] [pass ${pass + 1}] [${tabName}] ${r.fixed}건 수정`,
        );
      } else if (r.reason !== undefined && r.reason !== 'no errors') {
        logger.warn(
          `[walk_tabs_and_fix] [pass ${pass + 1}] [${tabName}] skip: ${r.reason}`,
        );
      }
      fixedThisPass += r.fixed;
      // 탭 간 짧은 휴식.
      await page.waitForTimeout(300);
    }

    logger.info(
      `[walk_tabs_and_fix] pass ${pass + 1} 완료 — 이번 pass fix ${fixedThisPass}건`,
    );
    if (fixedThisPass === 0) {
      logger.info('[walk_tabs_and_fix] 더 이상 fix 할 게 없어 조기 종료');
      break;
    }
  }

  const totalFixed = summary.reduce((acc, s) => acc + s.fixed, 0);
  logger.info(
    `[walk_tabs_and_fix] 총 fix ${totalFixed}건 across ${summary.length} (pass×tab) 시도`,
  );
  return { ok: true as const };
};

const verifyAllCleanStep: StepHandler = async (page, _inputs) => {
  // 에러체크 재실행해서 dot 색상 갱신.
  await clickErrorCheckButton(page);
  const statuses = await readTabStatuses(page);
  logger.info(
    `[verify_all_clean] 최종 탭 상태: ${JSON.stringify(statuses)}`,
  );
  const reds = statuses.filter((s) => s.status === 'red');
  if (reds.length === 0) {
    return { ok: true as const };
  }
  // 빨간 탭이 남아 있으면 가장 첫 번째를 대표 error_key 로.
  const firstRed = reds[0];
  const key = (TAB_TO_KEY[firstRed.name] ?? 'tab_unknown_error') as ErrorKey;
  return {
    ok: false as const,
    error_key: key,
    message:
      `walk-through 후에도 빨간 탭 ${reds.length}개: ` +
      reds.map((r) => r.name).join(', ') +
      `. 전체 상태: ${JSON.stringify(statuses)}`,
  };
};

const handlers: StepHandlers = {
  open_collected_list: openCollectedListStep,
  search_product: searchProductStep,
  open_detail: openDetailStep,
  trigger_error_check: triggerErrorCheckStep,
  walk_tabs_and_fix: walkTabsAndFixStep,
  verify_all_clean: verifyAllCleanStep,
};

// ─────────────────────────────────────────────────────────────────────────────
// Test
// ─────────────────────────────────────────────────────────────────────────────

test('수집상품 에러체크 walk-through 자동 수정', async ({ page }) => {
  test.setTimeout(15 * 60_000);

  const atc = loadATC(ATC_PATH);
  const example = atc.inputs['source_product_id']?.example ?? '';
  const pickFirstNonEmpty = (...vals: (string | undefined)[]): string =>
    vals.find((v) => typeof v === 'string' && v.length > 0) ?? '';
  const inputs: Record<string, unknown> = {
    source_product_id: pickFirstNonEmpty(
      process.env['ATC_INPUT_SOURCE_PRODUCT_ID'],
      example,
    ),
  };

  const result = await runATC({ atc, page, inputs, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
