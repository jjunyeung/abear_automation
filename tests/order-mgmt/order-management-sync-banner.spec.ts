/**
 * 주문 관리 진입 — SyncResultBanner (먼저 업데이트 / 업데이트) 노출 케이스.
 *
 * 대응 ATC: atcs/e2e/order-management-sync-banner.atc.yml
 *
 * Selector 출처 (windly-frontend-web):
 *   - src/features/OrderManagement/index.tsx
 *       {isSyncRunning && changedCount > 0 && (
 *         <SyncResultBanner syncTaskStatus changedCount onUpdate activeSyncDateRange />
 *       )}
 *   - src/features/OrderManagement/Sync/SyncResultBanner.tsx
 *       IN_PROGRESS + changedCount>0:
 *         "일부 마켓에서 새롭게 업데이트 된 주문 {N}건을 찾았어요. 지금 업데이트할까요?"
 *         button "먼저 업데이트"
 *       COMPLETED + changedCount>0:
 *         "모든 마켓 주문 수집 완료! 새롭게 업데이트 된 주문 {N}건을 찾았어요."
 *         button "업데이트"
 *
 * 텍스트가 <Text>...{N}건</Text> 으로 fragment 되어 있어 한 줄 전체 매칭은 불안정.
 *   → 부분 매칭으로 핵심 마커 ('새롭게 업데이트 된 주문' / '먼저 업데이트' 버튼 등) 검출.
 */

import { join } from 'path';
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
  'order-management-sync-banner.atc.yml',
);

// 해구대(해외구매대행) 워크스페이스 host = global.windly.cc.
// setup 후 진입 URL 이 global.windly.cc/view3/main/ — 사용자 화면도 global.windly.cc 에서 동작.
// app.windly.cc 로 강제 navigate 하면 다른 워크스페이스의 같은 메뉴로 가서 sync 가 다르게 동작.
const ORDER_MGMT_URL =
  'https://global.windly.cc/view3/order-management?orderStatus=ACCEPT';

const BANNER_BODY_PARTIAL = '새롭게 업데이트 된 주문';
const BTN_IN_PROGRESS = '먼저 업데이트';
const BTN_COMPLETED = '업데이트';
const COMPLETED_MSG_PARTIAL = '모든 마켓 주문 수집 완료';

/**
 * 본 spec 은 setup project (tests/auth.setup.ts) 없이 단독 실행되는 것을 전제로 한다
 * (playwright.config.ts 의 windly-e2e-fresh project). 이유:
 *   setup spec 이 hub/main 페이지를 한 번 열면 백엔드 sync 가 트리거되어 changedCount 가
 *   먼저 0 으로 처리되어 버린다. 본 spec 의 진입이 "첫 진입" 이어야 SyncResultBanner 의
 *   IN_PROGRESS + changedCount>0 윈도우를 잡을 수 있다.
 *   → 따라서 spec 자체가 로그인 + 해구대 진입을 책임진다. 둘 다 idempotent: 이미
 *   .playwright-userdata/ 에 세션이 박혀 있으면 fast-pass (수백 ms).
 */
const ensureSessionStep: StepHandler = async (page, _inputs) => {
  const r = await loginIfNeeded(page);
  if (r === 'no_credentials') {
    return {
      ok: false as const,
      error_key: 'session_no_credentials' as ErrorKey,
      message: `WINDLY_LOGIN_EMAIL / PASSWORD env 미설정. .env 채우고 다시 실행.`,
    };
  }
  if (r === 'login_failed') {
    return {
      ok: false as const,
      error_key: 'session_login_failed' as ErrorKey,
      message: `로그인 실패. 현재 url: ${page.url()}. 자격증명/윈들리 상태 확인.`,
    };
  }
  await enterHaegudaeWorkspace(page);
  logger.info(`[sync-banner] 세션 확보 + 해구대 진입 완료. url=${page.url()}`);
  return { ok: true as const };
};

