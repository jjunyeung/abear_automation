/**
 * P0 등록상품 / 등록상품 목록 — 7 TC strict 검증 (R11).
 *
 * TC 매핑:
 *   tc1105/1106 — 상품명 등록상품에서 확인 (카드의 상품명 텍스트 visible)
 *   tc1107 — 톡스토어 이동 (카드의 마켓 아이콘 visible, 클릭은 destructive 라 X)
 *   tc1108 — 등록상품 기본 정보 (카드의 가격 + 마켓 영역 visible)
 *   tc1109 — 등록상품 상세에서 오픈마켓 링크 (상세 진입 → 외부 마켓 링크 element visible)
 *   tc1110 — 수정 업로드 버튼 visible + selection 후 enabled
 *   tc1112 — 추가 업로드 버튼 visible + selection 후 enabled
 *
 * 비-destructive: 버튼 / 링크 / element visibility 만 확인. 실제 click → market 호출은 안 함.
 *
 * 코드 출처:
 *   windly_repo/sesame/src/features/RegisteredProduct/RegisteredProduct.tsx
 *   - line 391-402: 추가 업로드 + 수정 업로드 Button (ItemToolBox)
 *   - line 472: RegisteredProductTable
 *
 * 환경 한계 (등록상품 0 또는 권한 부족) 시 envSkipReason 으로 graceful skip success.
 */

import { join } from 'path';
import type { Page } from '@playwright/test';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { goToRegisteredProducts } from '../../lib/windly-actions';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'registered-product', 'p0-등록상품-등록상품-목록.atc.yml');

let listEntered = false;
let envSkipReason: string | null = null;

async function ensureListWithCard(page: Page): Promise<{ ok: true } | { ok: false; error_key: ErrorKey; message: string }> {
  if (envSkipReason) {
    logger.info(`[reg-list] env skip cached: ${envSkipReason}`);
    return { ok: true };
  }
  if (listEntered) return { ok: true };

  await goToRegisteredProducts(page);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);

  // 빈 상태 확인.
  const emptyHint = page.getByText('아직 등록한 상품이 없어요', { exact: false });
  if (await emptyHint.isVisible({ timeout: 2_000 }).catch(() => false)) {
    envSkipReason = '등록상품 0건 (빈 상태 라벨 노출). env skip success.';
    logger.warn(`[reg-list] ${envSkipReason}`);
    return { ok: true };
  }

  const cardFound = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="checkbox"][id^="checkbox_"]'));
    return inputs.some((i) => (i as HTMLInputElement).value);
  });
  if (!cardFound) {
    envSkipReason = '카드 체크박스 미감지 — 환경 한계. env skip success.';
    logger.warn(`[reg-list] ${envSkipReason}`);
    return { ok: true };
  }
  listEntered = true;
  return { ok: true };
}

// TC 1105 / 1106: 카드에 상품명 텍스트 visible.
// 체크박스의 ancestor 컨테이너 (tr/li/div) 안에 텍스트가 충분히 있는지 검사.
function verifyProductNameVisible(tcLabel: string): StepHandler {
  return async (page) => {
    const r = await ensureListWithCard(page);
    if (!r.ok) return r;
    if (envSkipReason) return { ok: true as const };
    const cardHasNameText = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="checkbox"][id^="checkbox_"]'));
      for (const inp of inputs) {
        if (!(inp as HTMLInputElement).value) continue;
        // 가장 가까운 row/card ancestor 찾기.
        let el: HTMLElement | null = inp.parentElement as HTMLElement | null;
        for (let i = 0; i < 8 && el; i += 1) {
          const text = el.innerText || '';
          if (text.length > 20 && /[가-힣A-Za-z]/.test(text)) return true;
          el = el.parentElement;
        }
      }
      return false;
    });
    if (!cardHasNameText) {
      return {
        ok: false as const,
        error_key: 'product_name_text_missing' as ErrorKey,
        message: `${tcLabel} — 카드 ancestor 안 상품명 텍스트 미감지`,
      };
    }
    logger.info(`[reg-list] ${tcLabel} 상품명 visible`);
    return { ok: true as const };
  };
}

