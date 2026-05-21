/**
 * 주문 관리 진입 — 주문이 1건 이상 있을 때의 결과 화면 검증.
 *
 * 대응 ATC: atcs/e2e/order-management-with-orders.atc.yml
 *
 * Selector 출처 (windly-frontend-web):
 *   - src/features/OrderManagement/index.tsx
 *       ListView = OrderListHeader + (EmptyList | OrderList) + Pagenation(showTotalCount).
 *   - src/features/OrderManagement/List/Header.tsx
 *       헤더 텍스트: '상태' / '주문시간' / '주문번호/주문자' / '상품' / '상세' / '수량' / '가격'.
 *   - src/features/OrderManagement/List/Item.tsx
 *       paidAmount.toLocaleString() + '원' 형식 셀, orderedAt = 'YY-MM-DD HH:mm A' 표시.
 *   - src/features/common/components/Pagenation.tsx (line 192)
 *       <Text size="c2">총 {totalElements.toLocaleString()}개</Text>
 *
 * 비주문 케이스(빈 상태) 대응 ATC: atcs/e2e/order-management-loaded.atc.yml
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
  'order-mgmt',
  'order-management-with-orders.atc.yml',
);

const ORDER_MGMT_URL =
  'https://app.windly.cc/view3/order-management?orderStatus=ACCEPT';

const LOADING_TEXT = '상품을 불러오고 있어요';

const COLUMN_HEADERS = [
  '상태',
  '주문시간',
  '주문번호/주문자',
  '상품',
  '상세',
  '수량',
  '가격',
] as const;

const openOrderManagementStep: StepHandler = async (page, _inputs) => {
  await page.goto(ORDER_MGMT_URL, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  await page.waitForTimeout(1_500);

  const cur = page.url();
  if (!/\/view3\/order-management/.test(cur)) {
    return {
      ok: false as const,
      error_key: 'order_management_navigate_failed' as ErrorKey,
      message: `goto 후 url 이 /view3/order-management 가 아님 — 현재 url: ${cur}`,
    };
  }

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
  const loadingAppeared = await loading
    .waitFor({ state: 'visible', timeout: 1_500 })
    .then(() => true)
    .catch(() => false);

  if (loadingAppeared) {
    logger.info('[order-management] 로딩 인디케이터 노출 — hidden 대기 시작');
    try {
      await loading.waitFor({ state: 'hidden', timeout: 60_000 });
    } catch {
      return {
        ok: false as const,
        error_key: 'order_management_loading_timeout' as ErrorKey,
        message: `'${LOADING_TEXT}' 가 60초 내 hidden 되지 않음`,
      };
    }
  } else {
    logger.info('[order-management] 로딩 미노출 — 캐시 응답');
  }

  await page.waitForTimeout(1_000);

  const stillLoading = await loading.isVisible().catch(() => false);
  if (stillLoading) {
    return {
      ok: false as const,
      error_key: 'order_management_loading_not_cleared' as ErrorKey,
      message: `로딩 인디케이터가 안정화 후에도 visible`,
    };
  }
  return { ok: true as const };
};

const assertTotalCountAtLeastOneStep: StepHandler = async (page, _inputs) => {
  // Pagenation.tsx: <Text>총 {totalElements.toLocaleString()}개</Text>
  const totalLocator = page.getByText(/^총\s*[\d,]+\s*개$/).first();
  const visible = await totalLocator
    .waitFor({ state: 'visible', timeout: 10_000 })
    .then(() => true)
    .catch(() => false);

  if (!visible) {
    return {
      ok: false as const,
      error_key: 'order_total_count_text_missing' as ErrorKey,
      message: `'총 N개' 텍스트가 10초 내 visible 되지 않음 (Pagenation 미렌더 가능성)`,
    };
  }

  const raw = (await totalLocator.textContent())?.trim() ?? '';
  const match = raw.match(/총\s*([\d,]+)\s*개/);
  if (!match) {
    return {
      ok: false as const,
      error_key: 'order_total_count_parse_failed' as ErrorKey,
      message: `'총 N개' 텍스트 파싱 실패: "${raw}"`,
    };
  }

  const n = parseInt(match[1].replace(/,/g, ''), 10);
  if (!Number.isFinite(n)) {
    return {
      ok: false as const,
      error_key: 'order_total_count_parse_failed' as ErrorKey,
      message: `'총 N개' 의 N 정수 변환 실패: "${match[1]}"`,
    };
  }

  logger.info(`[order-management] 총 주문 카운트: ${n}개 (텍스트: "${raw}")`);

  if (n < 1) {
    return {
      ok: false as const,
      error_key: 'order_total_count_zero' as ErrorKey,
      message: `주문 1건 이상을 기대했으나 '총 ${n}개' — 본 ATC 는 주문 있는 케이스 전용. 빈 상태는 order-management-loaded.atc.yml 사용.`,
    };
  }

  return { ok: true as const };
};

const assertListHeadersVisibleStep: StepHandler = async (page, _inputs) => {
  const missing: string[] = [];
  for (const header of COLUMN_HEADERS) {
    const loc = page.getByText(header, { exact: true }).first();
    const v = await loc.isVisible().catch(() => false);
    if (!v) {
      missing.push(header);
    }
  }
  if (missing.length > 0) {
    return {
      ok: false as const,
      error_key: 'order_list_headers_missing' as ErrorKey,
      message: `다음 컬럼 헤더가 visible 아님: ${missing.join(', ')}`,
    };
  }
  logger.info(
    `[order-management] 컬럼 헤더 ${COLUMN_HEADERS.length}개 모두 visible`,
  );
  return { ok: true as const };
};

const assertFirstOrderRowVisibleStep: StepHandler = async (page, _inputs) => {
  // OrderItem.tsx (line 251): `{paidAmount.toLocaleString()}원` — '12,000원' 같은 패턴.
  //   '총 12,000원' 같은 다른 텍스트와 충돌 방지를 위해 ^숫자(콤마)원$ 정확 매치.
  const priceCells = page.getByText(/^\d{1,3}(,\d{3})*\s*원$/);
  const priceCount = await priceCells.count();

  // OrderItem.tsx (line 164): dayjs(orderedAt).format('YY-MM-DD HH:mm A')
  //   → '25-05-12 14:08 PM' 같은 패턴.
  const timeCells = page.getByText(/^\d{2}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+(AM|PM)$/i);
  const timeCount = await timeCells.count();

  logger.info(
    `[order-management] 가격 셀 ${priceCount}개, 주문시간 셀 ${timeCount}개 감지`,
  );

  if (priceCount === 0 && timeCount === 0) {
    return {
      ok: false as const,
      error_key: 'order_row_data_not_visible' as ErrorKey,
      message: `OrderItem 의 가격 ('N원') / 주문시간 ('YY-MM-DD HH:mm A') 텍스트가 0개 — 주문 row 미렌더`,
    };
  }
  return { ok: true as const };
};

const captureResultScreenshotStep: StepHandler = async (page, _inputs) => {
  try {
    const png = await page.screenshot({ fullPage: true });
    await test.info().attach('order-management-with-orders.png', {
      body: png,
      contentType: 'image/png',
    });
    logger.info('[order-management] 결과 스크린샷 attach 완료');
    return { ok: true as const };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return {
      ok: false as const,
      error_key: 'screenshot_failed' as ErrorKey,
      message: `스크린샷 캡쳐 실패: ${err}`,
    };
  }
};

const handlers: StepHandlers = {
  open_order_management: openOrderManagementStep,
  wait_loading_finished: waitLoadingFinishedStep,
  assert_total_count_at_least_one: assertTotalCountAtLeastOneStep,
  assert_list_headers_visible: assertListHeadersVisibleStep,
  assert_first_order_row_visible: assertFirstOrderRowVisibleStep,
  capture_result_screenshot: captureResultScreenshotStep,
};

test('주문 관리 진입 — 주문 1건 이상일 때 목록·헤더·카운트 검증', async ({ page }) => {
  test.setTimeout(2 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