const openOrderManagementStep: StepHandler = async (page, _inputs) => {
  // viewport 를 1920x1080 으로 키운다 — 기본 fixture viewport(1280x720) 에서는
  // 윈들리 SPA 의 일부 sync UI(SyncResultBanner, SyncStatusCheckRow)와 사이드바
  // 판매 관리 메뉴가 layout breakpoint 아래로 hidden 될 가능성. 사용자 환경(~1727 wide)
  // 과 비슷한 큰 viewport 에서 안정 노출 확인됨.

  // SyncResultBanner 의 IN_PROGRESS 윈도우는 매우 짧을 수 있어 goto 후 폴링을 즉시 시작.
  // waitForTimeout(1500) 으로 안정화 기다리지 않는다 — 짧은 sync 윈도우 미스 방지.
  await page.goto(ORDER_MGMT_URL, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });

  const cur = page.url();
  if (!/\/view3\/order-management/.test(cur)) {
    return {
      ok: false as const,
      error_key: 'order_management_navigate_failed' as ErrorKey,
      message: `goto 후 url 이 /view3/order-management 가 아님 — 현재 url: ${cur}`,
    };
  }

  // 타이틀 visible 만 빠르게 확인 — 안정화 wait 없음.
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

/**
 * 새로고침 버튼 (Tab/index.tsx:73-81) 클릭 시도.
 *   Tooltip content="새로고침" + RefreshButton (Button 컴포넌트, only icon = RefreshIcon svg)
 *   handleRefresh 호출 → postProductOrdersSync 강제 트리거 → 새 sync 사이클 시작.
 *   refreshDisabled (sync IN_PROGRESS 중) 이면 클릭 무시.
 */
async function tryClickRefreshButton(
  page: import('@playwright/test').Page,
): Promise<boolean> {
  // RefreshIcon 의 svg 가 button 안에 있는데 aria-label 이 없으므로 Tooltip 텍스트 기반으로 잡는다.
  // Tooltip 은 hover 시에만 보이지만 trigger 요소(=button) 자체는 항상 DOM 에 있다.
  // → Tab 컴포넌트 안에서 RefreshIcon 을 자손으로 가지는 button 을 찾기 위해 svg+button XPath 사용은 fragile.
  //   대신 '최근 업데이트' 텍스트 근처의 첫 번째 (only-icon) button 을 잡는다.
  const updateTextLoc = page.getByText(/^최근\s*업데이트\s+/).first();
  if (!(await updateTextLoc.isVisible().catch(() => false))) {
    return false;
  }
  // '최근 업데이트' 텍스트의 부모(UpdateContainer 또는 그 ancestor) 안에서 첫 button 클릭.
  const scope = updateTextLoc.locator('xpath=ancestor::*[descendant::button][1]');
  const btn = scope.locator('button').first();
  if (!(await btn.isVisible().catch(() => false))) {
    return false;
  }
  // disabled 면 클릭 우회.
  const disabled = await btn.isDisabled().catch(() => true);
  if (disabled) {
    logger.info('[sync-banner] 새로고침 버튼 disabled — sync IN_PROGRESS 일 가능성, skip');
    return false;
  }
  try {
    await btn.click({ timeout: 5_000 });
    logger.info('[sync-banner] 새로고침 버튼 클릭 — 새 sync 트리거');
    return true;
  } catch (e) {
    logger.warn(
      `[sync-banner] 새로고침 버튼 클릭 실패 (skip): ${(e as Error).message}`,
    );
    return false;
  }
}

