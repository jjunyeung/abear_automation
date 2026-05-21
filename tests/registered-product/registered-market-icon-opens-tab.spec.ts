/**
 * 등록상품 카드의 마켓 아이콘 클릭 → 새 탭 popup 이벤트 발생 검증.
 *
 * 대응 ATC: atcs/upload/registered-market-icon-opens-tab.atc.yml
 * TC 원본: Case No 920 / 등록상품 › 상품삭제 / P0
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
import { openRegisteredListStep } from '../smartstore-customs-tax/_bulk-edit-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'registered-product', 'registered-market-icon-opens-tab.atc.yml');

/**
 * 첫 카드 row 의 첫 마켓 아이콘 button 클릭 → 새 탭 popup 이벤트 발생 확인.
 * MarketIconGroup 안 7~8 button 중 첫 번째 (= 스마트스토어).
 *
 * popup event 캡쳐: page.context().waitForEvent('page').
 * 단, blocking timeout 위해 click 전에 promise 만든 뒤 click.
 */
const clickMarketIconStep: StepHandler = async (page) => {
  // MarketLinkButton 은 styled.div + img[src*="favicon"]. button 태그가 아님.
  // 부모 div 가 active=false 일 때 pointer-events: none. 활성 마켓만 클릭 가능.
  // smartstore 가 marketList 첫 번째 — 우선 시도하고 비활성 시 다음으로.
  // 클릭 대상 = MarketIcon styled.img 또는 그 부모 div.
  const favicons = page.locator('img[src*="favicon"]');
  const cnt = await favicons.count().catch(() => 0);
  if (cnt === 0) {
    return {
      ok: false as const,
      error_key: 'market_icon_missing' as ErrorKey,
      message: '등록상품 카드 안 favicon img 매칭 0건',
    };
  }
  // 활성 아이콘 (부모 div opacity != 0.2, pointer-events 활성) 우선 찾기.
  let marketBtn = null as ReturnType<typeof favicons.nth> | null;
  for (let i = 0; i < cnt; i += 1) {
    const cand = favicons.nth(i);
    const opacity = await cand
      .evaluate((el) => window.getComputedStyle(el.parentElement!).opacity)
      .catch(() => '1');
    if (opacity !== '0.2') {
      marketBtn = cand;
      break;
    }
  }
  if (!marketBtn) {
    return {
      ok: false as const,
      error_key: 'market_icon_no_active' as ErrorKey,
      message: '활성(active=true) 마켓 아이콘이 첫 페이지에 0건',
    };
  }
  await marketBtn.waitFor({ state: 'visible', timeout: 5_000 });

  // popup 이벤트 promise 미리 설치. img 클릭 시 부모 div onClick 트리거.
  const popupPromise = page.context().waitForEvent('page', { timeout: 8_000 });
  await marketBtn.click({ force: true });

  let popup;
  try {
    popup = await popupPromise;
  } catch {
    return {
      ok: false as const,
      error_key: 'market_icon_no_popup' as ErrorKey,
      message: '마켓 아이콘 클릭 후 새 탭(popup) 이벤트 발생 X',
    };
  }

  await popup.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
  const popupUrl = popup.url();
  // 새 탭 자체는 열림 (= popup event 발생). URL 빈 string 일 수도 (uploaded url 없는 마켓).
  // 새 탭 닫음 (테스트 환경 정리).
  await popup.close().catch(() => undefined);

  // url 이 about:blank 거나 빈 string 이면 비활성 마켓 — 그래도 popup event 는 발생함.
  // 본 TC expect = "새 페이지가 열림" 이라서 popup 발생 자체로 PASS.
  if (popupUrl === 'about:blank' || popupUrl === '') {
    return {
      ok: true as const,
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_registered_list: openRegisteredListStep,
  click_market_icon_opens_tab: clickMarketIconStep,
};

test('등록상품 마켓 아이콘 클릭 → 새 탭', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
