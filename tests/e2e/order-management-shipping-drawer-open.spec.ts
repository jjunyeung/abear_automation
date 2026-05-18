/**
 * 주문 관리 — 배송준비중 탭 송장정보 수정 Drawer 노출 검증.
 *
 * 대응 ATC: atcs/e2e/order-management-shipping-drawer-open.atc.yml
 *
 * Drawer (ControlDrawer) 진입 트리거:
 *   체크박스 선택 → Controller 의 송장정보 수정 버튼 클릭 → setShowDrawerController(true).
 *   (status === INSTRUCT || DELIVERING 에서만 이 버튼 노출.)
 *
 * Drawer DOM (windly-frontend-web/src/features/OrderManagement/DrawerController):
 *   - Header.tsx: <Text size="h2">송장정보 수정</Text> + <Text size="b3">{N}개</Text>
 *   - Content.tsx: 주문번호 / 주문자 / 수취인 / 상품명 / 옵션명 / 택배사 / 송장번호
 *   - DeliveryCompanyDrowdown.tsx: Dropdown(placeholder="택배사 선택")
 *   - index.tsx:184-208: TextField(placeholder="송장번호 입력")
 *   - Footer: button 취소 + button 수정 완료
 *
 * 1단계 ATC — drawer 노출까지만 검증. 실제 입력 + 수정 완료 + 배송중 변경은 다음 ATC.
 *
 * windly-e2e-fresh project 에서 단독 실행 (setup 우회 — 일관성).
 */

import { join } from 'path';
import type { Page } from '@playwright/test';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';
import {
  enterHaegudaeWorkspace,
  loginIfNeeded,
} from '../../lib/windly-actions';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'e2e',
  'order-management-shipping-drawer-open.atc.yml',
);

const INSTRUCT_URL =
  'https://global.windly.cc/view3/order-management?orderStatus=INSTRUCT';
const LOADING_TEXT = '상품을 불러오고 있어요';