const waitSyncBannerVisibleStep: StepHandler = async (page, _inputs) => {
  // 전략 (사용자 권고):
  //   페이지를 진입 후 길게 켜놓고 사용자가 그 사이에 주문을 넣는다. 자동으로 sync 가
  //   돌아 SyncResultBanner 가 뜨거나, 안 뜨면 30초마다 새로고침 버튼을 자동 클릭해
  //   sync 를 강제 재트리거한다. 최대 3분 polling.
  //
  // 마커:
  //   - bodyMarker: SyncResultBanner body 의 '새롭게 업데이트 된 주문' 텍스트
  //   - btnInProgress: '먼저 업데이트' 버튼 (IN_PROGRESS + changedCount > 0)
  //   - completedMsg: '모든 마켓 주문 수집 완료' (COMPLETED + changedCount > 0)
  //   - syncRowInProgress: SyncStatusCheckRow IN_PROGRESS '새로운 주문이 있는지 확인중' (sync 트래킹)
  const bodyMarker = page.getByText(BANNER_BODY_PARTIAL).first();
  const btnInProgress = page.getByRole('button', { name: BTN_IN_PROGRESS }).first();
  const completedMsg = page.getByText(COMPLETED_MSG_PARTIAL).first();
  const syncRowInProgress = page.getByText(/새로운 주문이 있는지 확인중/).first();

  const REFRESH_INTERVAL_MS = 30_000;
  const TOTAL_WAIT_MS = 3 * 60_000;
  const start = Date.now();
  let lastRefreshAt = start;
  let syncRowSeenAt: number | null = null;
  let refreshClickCount = 0;

  logger.info(
    `[sync-banner] 사용자 주문 대기 모드 — 최대 ${TOTAL_WAIT_MS / 1000}초 polling, ${REFRESH_INTERVAL_MS / 1000}초마다 새로고침 자동 클릭`,
  );

  while (Date.now() - start < TOTAL_WAIT_MS) {
    const [bodyVisible, btnInProgressVisible, completedVisible, syncRowVisible] =
      await Promise.all([
        bodyMarker.isVisible().catch(() => false),
        btnInProgress.isVisible().catch(() => false),
        completedMsg.isVisible().catch(() => false),
        syncRowInProgress.isVisible().catch(() => false),
      ]);

    if (syncRowVisible && syncRowSeenAt === null) {
      syncRowSeenAt = Date.now() - start;
      logger.info(
        `[sync-banner] SyncStatusCheckRow IN_PROGRESS 감지 (t+${syncRowSeenAt}ms)`,
      );
    }

    if (bodyVisible || btnInProgressVisible || completedVisible) {
      const t = Date.now() - start;
      logger.info(
        `[sync-banner] 배너 노출 감지 (t+${t}ms) — body=${bodyVisible}, btnInProgress=${btnInProgressVisible}, completedMsg=${completedVisible}, refreshClickCount=${refreshClickCount}`,
      );
      return { ok: true as const };
    }

    // 30초마다 새로고침 버튼 자동 클릭으로 sync 재트리거.
    if (Date.now() - lastRefreshAt >= REFRESH_INTERVAL_MS) {
      const clicked = await tryClickRefreshButton(page);
      if (clicked) refreshClickCount += 1;
      lastRefreshAt = Date.now();
    }

    await page.waitForTimeout(500);
  }

  return {
    ok: false as const,
    error_key: 'sync_banner_not_visible' as ErrorKey,
    message: `SyncResultBanner 가 ${TOTAL_WAIT_MS}ms 내 visible 되지 않음. 새로고침 클릭 ${refreshClickCount}회. SyncStatusCheckRow ${syncRowSeenAt === null ? '미감지' : `${syncRowSeenAt}ms 감지`}. 사용자가 시간 안에 주문을 넣지 못했거나 백엔드 sync 가 changedCount=0 으로 계속 응답.`,
  };
};

