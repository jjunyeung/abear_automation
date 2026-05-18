/**
 * 등록상품 맨 위 상품의 활성 마켓 아이콘 → 새창 검증 ATC — Playwright spec
 *
 * 대응 ATC: atcs/upload/top-product-market-popups.atc.yml
 *
 * 활성/비활성 검출 (1차 실행 trace 기반):
 *   - 등록상품 행의 "오픈마켓 링크" 셀은 마켓 수만큼 슬롯이 있고, 각 슬롯의
 *     <img> 가 활성/비활성 두 형태로 나타난다:
 *       활성:   <img cursor:pointer>             ← 직접 img, 클릭 가능
 *       비활성: <div><div><img></div></div>     ← 2중 wrapper, cursor 없음
 *   - 따라서 "활성"의 가장 강한 시그널은 computed cursor === 'pointer'.
 *     opacity / class / alt 키워드는 보조용도로 디버깅 시에만 참고.
 *
 * 검증 흐름:
 *   1) `a[href*="/view2/registered-product/"]` 의 첫 번째 → 그 행 ascend.
 *   2) 행 자식 셀 중 <img> 가 가장 많이 들어있는 셀 = 오픈마켓 링크 셀.
 *   3) 셀 안 <img> 중 cursor === 'pointer' 인 것만 활성 후보.
 *   4) 각 후보 좌표 click → context.waitForEvent('page') 로 팝업 잡고
 *      windly 자체 redirect 대기 후 외부 마켓 도메인 확인.
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
import { goToRegisteredProducts } from '../../lib/windly-actions';
import { logger } from '../../lib/logger';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'upload',
  'top-product-market-popups.atc.yml',
);

// ─────────────────────────────────────────────────────────────────────────────
// 도메인/마켓 상수
// ─────────────────────────────────────────────────────────────────────────────

/** 알려진 외부 마켓 도메인 패턴 (CLAUDE.md (a) 기반). */
const EXTERNAL_MARKET_DOMAIN_RE =
  /(smartstore\.naver|coupang|11st\.co\.kr|talkstore|store\.kakao|interpark|sm2\.|lotteon|gmarket|auction\.co\.kr|wemakeprice|tmon|naver\.com|kakao\.com)/i;