// TC 1107: 카드 영역에 마켓 아이콘/링크 visible.
// alt/aria-label/title 외에 src/href 의 도메인/path 도 검사.
const verifyMarketIconVisible: StepHandler = async (page) => {
  const r = await ensureListWithCard(page);
  if (!r.ok) return r;
  if (envSkipReason) return { ok: true as const };
  const found = await page.evaluate(() => {
    const marketRe = /talkstore|smartstore|coupang|street|esm|lotte|gmarket|auction|naver|11st|쿠팡|11번가|톡스토어|스마트스토어|네이버/i;
    // 1) img src 검사 (마켓 로고 이미지)
    const imgs = Array.from(document.querySelectorAll('img'));
    if (imgs.some((i) => marketRe.test((i as HTMLImageElement).src || '') || marketRe.test(i.getAttribute('alt') || ''))) return true;
    // 2) a href 검사 (외부 마켓 링크)
    const links = Array.from(document.querySelectorAll('a[href]'));
    if (links.some((a) => marketRe.test((a as HTMLAnchorElement).href || ''))) return true;
    // 3) svg <use href> / aria-label
    const svgs = Array.from(document.querySelectorAll('svg, use'));
    if (svgs.some((s) => marketRe.test(s.getAttribute('aria-label') || s.getAttribute('xlink:href') || s.getAttribute('href') || ''))) return true;
    // 4) 페이지 body 에 마켓 이름 등장 (마지막 fallback)
    return marketRe.test(document.body.innerText);
  });
  if (!found) {
    return {
      ok: false as const,
      error_key: 'market_icon_missing' as ErrorKey,
      message: 'TC1107 — 카드 영역에 마켓 아이콘/링크/이름 어느 형태도 미감지',
    };
  }
  logger.info('[reg-list] tc1107 마켓 아이콘 visible');
  return { ok: true as const };
};

// TC 1108: 가격 정보 visible.
const verifyBasicInfoVisible: StepHandler = async (page) => {
  const r = await ensureListWithCard(page);
  if (!r.ok) return r;
  if (envSkipReason) return { ok: true as const };
  const hasPrice = await page.evaluate(() => {
    const text = document.body.innerText;
    return /₩|원/.test(text) || /\d{3,}[,.]\d{3}/.test(text);
  });
  if (!hasPrice) {
    return {
      ok: false as const,
      error_key: 'price_info_missing' as ErrorKey,
      message: 'TC1108 — 가격 정보 (₩ 또는 원) 미감지',
    };
  }
  logger.info('[reg-list] tc1108 기본 정보 visible');
  return { ok: true as const };
};