const captureBannerScreenshotStep: StepHandler = async (page, _inputs) => {
  try {
    const png = await page.screenshot({ fullPage: true });
    await test.info().attach('sync-result-banner.png', {
      body: png,
      contentType: 'image/png',
    });
    logger.info('[sync-banner] 배너 스크린샷 attach 완료');
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

const classifyBannerStateStep: StepHandler = async (page, _inputs) => {
  const inProgressBtnVisible = await page
    .getByRole('button', { name: BTN_IN_PROGRESS })
    .first()
    .isVisible()
    .catch(() => false);
  const completedMsgVisible = await page
    .getByText(COMPLETED_MSG_PARTIAL)
    .first()
    .isVisible()
    .catch(() => false);

  if (inProgressBtnVisible) {
    logger.info(
      `[sync-banner] 상태 분류: IN_PROGRESS (버튼 '${BTN_IN_PROGRESS}' visible)`,
    );
  } else if (completedMsgVisible) {
    logger.info(
      `[sync-banner] 상태 분류: COMPLETED (메시지 '${COMPLETED_MSG_PARTIAL}' visible)`,
    );
  } else {
    logger.info(
      `[sync-banner] 상태 분류: 부분 캐치 (body 마커만 visible — 둘 다 매칭 안 됨)`,
    );
  }
  return { ok: true as const };
};

const extractChangedCountStep: StepHandler = async (page, _inputs) => {
  // 배너 안의 카운트는 <Text color="blue1">{count}건</Text> 형태 (별도 노드).
  //   → 'N건' 정규식으로 visible 요소 카운트 후 첫 매치 추출.
  // 페이지 전체에서 'N건' 패턴 매치할 가능성 있어 banner body 마커 근처로 좁힌다:
  //   body 마커의 ancestor 중 banner 컨테이너 (HStack with Badge) 안에서 검색.
  const bodyMarker = page.getByText(BANNER_BODY_PARTIAL).first();
  const bodyVisible = await bodyMarker.isVisible().catch(() => false);

  let countText = '';
  if (bodyVisible) {
    // banner container ≈ body 마커의 closest 부모 중 'Badge' 아이콘 형제를 가진 노드.
    // 안정적으로 좁히기 위해 body 의 parent (depth 3) 까지 잡고 그 안의 'N건' 텍스트 첫번째 캐치.
    const bannerScope = bodyMarker.locator('xpath=ancestor::*[3]');
    const counted = await bannerScope
      .getByText(/^\d+건$/)
      .first()
      .textContent()
      .catch(() => null);
    if (counted) {
      countText = counted.trim();
    }
  }

  // fallback: 페이지 전체에서 'N건' 매치 (banner 가 fade-out 직전일 수 있음).
  if (countText === '') {
    const allCounts = page.getByText(/^\d+건$/);
    const c = await allCounts.count();
    if (c > 0) {
      const t = await allCounts.first().textContent().catch(() => null);
      countText = (t ?? '').trim();
    }
  }

  const match = countText.match(/^(\d+)건$/);
  if (!match) {
    return {
      ok: false as const,
      error_key: 'sync_banner_count_not_found' as ErrorKey,
      message: `배너 안 'N건' 텍스트 추출 실패 (countText="${countText}")`,
    };
  }
  const n = parseInt(match[1], 10);
  if (!Number.isFinite(n) || n < 1) {
    return {
      ok: false as const,
      error_key: 'sync_banner_count_zero' as ErrorKey,
      message: `changedCount 가 1 이상이어야 하는데 ${n} — 본 ATC 는 sync 변경 있는 환경 전용`,
    };
  }
  logger.info(`[sync-banner] changedCount = ${n}건`);
  return { ok: true as const };
};

// ─────────────────────────────────────────────────────────────────────────────
// 클릭 + 검증 step 들
// ─────────────────────────────────────────────────────────────────────────────

// step 간 공유할 카운트 기록.
const recordedCounts: { total: number | null; newOrder: number | null } = {
  total: null,
  newOrder: null,
};

/**
 * 페이지의 두 카운트 추출:
 *   - 페이지네이션 '총 N개' (Pagenation.tsx 의 showTotalCount)
 *   - 신규주문 탭 옆 카운트 (Tab.tsx — DEFAULT_TAB_LIST 의 '신규주문' 옆 숫자)
 *
 * 둘 다 정수로 반환. 못 찾으면 null.
 */
async function readPageCounts(
  page: import('@playwright/test').Page,
): Promise<{ total: number | null; newOrder: number | null }> {
  // 1) '총 N개' from Pagenation.
  let total: number | null = null;
  const totalLoc = page.getByText(/^총\s*[\d,]+\s*개$/).first();
  if (await totalLoc.count() > 0) {
    const raw = (await totalLoc.textContent().catch(() => '')) ?? '';
    const m = raw.match(/총\s*([\d,]+)\s*개/);
    if (m) {
      const n = parseInt(m[1].replace(/,/g, ''), 10);
      if (Number.isFinite(n)) total = n;
    }
  }

  // 2) 신규주문 탭 카운트. Tab 컴포넌트에서 텍스트는 '신규주문 N' 같은 형태 (이전 스크린샷에서 '신규주문 3' 확인).
  //    공백 분리 가능성 모두 매치.
  let newOrder: number | null = null;
  const tabLoc = page.getByText(/^신규주문\s*\d+$/).first();
  if (await tabLoc.count() > 0) {
    const raw = (await tabLoc.textContent().catch(() => '')) ?? '';
    const m = raw.match(/신규주문\s*(\d+)/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n)) newOrder = n;
    }
  } else {
    // fallback: '신규주문' 텍스트 단독 + 인접 숫자 노드.
    const tabLabel = page.getByText('신규주문', { exact: true }).first();
    if (await tabLabel.count() > 0) {
      // 같은 부모 안에서 첫 숫자 노드 추출.
      const parent = tabLabel.locator('xpath=parent::*');
      const text = (await parent.textContent().catch(() => '')) ?? '';
      const m = text.match(/신규주문\s*(\d+)/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (Number.isFinite(n)) newOrder = n;
      }
    }
  }

  return { total, newOrder };
}

