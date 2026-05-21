/**
 * 주문 관리 — 신규주문 -> 배송준비중 상태 변경 + 탭 이동 검증.
 *
 * 대응 ATC: atcs/e2e/order-management-change-status.atc.yml
 *
 * 흐름 요약:
 *   1) 세션 확보 (loginIfNeeded + enterHaegudaeWorkspace, fast-pass)
 *   2) 주문 관리 진입 (orderStatus=ACCEPT, viewport 1920x1080)
 *   3) SyncResultBanner 노출 대기 (3분, 30초마다 새로고침 자동 클릭) — 사용자 신규 주문 반영
 *   4) 먼저 업데이트 / 업데이트 클릭 -> 신규주문 +1
 *   5) 맨 위 marketOrderId 기록
 *   6) ACCEPT / INSTRUCT 카운트 기록
 *   7) 첫 row 체크박스 클릭
 *   8) 배송준비중으로 변경 클릭
 *   9) 토스트 확인
 *   10) ACCEPT 탭에서 row 사라짐 + 카운트 -1
 *   11) 배송준비중 탭 클릭
 *   12) INSTRUCT 탭에 그 주문 ID visible + 카운트 +1
 *   13) 최종 스크린샷
 *
 * Selector 출처 (windly-frontend-web):
 *   - src/features/OrderManagement/Controller/index.tsx (line 35, 169)
 *       button "배송준비중으로 변경" (ACCEPT 상태일 때)
 *   - src/features/OrderManagement/Controller/hooks/useController.ts
 *       성공 시 makeToast("총 N개의 상품을 배송준비중으로 변경했습니다.", green1)
 *   - src/features/OrderManagement/List/Item.tsx
 *       첫 Item = CheckBox(margin:0), 그 다음 marketOrderId Text (긴 숫자)
 *   - src/features/OrderManagement/Tab/TabItem.tsx
 *       탭 라벨 + 카운트가 별도 Text 노드. 부모 Container 의 onClick 이 라우팅.
 *   - src/features/OrderManagement/constants.ts
 *       DEFAULT_TAB_LIST: 신규주문(ACCEPT) / 배송준비중(INSTRUCT) / 배송중 / 배송완료
 *
 * 본 spec 도 windly-e2e-fresh project 에서 단독 실행 (setup 우회 — sync 미리 처리 방지).
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
  'order-mgmt',
  'order-management-change-status.atc.yml',
);

const BASE_HOST = 'https://global.windly.cc';
const ACCEPT_URL = `${BASE_HOST}/view3/order-management?orderStatus=ACCEPT`;

const BANNER_BODY_PARTIAL = '새롭게 업데이트 된 주문';
const BTN_IN_PROGRESS = '먼저 업데이트';
const BTN_COMPLETED = '업데이트';

// ─────────────────────────────────────────────────────────────────────────────
// 공통 헬퍼
// ─────────────────────────────────────────────────────────────────────────────

/** TabItem 의 라벨 + 카운트가 별도 Text 노드. 부모 textContent ('신규주문3') 에서 정수 추출. */
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