/** 페이지 맨 위 카드 행의 활성 마켓 아이콘 후보 메타. 좌표는 viewport 기준. */
interface IconCandidate {
  alt: string;
  src: string;
  title: string;
  ariaLabel: string;
  className: string;
  opacity: number;
  cursor: string;
  cx: number;
  cy: number;
  w: number;
  h: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step handlers
// ─────────────────────────────────────────────────────────────────────────────

// login / enter_workspace 는 setup project (tests/auth.setup.ts) 가 처리.

const openRegisteredListStep: StepHandler = async (page, _inputs) => {
  await goToRegisteredProducts(page);
  // 카드 1개 이상 보일 때까지 대기 (목록 비어 있으면 검증 자체 불가).
  const firstCard = page
    .locator('a[href*="/view2/registered-product/"]')
    .first();
  try {
    await firstCard.waitFor({ state: 'visible', timeout: 30_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'no_registered_products' as ErrorKey,
      message: '등록상품 목록에 카드가 없음 — 검증 불가',
    };
  }
  // 첫 카드 행이 viewport 안에 들어오게 (좌표 click 용).
  await firstCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  return { ok: true as const };
};

/**
 * 맨 위 카드 행에서 활성 마켓 아이콘 (cursor:pointer 인 직접 img) 수집 + 각 클릭하여
 * 외부 도메인 새 탭 검증.
 */
const verifyTopProductMarketIconsStep: StepHandler = async (page, _inputs) => {
  // ── 1) 활성 아이콘 후보 수집 ────────────────────────────────────────────────
  const collected = await page.evaluate(() => {
    const card = document.querySelector(
      'a[href*="/view2/registered-product/"]',
    );
    if (card === null) {
      return {
        row_found: false,
        cell_imgs: 0,
        depths_summary: { min: -1, max: -1, count: 0 },
        candidates: [],
        inactive_for_debug: [],
      };
    }

    // 카드 link → 행 컨테이너로 ascend. 행은 자식이 ≥6 개이고 viewport 60% 이상.
    const vw = window.innerWidth;
    let row: Element = card;
    let cur: Element | null = card.parentElement;
    while (cur !== null) {
      const r = cur.getBoundingClientRect();
      if (r.width >= vw * 0.6 && cur.children.length >= 6) {
        row = cur;
        break;
      }
      cur = cur.parentElement;
    }

    // 행 자식 셀 중 img 가 가장 많이 들어있는 셀 = "오픈마켓 링크" 셀.
    let iconCell: Element | null = null;
    let maxImgs = 0;
    for (const child of Array.from(row.children)) {
      const cnt = child.querySelectorAll('img').length;
      if (cnt > maxImgs) {
        maxImgs = cnt;
        iconCell = child;
      }
    }
    if (iconCell === null || maxImgs < 3) {
      return {
        row_found: true,
        cell_imgs: maxImgs,
        depths_summary: { min: -1, max: -1, count: 0 },
        candidates: [],
        inactive_for_debug: [],
      };
    }

    // 활성 vs 비활성은 DOM 깊이로 구분. 윈들리 DOM 패턴:
    //   active:   <cell> <img> ...                      depth = 0 (or small)
    //   inactive: <cell> <div> <div> <img> </div> </div>  depth = 2 (wrapper)
    // 하나의 셀 안 imgs 의 depth 분포를 보고 "더 얕은 그룹" 을 활성으로 판정.
    type Cand = {
      alt: string;
      src: string;
      title: string;
      ariaLabel: string;
      className: string;
      opacity: number;
      cursor: string;
      depth: number;
      cx: number;
      cy: number;
      w: number;
      h: number;
    };
    const cellRef: Element = iconCell;
    const collectedAll: Cand[] = [];
    const imgs = Array.from(iconCell.querySelectorAll('img'));
    for (const img of imgs) {
      const r = img.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.width > 80 || r.height > 80) continue;

      const cs = window.getComputedStyle(img);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;

      // depth: img.parentElement ===  iconCell → 0, 그 위 한 단계마다 +1.
      let depth = 0;
      let p: Element | null = img.parentElement;
      while (p !== null && p !== cellRef && depth < 10) {
        depth += 1;
        p = p.parentElement;
      }
      if (p !== cellRef) depth = 999; // iconCell 의 자손이 아님 (안전망)

      const collectAttr = (attr: string): string => {
        let el: Element | null = img;
        for (let i = 0; i < 4 && el !== null; i++) {
          const v = el.getAttribute(attr);
          if (v !== null && v.length > 0) return v;
          el = el.parentElement;
        }
        return '';
      };

      collectedAll.push({
        alt: (img as HTMLImageElement).alt ?? '',
        src: (img as HTMLImageElement).src ?? '',
        title: collectAttr('title'),
        ariaLabel: collectAttr('aria-label'),
        className:
          typeof img.className === 'string'
            ? img.className
            : ((img.className as unknown as { baseVal?: string }).baseVal ?? ''),
        opacity: parseFloat(cs.opacity || '1'),
        cursor: cs.cursor,
        depth,
        cx: Math.round(r.x + r.width / 2),
        cy: Math.round(r.y + r.height / 2),
        w: Math.round(r.width),
        h: Math.round(r.height),
      });
    }

    // 1차 실행 결과: 모든 img 가 동일한 depth/cursor/className 으로 렌더링 됨.
    // 활성/비활성은 React props (onClick) 차이일 뿐 정적 DOM 신호가 없다.
    // → 검증 단계에서 모든 후보를 짧은 timeout 으로 시도-클릭 하여 popup 발생 여부로
    //   활성 여부를 empirical 판정 (아래 step 2 참조).
    const depths = collectedAll.map((c) => c.depth).sort((a, b) => a - b);
    return {
      row_found: true,
      cell_imgs: maxImgs,
      depths_summary: {
        min: depths[0] ?? -1,
        max: depths[depths.length - 1] ?? -1,
        count: depths.length,
      },
      candidates: collectedAll,
      inactive_for_debug: [],
    };
  });

  logger.info(
    `[debug] row_found=${collected.row_found} cell_imgs=${collected.cell_imgs} ` +
      `depths=${JSON.stringify(collected.depths_summary)} ` +
      `candidates=${collected.candidates.length}`,
  );

  if (!collected.row_found) {
    return {
      ok: false as const,
      error_key: 'top_card_not_found' as ErrorKey,
      message: '등록상품 첫 카드를 찾지 못함',
    };
  }
  if (collected.candidates.length === 0) {
    return {
      ok: false as const,
      error_key: 'no_market_icons_in_top_card' as ErrorKey,
      message: `오픈마켓 셀 내 img 후보 0개 (cell_imgs=${collected.cell_imgs})`,
    };
  }

  // ── 2) 각 후보 img click → popup 발생 여부 / 외부 도메인 검증 ──────────────
  // 활성/비활성은 정적 DOM 으로 구분 불가 (onClick prop 만 차이). 따라서
  // empirical 접근:
  //   - popup 이 짧은 timeout 안에 열림 = 활성 (외부 마켓 도메인 확인)
  //   - timeout = 비활성 (skip, error 아님)
  //   - popup 이 열렸지만 windly 자체 도메인 = 활성이지만 redirect 깨짐 = FAIL
  //   - popup 이 열렸지만 비-마켓 외부 도메인 = FAIL
  // 활성 0개 (= 모두 timeout) 면 "이 상품에 업로드된 마켓이 없음" 으로 FAIL.
  const ACTIVE_PROBE_TIMEOUT_MS = 4_000;
  const REDIRECT_WAIT_MS = 8_000;
  let activeCount = 0;
  const failures: string[] = [];

  for (let i = 0; i < collected.candidates.length; i++) {
    const c = collected.candidates[i];
    const srcName = c.src.split('/').pop() ?? '';
    logger.info(
      `[try ${i + 1}/${collected.candidates.length}] (${c.cx},${c.cy}) ${srcName}`,
    );

    const newPagePromise = page
      .context()
      .waitForEvent('page', { timeout: ACTIVE_PROBE_TIMEOUT_MS });

    await page.mouse.click(c.cx, c.cy);

    let popup;
    try {
      popup = await newPagePromise;
    } catch {
      logger.info(`[try ${i + 1}] 비활성 (popup 미발생) — skip`);
      continue;
    }

    activeCount += 1;

    // windly redirect → 외부 마켓 도메인 polling.
    let url = popup.url();
    const start = Date.now();
    while (Date.now() - start < REDIRECT_WAIT_MS && /windly\.cc/i.test(url)) {
      await popup
        .waitForLoadState('domcontentloaded', { timeout: 1_500 })
        .catch(() => undefined);
      await new Promise((r) => setTimeout(r, 400));
      url = popup.url();
    }

    const isWindly = /windly\.cc/i.test(url);
    const isExternalMarket = EXTERNAL_MARKET_DOMAIN_RE.test(url);
    logger.info(`[try ${i + 1}] 활성 — popup url = ${url}`);

    if (isWindly) {
      failures.push(`${srcName}: 외부 redirect 실패, 여전히 windly: ${url}`);
    } else if (!isExternalMarket) {
      failures.push(`${srcName}: 비-마켓 도메인: ${url}`);
    }

    await popup.close().catch(() => undefined);
    await page.waitForTimeout(400);
  }

  logger.info(
    `[summary] active=${activeCount} fail=${failures.length} ` +
      `(전체 후보 ${collected.candidates.length})`,
  );

  if (activeCount === 0) {
    return {
      ok: false as const,
      error_key: 'no_active_market_icon' as ErrorKey,
      message:
        '활성 마켓 아이콘 0개 — 맨 위 상품이 어떤 마켓에도 업로드되지 않음',
    };
  }
  if (failures.length > 0) {
    return {
      ok: false as const,
      error_key: 'market_popup_verification_failed' as ErrorKey,
      message: failures.join(' | '),
    };
  }

  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_registered_list: openRegisteredListStep,
  verify_top_product_market_icons: verifyTopProductMarketIconsStep,
};

// ─────────────────────────────────────────────────────────────────────────────
// Test
// ─────────────────────────────────────────────────────────────────────────────

test('등록상품 맨 위 상품 활성 마켓 아이콘 새창 검증', async ({ page }) => {
  test.setTimeout(5 * 60_000);

  const atc = loadATC(ATC_PATH);
  const inputs: Record<string, unknown> = {};

  const result = await runATC({ atc, page, inputs, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