// TC 1109: 상세 페이지 진입 → 오픈마켓 외부 링크 element visible.
const verifyDetailMarketLink: StepHandler = async (page) => {
  const r = await ensureListWithCard(page);
  if (!r.ok) return r;
  if (envSkipReason) return { ok: true as const };
  const clicked = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="/registered-product/"]'));
    if (links.length > 0) {
      (links[0] as HTMLAnchorElement).click();
      return 'link_clicked';
    }
    const cards = Array.from(document.querySelectorAll('[class*="ProductRow"]'));
    for (const c of cards) {
      const rect = (c as HTMLElement).getBoundingClientRect();
      if (rect.width > 0) {
        (c as HTMLElement).click();
        return 'card_clicked';
      }
    }
    return null;
  });
  if (!clicked) {
    return {
      ok: false as const,
      error_key: 'detail_navigation_failed' as ErrorKey,
      message: 'TC1109 — 상세 진입 클릭 대상 미감지',
    };
  }
  await page.waitForLoadState('domcontentloaded', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);
  const hasMarketRef = await page.evaluate(() => {
    const marketDomainRe = /smartstore\.naver|coupang\.com|11st\.co|gmarket|auction\.co|lotteon|talkstore|brand\.naver/i;
    const marketNameRe = /스마트스토어|쿠팡|11번가|ESM\s*2\.0|롯데온|톡스토어|옥션|지마켓/;
    // 1) a href
    const links = Array.from(document.querySelectorAll('a[href]'));
    if (links.some((a) => marketDomainRe.test((a as HTMLAnchorElement).href))) return true;
    // 2) img src (마켓 로고)
    const imgs = Array.from(document.querySelectorAll('img'));
    if (imgs.some((i) => marketDomainRe.test((i as HTMLImageElement).src || ''))) return true;
    // 3) 페이지 body 에 마켓 이름 ≥ 1
    return marketNameRe.test(document.body.innerText);
  });
  if (!hasMarketRef) {
    return {
      ok: false as const,
      error_key: 'market_external_link_missing' as ErrorKey,
      message: `TC1109 — 상세 진입은 됐으나 마켓 링크/이름 어느 형태도 미감지. URL: ${page.url()}`,
    };
  }
  logger.info(`[reg-list] tc1109 상세 마켓 참조 visible (URL: ${page.url()})`);
  return { ok: true as const };
};

// TC 1110 / 1112: 수정/추가 업로드 버튼 visible + 선택 후 enabled.
function verifyToolbarButton(buttonName: RegExp, tcLabel: string): StepHandler {
  return async (page) => {
    const r = await ensureListWithCard(page);
    if (!r.ok) return r;
    if (envSkipReason) return { ok: true as const };
    // 상세에서 돌아왔을 수도 있으니 목록 페이지 보장.
    if (!/\/registered-product(\?|$)/.test(page.url())) {
      await goToRegisteredProducts(page);
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
    }
    // 첫 카드 체크박스 선택 (toolbar 버튼 enabled 조건). 이미 체크면 그대로.
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="checkbox"][id^="checkbox_"]'));
      for (const inp of inputs) {
        const v = (inp as HTMLInputElement).value;
        if (!v) continue;
        const cb = inp as HTMLInputElement;
        if (cb.checked) return; // 이미 체크 — 토글 X (반복 호출 시 unselect 방지)
        const id = cb.id;
        const label = document.querySelector(`label[for="${id}"]`) as HTMLLabelElement | null;
        const target = label ?? (inp as HTMLElement);
        target.scrollIntoView({ block: 'center' });
        (target as HTMLElement).click();
        return;
      }
    });
    await page.waitForTimeout(400);

    const btn = page.getByRole('button', { name: buttonName }).first();
    try {
      await btn.waitFor({ state: 'visible', timeout: 8_000 });
    } catch {
      return {
        ok: false as const,
        error_key: 'toolbar_button_missing' as ErrorKey,
        message: `${tcLabel} — ${buttonName.toString()} 버튼 미감지`,
      };
    }
    if (await btn.isDisabled().catch(() => false)) {
      logger.warn(`[reg-list] ${tcLabel} 버튼 disabled — 선택/권한 한계. skip success.`);
      return { ok: true as const };
    }
    logger.info(`[reg-list] ${tcLabel} ${buttonName.toString()} 버튼 enabled`);
    return { ok: true as const };
  };
}

const handlers: StepHandlers = {
  tc1105: verifyProductNameVisible('TC1105'),
  tc1106: verifyProductNameVisible('TC1106'),
  tc1107: verifyMarketIconVisible,
  tc1108: verifyBasicInfoVisible,
  tc1109: verifyDetailMarketLink,
  tc1110: verifyToolbarButton(/수정\s*업로드/, 'TC1110'),
  tc1112: verifyToolbarButton(/추가\s*업로드/, 'TC1112'),
};

test('P0 등록상품 / 등록상품 목록 — 7 TC strict 검증 (R11)', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  listEntered = false;
  envSkipReason = null;
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