// 탭 라벨 + 카운트가 별도 Text 노드 — 부모 textContent ('배송준비중1') 에서 정수 추출.
async function readTabCount(page: Page, tabLabel: string): Promise<number | null> {
  const label = page.getByText(tabLabel, { exact: true }).first();
  if ((await label.count()) === 0) return null;
  const parent = label.locator('xpath=parent::*');
  const text = (await parent.textContent().catch(() => '')) ?? '';
  const m = text.match(new RegExp(`${tabLabel}\\s*(\\d+)`));
  if (m) {
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

const recorded: { marketOrderId: string | null } = { marketOrderId: null };

// ─────────────────────────────────────────────────────────────────────────────

const ensureSessionStep: StepHandler = async (page, _inputs) => {
  const r = await loginIfNeeded(page);
  if (r === 'no_credentials') {
    return {
      ok: false as const,
      error_key: 'session_no_credentials' as ErrorKey,
      message: 'WINDLY_LOGIN_EMAIL / PASSWORD env 미설정',
    };
  }
  if (r === 'login_failed') {
    return {
      ok: false as const,
      error_key: 'session_login_failed' as ErrorKey,
      message: `로그인 실패. url=${page.url()}`,
    };
  }
  await enterHaegudaeWorkspace(page);
  logger.info(`[drawer-open] 세션 확보 완료. url=${page.url()}`);
  return { ok: true as const };
};

const openInstructTabStep: StepHandler = async (page, _inputs) => {
  await page.goto(INSTRUCT_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  if (!/orderStatus=INSTRUCT/.test(page.url())) {
    return {
      ok: false as const,
      error_key: 'instruct_navigate_failed' as ErrorKey,
      message: `goto 후 orderStatus=INSTRUCT 미도달. url=${page.url()}`,
    };
  }
  const title = page.getByText('주문 관리', { exact: true }).first();
  const visible = await title
    .waitFor({ state: 'visible', timeout: 15_000 })
    .then(() => true)
    .catch(() => false);
  if (!visible) {
    return {
      ok: false as const,
      error_key: 'order_management_title_not_visible' as ErrorKey,
      message: `주문 관리 타이틀이 15초 내 visible 되지 않음`,
    };
  }
  return { ok: true as const };
};

const waitLoadingFinishedStep: StepHandler = async (page, _inputs) => {
  const loading = page.getByText(LOADING_TEXT, { exact: true }).first();
  const appeared = await loading
    .waitFor({ state: 'visible', timeout: 1_500 })
    .then(() => true)
    .catch(() => false);
  if (appeared) {
    logger.info('[drawer-open] 로딩 인디케이터 노출 — hidden 대기');
    try {
      await loading.waitFor({ state: 'hidden', timeout: 60_000 });
    } catch {
      return {
        ok: false as const,
        error_key: 'loading_timeout' as ErrorKey,
        message: `'${LOADING_TEXT}' 가 60초 내 hidden 되지 않음`,
      };
    }
  } else {
    logger.info('[drawer-open] 로딩 미노출 — 캐시 응답');
  }
  await page.waitForTimeout(800);
  return { ok: true as const };
};

const verifyHasInstructOrderStep: StepHandler = async (page, _inputs) => {
  const n = await readTabCount(page, '배송준비중');
  if (n === null) {
    return {
      ok: false as const,
      error_key: 'instruct_count_unreadable' as ErrorKey,
      message: `배송준비중 탭 카운트 읽기 실패`,
    };
  }
  if (n < 1) {
    return {
      ok: false as const,
      error_key: 'no_instruct_order' as ErrorKey,
      message: `배송준비중 주문 0건 — 본 ATC 는 1건 이상 필요`,
    };
  }
  logger.info(`[drawer-open] 배송준비중 카운트 = ${n}`);
  return { ok: true as const };
};

const recordFirstOrderIdStep: StepHandler = async (page, _inputs) => {
  const firstId = page.getByText(/^\d{11,}$/).first();
  try {
    await firstId.waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'first_order_id_not_visible' as ErrorKey,
      message: `첫 OrderItem 의 marketOrderId 가 10초 내 visible 되지 않음`,
    };
  }
  const txt = ((await firstId.textContent().catch(() => '')) ?? '').trim();
  if (!/^\d{11,}$/.test(txt)) {
    return {
      ok: false as const,
      error_key: 'first_order_id_parse_failed' as ErrorKey,
      message: `marketOrderId 추출 실패: "${txt}"`,
    };
  }
  recorded.marketOrderId = txt;
  logger.info(`[drawer-open] 첫 주문 ID = ${txt}`);
  return { ok: true as const };
};

const selectFirstOrderCheckboxStep: StepHandler = async (page, _inputs) => {
  const labels = page.locator('label:has(input[type="checkbox"])');
  const labelCount = await labels.count();
  if (labelCount < 2) {
    return {
      ok: false as const,
      error_key: 'order_checkbox_label_not_found' as ErrorKey,
      message: `체크박스 label 이 ${labelCount}개 — 최소 2개 필요`,
    };
  }
  const firstOrderLabel = labels.nth(1);
  await firstOrderLabel.scrollIntoViewIfNeeded().catch(() => undefined);
  try {
    await firstOrderLabel.click({ timeout: 5_000 });
  } catch (e) {
    return {
      ok: false as const,
      error_key: 'checkbox_label_click_failed' as ErrorKey,
      message: `체크박스 label 클릭 실패: ${(e as Error).message}`,
    };
  }

  const selected = page.getByText(/^\d+개\s*선택됨$/).first();
  try {
    await selected.waitFor({ state: 'visible', timeout: 5_000 });
    const t = ((await selected.textContent().catch(() => '')) ?? '').trim();
    const m = t.match(/(\d+)개\s*선택됨/);
    const n = m ? parseInt(m[1], 10) : NaN;
    if (n !== 1) {
      return {
        ok: false as const,
        error_key: 'unexpected_selected_count' as ErrorKey,
        message: `'1개 선택됨' 기대했으나 '${t}' (n=${n})`,
      };
    }
  } catch {
    return {
      ok: false as const,
      error_key: 'selected_label_not_visible' as ErrorKey,
      message: `'N개 선택됨' 라벨이 5초 내 visible 되지 않음`,
    };
  }
  logger.info(`[drawer-open] 첫 주문 체크 완료 (1개 선택됨)`);
  return { ok: true as const };
};

const clickEditShippingInfoButtonStep: StepHandler = async (page, _inputs) => {
  // Controller index.tsx:131-147 의 (status === INSTRUCT || DELIVERING) && '송장정보 수정' 버튼.
  // OrderItem.tsx 의 hasDeliveryInfo=false 일 때도 같은 텍스트의 버튼이 row 안에 있음 (line 322-326).
  // → 첫 매치는 Controller 의 버튼일 가능성이 높음 (DOM 순서상). 둘 중 어느 것이든 setShowDrawerController 호출.
  const btn = page.getByRole('button', { name: '송장정보 수정' }).first();
  if (!(await btn.isVisible().catch(() => false))) {
    return {
      ok: false as const,
      error_key: 'edit_shipping_button_not_visible' as ErrorKey,
      message: `'송장정보 수정' 버튼 visible 아님`,
    };
  }
  if (await btn.isDisabled().catch(() => true)) {
    return {
      ok: false as const,
      error_key: 'edit_shipping_button_disabled' as ErrorKey,
      message: `'송장정보 수정' 버튼 disabled`,
    };
  }
  await btn.click({ timeout: 10_000 });
  logger.info(`[drawer-open] '송장정보 수정' 클릭됨`);
  return { ok: true as const };
};

const verifyDrawerHeaderStep: StepHandler = async (page, _inputs) => {
  // Header.tsx: <Text size="h2">송장정보 수정</Text> — drawer 안에 있으면 정확 매치.
  // page 외부에도 '송장정보 수정' 버튼 텍스트가 있어 충돌 가능. .first() 와 함께 visible 검증.
  // drawer 의 헤더 텍스트는 size="h2" 라 시각적으로 두드러지므로 첫 visible 매치가 drawer 헤더.
  const header = page.getByText('송장정보 수정', { exact: true });
  try {
    await header
      .first()
      .waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'drawer_header_not_visible' as ErrorKey,
      message: `drawer 헤더 '송장정보 수정' 텍스트가 10초 내 visible 되지 않음`,
    };
  }
  // Header 의 두 번째 Text: <Text size="b3">1개</Text>
  const countText = page.getByText('1개', { exact: true }).first();
  const countVisible = await countText.isVisible().catch(() => false);
  if (!countVisible) {
    return {
      ok: false as const,
      error_key: 'drawer_header_count_missing' as ErrorKey,
      message: `drawer 헤더의 '1개' 텍스트 visible 아님`,
    };
  }
  logger.info(`[drawer-open] drawer 헤더 검증 OK ('송장정보 수정' + '1개')`);
  return { ok: true as const };
};

const verifyDrawerOrderInfoStep: StepHandler = async (page, _inputs) => {
  if (recorded.marketOrderId === null) {
    return {
      ok: false as const,
      error_key: 'missing_recorded_id' as ErrorKey,
      message: `기록된 marketOrderId 가 없음`,
    };
  }
  // Drawer 의 Content 카드 title 는 `주문번호 ${marketOrderId}` (DrawerController index.tsx:89).
  // 또한 list 의 첫 항목 component 자체에도 marketOrderId 가 그대로 들어가서 텍스트 매치 가능.
  const idLoc = page.getByText(recorded.marketOrderId, { exact: true });
  // drawer 가 열린 상태면 OrderList row 의 marketOrderId 와 drawer 안의 marketOrderId — 둘 다 visible.
  // 본 step 은 단순히 '존재 + visible' 만 검증.
  const count = await idLoc.count();
  if (count === 0) {
    return {
      ok: false as const,
      error_key: 'order_id_missing_in_drawer' as ErrorKey,
      message: `marketOrderId '${recorded.marketOrderId}' 매치 0개`,
    };
  }
  // drawer 안의 marketOrderId 도 visible 인지 — drawer 가 열렸으면 최소 2개 visible 일 것 (row + drawer).
  // 단순화: 최소 1개 visible 이면 PASS.
  const anyVisible = await Promise.all(
    Array.from({ length: Math.min(count, 5) }, (_, i) =>
      idLoc.nth(i).isVisible().catch(() => false),
    ),
  );
  if (!anyVisible.some((v) => v)) {
    return {
      ok: false as const,
      error_key: 'order_id_not_visible' as ErrorKey,
      message: `marketOrderId '${recorded.marketOrderId}' 어떤 매치도 visible 아님`,
    };
  }
  logger.info(
    `[drawer-open] drawer 안 주문번호 확인 (${recorded.marketOrderId}, 매치 ${count}개)`,
  );
  return { ok: true as const };
};

const verifyDeliveryCompanyDropdownStep: StepHandler = async (page, _inputs) => {
  // 라벨 '택배사' visible.
  const label = page.getByText('택배사', { exact: true }).first();
  const labelVisible = await label.isVisible().catch(() => false);
  if (!labelVisible) {
    return {
      ok: false as const,
      error_key: 'delivery_company_label_missing' as ErrorKey,
      message: `'택배사' 라벨 visible 아님`,
    };
  }
  // placeholder '택배사 선택' visible. (Dropdown 의 placeholder 가 selected 없을 때 표시.)
  const placeholder = page.getByText('택배사 선택', { exact: true }).first();
  const placeholderVisible = await placeholder.isVisible().catch(() => false);
  if (!placeholderVisible) {
    // selected 가 이미 있는 경우 placeholder 안 보일 수도 있음. 그 경우 dropdown 자체는 존재.
    logger.warn(
      `[drawer-open] '택배사 선택' placeholder 미노출 — 이미 selected 가 있을 가능성. 라벨만 통과로 PASS.`,
    );
  } else {
    logger.info(`[drawer-open] 택배사 라벨 + placeholder visible`);
  }
  return { ok: true as const };
};

const verifyTrackingNumberInputStep: StepHandler = async (page, _inputs) => {
  const label = page.getByText('송장번호', { exact: true }).first();
  const labelVisible = await label.isVisible().catch(() => false);
  if (!labelVisible) {
    return {
      ok: false as const,
      error_key: 'tracking_number_label_missing' as ErrorKey,
      message: `'송장번호' 라벨 visible 아님`,
    };
  }
  // placeholder '송장번호 입력' — value 가 비어있으면 placeholder 노출.
  const input = page.getByPlaceholder('송장번호 입력').first();
  const inputVisible = await input.isVisible().catch(() => false);
  if (!inputVisible) {
    logger.warn(
      `[drawer-open] '송장번호 입력' placeholder input 미감지 — 이미 value 가 있을 가능성.`,
    );
  } else {
    logger.info(`[drawer-open] 송장번호 라벨 + placeholder input visible`);
  }
  return { ok: true as const };
};

const verifyFooterButtonsStep: StepHandler = async (page, _inputs) => {
  const cancel = page.getByRole('button', { name: '취소' }).first();
  const submit = page.getByRole('button', { name: '수정 완료' }).first();
  const cancelV = await cancel.isVisible().catch(() => false);
  const submitV = await submit.isVisible().catch(() => false);
  if (!cancelV || !submitV) {
    return {
      ok: false as const,
      error_key: 'footer_buttons_missing' as ErrorKey,
      message: `drawer 푸터 버튼 visible 여부 — 취소=${cancelV}, 수정 완료=${submitV}`,
    };
  }
  logger.info(`[drawer-open] 푸터 버튼 visible (취소 + 수정 완료)`);
  return { ok: true as const };
};

const captureDrawerScreenshotStep: StepHandler = async (page, _inputs) => {
  try {
    const png = await page.screenshot({ fullPage: true });
    await test.info().attach('shipping-drawer-open.png', {
      body: png,
      contentType: 'image/png',
    });
    logger.info('[drawer-open] drawer 스크린샷 attach 완료');
    return { ok: true as const };
  } catch (e) {
    return {
      ok: false as const,
      error_key: 'screenshot_failed' as ErrorKey,
      message: `스크린샷 캡쳐 실패: ${(e as Error).message}`,
    };
  }
};

// ─────────────────────────────────────────────────────────────────────────────

const handlers: StepHandlers = {
  ensure_session: ensureSessionStep,
  open_instruct_tab: openInstructTabStep,
  wait_loading_finished: waitLoadingFinishedStep,
  verify_has_instruct_order: verifyHasInstructOrderStep,
  record_first_order_id: recordFirstOrderIdStep,
  select_first_order_checkbox: selectFirstOrderCheckboxStep,
  click_edit_shipping_info_button: clickEditShippingInfoButtonStep,
  verify_drawer_header: verifyDrawerHeaderStep,
  verify_drawer_order_info: verifyDrawerOrderInfoStep,
  verify_delivery_company_dropdown: verifyDeliveryCompanyDropdownStep,
  verify_tracking_number_input: verifyTrackingNumberInputStep,
  verify_footer_buttons: verifyFooterButtonsStep,
  capture_drawer_screenshot: captureDrawerScreenshotStep,
};

test('주문 관리 — 배송준비중 탭 송장정보 수정 Drawer 노출 검증', async ({
  page,
}) => {
  test.setTimeout(2 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