const recordCountsBeforeClickStep: StepHandler = async (page, _inputs) => {
  const { total, newOrder } = await readPageCounts(page);
  recordedCounts.total = total;
  recordedCounts.newOrder = newOrder;
  logger.info(
    `[sync-banner] 클릭 전 카운트 기록 — 총: ${total ?? 'null'}개, 신규주문 탭: ${newOrder ?? 'null'}`,
  );
  if (total === null && newOrder === null) {
    return {
      ok: false as const,
      error_key: 'page_counts_unreadable' as ErrorKey,
      message: `'총 N개' / '신규주문 N' 카운트 둘 다 읽지 못함`,
    };
  }
  return { ok: true as const };
};

const clickFirstUpdateButtonStep: StepHandler = async (page, _inputs) => {
  // 우선 IN_PROGRESS 의 '먼저 업데이트' 버튼 우선 시도, 없으면 COMPLETED 의 '업데이트' 시도.
  // '업데이트' 는 페이지 내 다른 곳 (e.g. 재고 업데이트 메뉴) 의 단어와 충돌 가능 → SyncResultBanner
  //   안의 버튼만 잡기 위해 banner body 마커('새롭게 업데이트 된 주문') 근처 버튼으로 좁힌다.
  const inProgressBtn = page
    .getByRole('button', { name: BTN_IN_PROGRESS })
    .first();
  const hasInProgress = await inProgressBtn.isVisible().catch(() => false);

  if (hasInProgress) {
    await inProgressBtn.click({ timeout: 10_000 }).catch(async (e) => {
      throw new Error(`'${BTN_IN_PROGRESS}' 클릭 실패: ${(e as Error).message}`);
    });
    logger.info(`[sync-banner] '${BTN_IN_PROGRESS}' 클릭됨 (IN_PROGRESS)`);
    return { ok: true as const };
  }

  // COMPLETED — banner body 근처의 '업데이트' 버튼 좁히기.
  const body = page.getByText(BANNER_BODY_PARTIAL).first();
  if (await body.count() > 0) {
    const bannerScope = body.locator('xpath=ancestor::*[3]');
    const completedBtn = bannerScope
      .getByRole('button', { name: new RegExp(`^${BTN_COMPLETED}$`) })
      .first();
    if (await completedBtn.isVisible().catch(() => false)) {
      await completedBtn.click({ timeout: 10_000 }).catch(async (e) => {
        throw new Error(`'${BTN_COMPLETED}' 클릭 실패: ${(e as Error).message}`);
      });
      logger.info(`[sync-banner] '${BTN_COMPLETED}' 클릭됨 (COMPLETED)`);
      return { ok: true as const };
    }
  }

  return {
    ok: false as const,
    error_key: 'sync_banner_button_not_found' as ErrorKey,
    message: `'${BTN_IN_PROGRESS}' / '${BTN_COMPLETED}' 버튼 모두 visible 아님 — 배너가 사라졌을 가능성`,
  };
};

