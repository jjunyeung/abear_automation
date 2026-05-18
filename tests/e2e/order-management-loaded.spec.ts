/**
 * 주문 관리 페이지 진입 → 로딩 인디케이터 종료 → 결과 화면 확인.
 *
 * 대응 ATC: atcs/e2e/order-management-loaded.atc.yml
 *
 * Selector 출처 (windly-frontend-web):
 *   - src/features/Layout/Navigator/constants/DefaultRouteList.ts
 *       ORDER_MANAGEMENT.link = /order-management?orderStatus=ACCEPT
 *   - src/features/OrderManagement/index.tsx
 *       Layout title="주문 관리"
 *       isLoading → <EmptyList isLoading text=... />
 *       !isLoading && orderList.length > 0 → <OrderList list />
 *   - src/features/common/components/EmptyList.tsx
 *       isLoading → SpinLoader + Text '상품을 불러오고 있어요'
 *       else → EmptyImage + Text {text}
 *   - src/features/OrderManagement/constants.ts
 *       DEFAULT_EMPTY_MESSAGE.ACCEPT = '신규주문인 상품이 없어요'
 *
 * 결과 판정:
 *   - 로딩 텍스트 '상품을 불러오고 있어요' 가 시작 시 visible 이면 최대 60초 hidden 대기.
 *   - 로딩 텍스트가 한 번도 안 보이는 경우도 정상 (캐시된 응답).
 *   - 최종 상태 = 빈 메시지 '신규주문인 상품이 없어요' 표시 OR 주문 목록 1개 이상.
 *   - 주문 목록 카운트는 OrderItem 컴포넌트가 별도 testid 없어 텍스트 기반으로는 어려움.
 *     → 빈 메시지 부재 + 로딩 텍스트 부재 = 결과 있음 으로 본다.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'e2e',
  'order-management-loaded.atc.yml',
);

const ORDER_MGMT_URL =
  'https://app.windly.cc/view3/order-management?orderStatus=ACCEPT';

const LOADING_TEXT = '상품을 불러오고 있어요';
const EMPTY_TEXT_ACCEPT = '신규주문인 상품이 없어요';

const openOrderManagementStep: StepHandler = async (page, _inputs) => {
  await page.goto(ORDER_MGMT_URL, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });

  // SPA client-side hydrate 안정화.
  await page.waitForTimeout(1_500);

  const cur = page.url();
  if (!/\/view3\/order-management/.test(cur)) {
    return {
      ok: false as const,
      error_key: 'order_management_navigate_failed' as ErrorKey,
      message: `goto 후 url 이 /view3/order-management 가 아님 — 현재 url: ${cur}`,
    };
  }

  // Layout title="주문 관리" — 페이지 헤더에 노출. 사이드바 메뉴 텍스트와 충돌 가능하나
  // 첫 매치만 검증 (둘 다 보이면 페이지 정상).
  const titleVisible = await page
    .getByText('주문 관리', { exact: true })
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 })
    .then(() => true)
    .catch(() => false);

  if (!titleVisible) {
    return {
      ok: false as const,
      error_key: 'order_management_title_not_visible' as ErrorKey,
      message: `'주문 관리' 타이틀이 15초 내 visible 되지 않음`,
    };
  }

  return { ok: true as const };
};

const waitLoadingFinishedStep: StepHandler = async (page, _inputs) => {
  const loading = page.getByText(LOADING_TEXT, { exact: true }).first();

  // 진입 직후 짧게 로딩 텍스트가 등장할 수 있다. 1.5초 안에 보이는지 빠르게 확인.
  const loadingAppeared = await loading
    .waitFor({ state: 'visible', timeout: 1_500 })
    .then(() => true)
    .catch(() => false);

  if (loadingAppeared) {
    logger.info('[order-management] 로딩 인디케이터 노출됨 — hidden 대기 시작');
    try {
      await loading.waitFor({ state: 'hidden', timeout: 60_000 });
      logger.info('[order-management] 로딩 인디케이터 hidden 도달');
    } catch {
      return {
        ok: false as const,
        error_key: 'order_management_loading_timeout' as ErrorKey,
        message: `'${LOADING_TEXT}' 텍스트가 60초 내 hidden 되지 않음 (로딩 미종료)`,
      };
    }
  } else {
    logger.info('[order-management] 로딩 인디케이터 미노출 — 캐시된 응답 또는 즉시 결과');
  }

  // 추가로 짧게 안정화 — OrderList 또는 EmptyList 가 렌더되는 시간.
  await page.waitForTimeout(800);

  // 로딩 텍스트는 더 이상 보이면 안 됨 (최종 상태에서 사라져야 함).
  const stillLoading = await loading.isVisible().catch(() => false);
  if (stillLoading) {
    return {
      ok: false as const,
      error_key: 'order_management_loading_not_cleared' as ErrorKey,
      message: `로딩 인디케이터('${LOADING_TEXT}') 가 안정화 후에도 visible`,
    };
  }

  // 결과 판정: (a) 빈 메시지 visible OR (b) 주문 카드 렌더 (= empty 메시지 부재).
  const empty = page.getByText(EMPTY_TEXT_ACCEPT, { exact: true }).first();
  const isEmptyState = await empty.isVisible().catch(() => false);

  if (isEmptyState) {
    logger.info(
      `[order-management] 결과: 빈 상태 ('${EMPTY_TEXT_ACCEPT}') — 신규주문 없음`,
    );
    return { ok: true as const };
  }

  // 주문 카드 존재 여부의 신뢰 가능한 selector 가 없어 — empty 메시지 부재 = 카드 렌더로 본다.
  // 단, '주문 관리' 타이틀이 여전히 보이는지 한 번 더 확인 (페이지 자체가 죽지 않았는지).
  const titleStillVisible = await page
    .getByText('주문 관리', { exact: true })
    .first()
    .isVisible()
    .catch(() => false);

  if (!titleStillVisible) {
    return {
      ok: false as const,
      error_key: 'order_management_page_broken' as ErrorKey,
      message: `로딩 종료 후 '주문 관리' 타이틀도 사라짐 — 페이지가 깨졌을 가능성`,
    };
  }

  logger.info(
    `[order-management] 결과: 주문 목록 표시 (빈 상태 메시지 부재 + 타이틀 유지)`,
  );
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_order_management: openOrderManagementStep,
  wait_loading_finished: waitLoadingFinishedStep,
};

test('주문 관리 진입 → 로딩 종료 → 결과 화면 확인', async ({ page }) => {
  test.setTimeout(2 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