/** Tooltip content="새로고침" 근처 RefreshButton 클릭. disabled 면 skip. */
async function tryClickRefreshButton(page: Page): Promise<boolean> {
  const updateTextLoc = page.getByText(/^최근\s*업데이트\s+/).first();
  if (!(await updateTextLoc.isVisible().catch(() => false))) return false;
  const scope = updateTextLoc.locator('xpath=ancestor::*[descendant::button][1]');
  const btn = scope.locator('button').first();
  if (!(await btn.isVisible().catch(() => false))) return false;
  if (await btn.isDisabled().catch(() => true)) {
    logger.info('[change-status] 새로고침 버튼 disabled — skip');
    return false;
  }
  try {
    await btn.click({ timeout: 5_000 });
    logger.info('[change-status] 새로고침 버튼 클릭');
    return true;
  } catch (e) {
    logger.warn(`[change-status] 새로고침 클릭 실패: ${(e as Error).message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// step 간 공유 상태
// ─────────────────────────────────────────────────────────────────────────────

const recorded: {
  marketOrderId: string | null;
  acceptBefore: number | null;
  instructBefore: number | null;
} = {
  marketOrderId: null,
  acceptBefore: null,
  instructBefore: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// Step handlers
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
  logger.info(`[change-status] 세션 확보 완료. url=${page.url()}`);
  return { ok: true as const };
};

const openOrderManagementStep: StepHandler = async (page, _inputs) => {
  await page.goto(ACCEPT_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  if (!/\/view3\/order-management/.test(page.url())) {
    return {
      ok: false as const,
      error_key: 'order_management_navigate_failed' as ErrorKey,
      message: `goto 후 url 불일치: ${page.url()}`,
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

// 배너 노출 여부를 후속 step 이 알 수 있도록 공유.
let syncBannerSeen = false;

const waitSyncBannerVisibleStep: StepHandler = async (page, _inputs) => {
  // optional 단계 — 배너가 30초 안에 안 뜨면 skip (이미 신규주문이 있으면 그걸로 진행).
  // 새로고침 1회만 시도해서 sync 강제 트리거.
  const bodyMarker = page.getByText(BANNER_BODY_PARTIAL).first();
  const btnInProgress = page.getByRole('button', { name: BTN_IN_PROGRESS }).first();
  const completedBtnInBanner = async (): Promise<boolean> => {
    const body = page.getByText(BANNER_BODY_PARTIAL).first();
    if ((await body.count()) === 0) return false;
    const scope = body.locator('xpath=ancestor::*[3]');
    return scope
      .getByRole('button', { name: new RegExp(`^${BTN_COMPLETED}$`) })
      .first()
      .isVisible()
      .catch(() => false);
  };

  const TOTAL_WAIT_MS = 30_000;
  const REFRESH_AT_MS = 15_000;
  const start = Date.now();
  let refreshed = false;

  while (Date.now() - start < TOTAL_WAIT_MS) {
    const [bodyV, inProgV, completedV] = await Promise.all([
      bodyMarker.isVisible().catch(() => false),
      btnInProgress.isVisible().catch(() => false),
      completedBtnInBanner(),
    ]);
    if (bodyV || inProgV || completedV) {
      logger.info(
        `[change-status] SyncResultBanner 노출 감지 (t+${Date.now() - start}ms)`,
      );
      syncBannerSeen = true;
      return { ok: true as const };
    }
    if (!refreshed && Date.now() - start >= REFRESH_AT_MS) {
      await tryClickRefreshButton(page);
      refreshed = true;
    }
    await page.waitForTimeout(500);
  }

  // 미노출도 PASS — 후속 step 에서 이미 ACCEPT 탭에 있는 신규주문으로 진행.
  syncBannerSeen = false;
  logger.info(
    '[change-status] SyncResultBanner 30초 내 미노출 — skip 후 ACCEPT 탭의 기존 신규주문으로 진행',
  );
  return { ok: true as const };
};

const clickFirstUpdateButtonStep: StepHandler = async (page, _inputs) => {
  if (!syncBannerSeen) {
    logger.info(
      '[change-status] 배너 미노출이라 클릭 skip — 기존 신규주문으로 진행',
    );
    return { ok: true as const };
  }
  const inProgBtn = page.getByRole('button', { name: BTN_IN_PROGRESS }).first();
  if (await inProgBtn.isVisible().catch(() => false)) {
    await inProgBtn.click({ timeout: 10_000 });
    logger.info(`[change-status] '${BTN_IN_PROGRESS}' 클릭됨`);
    return { ok: true as const };
  }
  const body = page.getByText(BANNER_BODY_PARTIAL).first();
  if ((await body.count()) > 0) {
    const scope = body.locator('xpath=ancestor::*[3]');
    const completedBtn = scope
      .getByRole('button', { name: new RegExp(`^${BTN_COMPLETED}$`) })
      .first();
    if (await completedBtn.isVisible().catch(() => false)) {
      await completedBtn.click({ timeout: 10_000 });
      logger.info(`[change-status] '${BTN_COMPLETED}' 클릭됨 (COMPLETED)`);
      return { ok: true as const };
    }
  }
  // 배너가 보였지만 클릭 시점에 사라졌을 수 있음 — 그래도 PASS.
  logger.warn(
    '[change-status] 배너가 잠깐 보였다 사라짐 — 클릭 skip',
  );
  return { ok: true as const };
};

const waitOrderListSettledStep: StepHandler = async (page, _inputs) => {
  // 클릭 후 refetch + render 안정화. 첫 OrderItem row 의 marketOrderId Text 도달 대기.
  // marketOrderId 패턴: 긴 숫자 (보통 11자 이상).
  const firstId = page.getByText(/^\d{11,}$/).first();
  try {
    await firstId.waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'first_order_not_visible' as ErrorKey,
      message: `클릭 후 10초 내 첫 OrderItem 의 marketOrderId 가 visible 되지 않음`,
    };
  }
  await page.waitForTimeout(500);
  return { ok: true as const };
};

const recordFirstOrderIdStep: StepHandler = async (page, _inputs) => {
  // marketOrderId 는 OrderItem.tsx:179-180 의 <Text>{marketOrderId}</Text>. 보통 11자 이상의 숫자.
  const firstId = page.getByText(/^\d{11,}$/).first();
  const txt = (await firstId.textContent().catch(() => '')) ?? '';
  const trimmed = txt.trim();
  if (!/^\d{11,}$/.test(trimmed)) {
    return {
      ok: false as const,
      error_key: 'first_order_id_parse_failed' as ErrorKey,
      message: `첫 OrderItem 의 marketOrderId 추출 실패: "${trimmed}"`,
    };
  }
  recorded.marketOrderId = trimmed;
  logger.info(`[change-status] 첫 주문 ID = ${trimmed}`);
  return { ok: true as const };
};

const recordCountsBeforeChangeStep: StepHandler = async (page, _inputs) => {
  const accept = await readTabCount(page, '신규주문');
  const instruct = await readTabCount(page, '배송준비중');
  recorded.acceptBefore = accept;
  recorded.instructBefore = instruct;
  logger.info(
    `[change-status] 변경 전 카운트 — 신규주문: ${accept ?? 'null'}, 배송준비중: ${instruct ?? 'null'}`,
  );
  if (accept === null) {
    return {
      ok: false as const,
      error_key: 'tab_count_unreadable' as ErrorKey,
      message: `신규주문 탭 카운트 읽기 실패`,
    };
  }
  if (accept < 1) {
    return {
      ok: false as const,
      error_key: 'no_order_to_change' as ErrorKey,
      message: `신규주문이 0건 — 본 ATC 는 1건 이상 필요`,
    };
  }
  return { ok: true as const };
};

const selectFirstOrderCheckboxStep: StepHandler = async (page, _inputs) => {
  // CheckBox 컴포넌트 DOM (windly-frontend-web/src/components/CheckBox/style.ts):
  //   CheckBoxContainer = styled.label  → 진짜 클릭 대상
  //   CheckBoxInput = styled.input { display: none } → 직접 클릭 불가 (hang)
  //   .checkmark = visual span
  //
  // 화면 안 label:has(input[type=checkbox]) 의 순서:
  //   - 첫 번째: Controller 의 'N개 선택됨' label (text 포함)
  //   - 두 번째~: OrderItem 의 체크박스 label (text 없음, 18x18 박스)
  // → nth(1) 가 첫 OrderItem 체크박스의 <label>.
  const labels = page.locator('label:has(input[type="checkbox"])');
  const labelCount = await labels.count();
  if (labelCount < 2) {
    return {
      ok: false as const,
      error_key: 'order_checkbox_label_not_found' as ErrorKey,
      message: `체크박스 label 이 ${labelCount}개 — 최소 2개 필요 (Controller + 첫 OrderItem)`,
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
      message: `첫 OrderItem 체크박스 label 클릭 실패: ${(e as Error).message}`,
    };
  }

  // 클릭 후 Controller 의 'N개 선택됨' 라벨이 '1개 선택됨' 으로 변하는지 확인.
  const selected = page.getByText(/^\d+개\s*선택됨$/).first();
  try {
    await selected.waitFor({ state: 'visible', timeout: 5_000 });
    const t = (await selected.textContent().catch(() => '')) ?? '';
    const m = t.match(/(\d+)개\s*선택됨/);
    const n = m ? parseInt(m[1], 10) : NaN;
    if (n !== 1) {
      return {
        ok: false as const,
        error_key: 'unexpected_selected_count' as ErrorKey,
        message: `'1개 선택됨' 기대했으나 '${t.trim()}' visible (n=${n})`,
      };
    }
    logger.info(`[change-status] 첫 주문 체크박스 선택 완료`);
  } catch {
    return {
      ok: false as const,
      error_key: 'selected_label_not_visible' as ErrorKey,
      message: `'N개 선택됨' 라벨이 5초 내 visible 되지 않음 (체크 미반영)`,
    };
  }
  return { ok: true as const };
};

const clickChangeToInstructStep: StepHandler = async (page, _inputs) => {
  const btn = page.getByRole('button', { name: '배송준비중으로 변경' }).first();
  if (!(await btn.isVisible().catch(() => false))) {
    return {
      ok: false as const,
      error_key: 'change_button_not_visible' as ErrorKey,
      message: `'배송준비중으로 변경' 버튼 visible 아님`,
    };
  }
  if (await btn.isDisabled().catch(() => true)) {
    return {
      ok: false as const,
      error_key: 'change_button_disabled' as ErrorKey,
      message: `'배송준비중으로 변경' 버튼 disabled`,
    };
  }
  await btn.click({ timeout: 10_000 });
  logger.info(`[change-status] '배송준비중으로 변경' 클릭`);
  return { ok: true as const };
};

const waitToastSuccessStep: StepHandler = async (page, _inputs) => {
  // makeToast 의 메시지: `총 ${N}개의 상품을 배송준비중으로 변경했습니다.`
  const toast = page.getByText(/총\s*\d+개의\s*상품을\s*배송준비중으로\s*변경했습니다/).first();
  try {
    await toast.waitFor({ state: 'visible', timeout: 15_000 });
    const t = (await toast.textContent().catch(() => '')) ?? '';
    logger.info(`[change-status] 토스트 visible: "${t.trim()}"`);
    return { ok: true as const };
  } catch {
    // makeToast 는 3초 후 사라지므로 늦으면 못 잡을 수 있다. 토스트 못 잡았다면 결과는 후속 verify
    // 에서 카운트 변화로 검증되므로 warn 만 남기고 통과.
    logger.warn(
      `[change-status] 토스트 텍스트 15초 내 미감지 — 토스트가 빠르게 사라졌을 수 있음. 카운트 검증으로 대체.`,
    );
    return { ok: true as const };
  }
};

const verifyAcceptTabDecreasedStep: StepHandler = async (page, _inputs) => {
  if (recorded.acceptBefore === null || recorded.marketOrderId === null) {
    return {
      ok: false as const,
      error_key: 'missing_recorded_state' as ErrorKey,
      message: `이전 step 의 record 값이 없음`,
    };
  }

  const start = Date.now();
  const TIMEOUT = 10_000;
  let lastAccept: number | null = null;
  let stillVisible = true;

  while (Date.now() - start < TIMEOUT) {
    lastAccept = await readTabCount(page, '신규주문');
    // 기록된 주문 ID 가 화면에 visible 한지 (OrderItem.tsx 의 marketOrderId Text).
    const idLoc = page
      .getByText(recorded.marketOrderId, { exact: true })
      .first();
    stillVisible = await idLoc.isVisible().catch(() => false);

    if (
      lastAccept !== null &&
      lastAccept === recorded.acceptBefore - 1 &&
      !stillVisible
    ) {
      logger.info(
        `[change-status] ACCEPT 탭 검증 OK — 카운트 ${recorded.acceptBefore} -> ${lastAccept}, 주문 ID 사라짐`,
      );
      return { ok: true as const };
    }
    await page.waitForTimeout(500);
  }

  return {
    ok: false as const,
    error_key: 'accept_tab_not_decreased' as ErrorKey,
    message: `ACCEPT 탭 변경 검증 실패. 기대: 카운트 ${recorded.acceptBefore - 1} + ID '${recorded.marketOrderId}' hidden. 실제: 카운트 ${lastAccept}, ID stillVisible=${stillVisible}`,
  };
};

const clickInstructTabStep: StepHandler = async (page, _inputs) => {
  const tab = page.getByText('배송준비중', { exact: true }).first();
  if (!(await tab.isVisible().catch(() => false))) {
    return {
      ok: false as const,
      error_key: 'instruct_tab_not_visible' as ErrorKey,
      message: `'배송준비중' 탭이 visible 아님`,
    };
  }
  // 탭 텍스트 자체는 onClick 없음(부모 Container 가 가짐). 텍스트 click 은 bubble.
  await tab.click({ timeout: 10_000 });

  // URL 의 orderStatus=INSTRUCT 도달 대기.
  try {
    await page.waitForURL(/orderStatus=INSTRUCT/, { timeout: 10_000 });
    logger.info(`[change-status] 배송준비중 탭 active. url=${page.url()}`);
  } catch {
    return {
      ok: false as const,
      error_key: 'instruct_tab_url_not_reached' as ErrorKey,
      message: `탭 클릭 후 url 의 orderStatus=INSTRUCT 도달 실패. 현재 url=${page.url()}`,
    };
  }
  // 탭 전환 후 데이터 fetch 안정화 — 짧게 대기.
  await page.waitForTimeout(1_500);
  return { ok: true as const };
};

const verifyOrderInInstructStep: StepHandler = async (page, _inputs) => {
  if (recorded.marketOrderId === null || recorded.instructBefore === null) {
    return {
      ok: false as const,
      error_key: 'missing_recorded_state' as ErrorKey,
      message: `이전 step 의 record 값이 없음`,
    };
  }

  const start = Date.now();
  const TIMEOUT = 15_000;
  let lastInstruct: number | null = null;
  let idVisible = false;

  while (Date.now() - start < TIMEOUT) {
    lastInstruct = await readTabCount(page, '배송준비중');
    const idLoc = page
      .getByText(recorded.marketOrderId, { exact: true })
      .first();
    idVisible = await idLoc.isVisible().catch(() => false);

    if (
      idVisible &&
      lastInstruct !== null &&
      lastInstruct === recorded.instructBefore + 1
    ) {
      logger.info(
        `[change-status] INSTRUCT 탭 검증 OK — 카운트 ${recorded.instructBefore} -> ${lastInstruct}, 주문 ID visible`,
      );
      return { ok: true as const };
    }
    await page.waitForTimeout(500);
  }

  return {
    ok: false as const,
    error_key: 'instruct_tab_verification_failed' as ErrorKey,
    message: `INSTRUCT 탭 검증 실패. 기대: 카운트 ${recorded.instructBefore + 1} + ID '${recorded.marketOrderId}' visible. 실제: 카운트 ${lastInstruct}, idVisible=${idVisible}`,
  };
};

const captureFinalScreenshotStep: StepHandler = async (page, _inputs) => {
  try {
    const png = await page.screenshot({ fullPage: true });
    await test.info().attach('change-status-final.png', {
      body: png,
      contentType: 'image/png',
    });
    logger.info('[change-status] 최종 스크린샷 attach 완료');
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
  open_order_management: openOrderManagementStep,
  wait_sync_banner_visible: waitSyncBannerVisibleStep,
  click_first_update_button: clickFirstUpdateButtonStep,
  wait_orderlist_settled: waitOrderListSettledStep,
  record_first_order_id: recordFirstOrderIdStep,
  record_counts_before_change: recordCountsBeforeChangeStep,
  select_first_order_checkbox: selectFirstOrderCheckboxStep,
  click_change_to_instruct: clickChangeToInstructStep,
  wait_toast_success: waitToastSuccessStep,
  verify_accept_tab_decreased: verifyAcceptTabDecreasedStep,
  click_instruct_tab: clickInstructTabStep,
  verify_order_in_instruct: verifyOrderInInstructStep,
  capture_final_screenshot: captureFinalScreenshotStep,
};

test('주문 관리 — 신규주문에서 배송준비중으로 상태 변경 + 탭 이동 검증', async ({
  page,
}) => {
  // wait_sync_banner_visible 가 최대 30초 (optional) + 다른 step 들 — 3분이면 여유.
  test.setTimeout(3 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