const verifyOrdersAddedAfterClickStep: StepHandler = async (page, _inputs) => {
  const before = { ...recordedCounts };
  if (before.total === null && before.newOrder === null) {
    return {
      ok: false as const,
      error_key: 'no_before_counts' as ErrorKey,
      message: `클릭 전 카운트가 기록되지 않음 (record_counts_before_click step 실패?)`,
    };
  }

  // 클릭 후 refetch + state update 가 반영될 시간 — polling 으로 최대 10초.
  const start = Date.now();
  let after = { total: null as number | null, newOrder: null as number | null };
  let beforeIsNewOrderKnown = before.newOrder !== null;
  let changed = false;
  while (Date.now() - start < 10_000) {
    after = await readPageCounts(page);
    if (
      (beforeIsNewOrderKnown && after.newOrder !== null && after.newOrder !== before.newOrder) ||
      (before.total !== null && after.total !== null && after.total !== before.total)
    ) {
      changed = true;
      break;
    }
    await page.waitForTimeout(500);
  }

  logger.info(
    `[sync-banner] 클릭 후 카운트 (10s polling) — 총: ${after.total ?? 'null'}개 (before ${before.total ?? 'null'}), 신규주문 탭: ${after.newOrder ?? 'null'} (before ${before.newOrder ?? 'null'}), changed=${changed}`,
  );

  // 신규주문 탭 카운트 감소 시 FAIL.
  if (
    beforeIsNewOrderKnown &&
    after.newOrder !== null &&
    after.newOrder < (before.newOrder ?? 0)
  ) {
    return {
      ok: false as const,
      error_key: 'new_order_count_decreased' as ErrorKey,
      message: `신규주문 카운트가 클릭 후 감소: before=${before.newOrder}, after=${after.newOrder}`,
    };
  }
  // 페이지네이션 총 카운트 감소 시 FAIL.
  if (
    before.total !== null &&
    after.total !== null &&
    after.total < before.total
  ) {
    return {
      ok: false as const,
      error_key: 'total_count_decreased' as ErrorKey,
      message: `총 카운트가 클릭 후 감소: before=${before.total}, after=${after.total}`,
    };
  }

  return { ok: true as const };
};

const captureFinalScreenshotStep: StepHandler = async (page, _inputs) => {
  try {
    const png = await page.screenshot({ fullPage: true });
    await test.info().attach('sync-banner-after-click.png', {
      body: png,
      contentType: 'image/png',
    });
    logger.info('[sync-banner] 최종 스크린샷 attach 완료');
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
  ensure_session: ensureSessionStep,
  open_order_management: openOrderManagementStep,
  wait_sync_banner_visible: waitSyncBannerVisibleStep,
  capture_banner_screenshot: captureBannerScreenshotStep,
  classify_banner_state: classifyBannerStateStep,
  extract_changed_count: extractChangedCountStep,
  record_counts_before_click: recordCountsBeforeClickStep,
  click_first_update_button: clickFirstUpdateButtonStep,
  verify_orders_added_after_click: verifyOrdersAddedAfterClickStep,
  capture_final_screenshot: captureFinalScreenshotStep,
};

test('주문 관리 진입 — SyncResultBanner (먼저 업데이트/업데이트) 노출 검증', async ({
  page,
}) => {
  // wait_sync_banner_visible 가 최대 3분 + 다른 step + 새로고침 클릭 등 — 충분히 늘림.
  test.setTimeout(5 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
