/**
 * 주문 관리 — 배송준비중(INSTRUCT) → 배송중(DELIVERING) 전체 흐름.
 *
 * 대응 ATC: atcs/e2e/order-management-instruct-to-delivering.atc.yml
 *
 * 입력값 (env, D8 우선순위의 CLI/env-variant):
 *   ATC_DELIVERY_COMPANY  택배사 이름 (예: CJ대한통운). Dropdown 옵션 label 과 정확 매치 필요.
 *   ATC_TRACKING_NUMBER   송장번호 (예: 1234567890). 진짜 마켓 API 로 전송될 수 있음.
 *
 * 실행 예:
 *   ATC_DELIVERY_COMPANY=CJ대한통운 ATC_TRACKING_NUMBER=1234567890 \
 *     npx playwright test --project=windly-e2e-fresh \
 *       tests/e2e/order-management-instruct-to-delivering.spec.ts
 *
 * 두 env 모두 미설정이면 spec 시작 시점에 throw — 진짜 송장 정보를 임의 default 로 보내는
 * 위험을 피하기 위함.
 *
 * Selector 출처 (windly-frontend-web):
 *   - src/components/Dropdown/index.tsx
 *       selected 없을 때 placeholder 텍스트 표시, 펼침 시 검색 input 자동 focus.
 *   - src/components/Dropdown/Option/OptionGroup/index.tsx
 *       search input placeholder=검색하기, 옵션 label 클릭으로 선택.
 *   - src/features/OrderManagement/DrawerController/index.tsx
 *       handleUpdateDeliveryInfo -> validate -> save -> onResetDispatchList + onClose.
 *   - src/features/OrderManagement/Controller/index.tsx (line 36, 169)
 *       button 텍스트 '배송중으로 변경' (INSTRUCT 상태).
 *   - src/features/OrderManagement/Controller/hooks/useController.ts
 *       성공 시 makeToast('총 N개의 상품을 배송중으로 변경했습니다.')
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
  'order-management-instruct-to-delivering.atc.yml',
);

const INSTRUCT_URL =
  'https://global.windly.cc/view3/order-management?orderStatus=INSTRUCT';
const LOADING_TEXT = '상품을 불러오고 있어요';

const DELIVERY_COMPANY = (process.env['ATC_DELIVERY_COMPANY'] ?? '').trim();
const TRACKING_NUMBER = (process.env['ATC_TRACKING_NUMBER'] ?? '').trim();

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

async function clickFirstOrderCheckbox(page: Page): Promise<{ ok: true } | { ok: false; msg: string }> {
  const labels = page.locator('label:has(input[type="checkbox"])');
  if ((await labels.count()) < 2) return { ok: false, msg: '체크박스 label < 2' };
  const firstOrderLabel = labels.nth(1);
  await firstOrderLabel.scrollIntoViewIfNeeded().catch(() => undefined);
  try {
    await firstOrderLabel.click({ timeout: 5_000 });
  } catch (e) {
    return { ok: false, msg: `label click 실패: ${(e as Error).message}` };
  }
  // '1개 선택됨' 확인.
  try {
    await page
      .getByText(/^\d+개\s*선택됨$/)
      .first()
      .waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return { ok: false, msg: `'N개 선택됨' 라벨 visible 안 됨` };
  }
  return { ok: true };
}

const recorded: {
  marketOrderId: string | null;
  instructBefore: number | null;
  deliveringBefore: number | null;
} = {
  marketOrderId: null,
  instructBefore: null,
  deliveringBefore: null,
};

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
  return { ok: true as const };
};

const openInstructTabStep: StepHandler = async (page, _inputs) => {
  await page.goto(INSTRUCT_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  if (!/orderStatus=INSTRUCT/.test(page.url())) {
    return {
      ok: false as const,
      error_key: 'instruct_navigate_failed' as ErrorKey,
      message: `goto 후 INSTRUCT URL 미도달. url=${page.url()}`,
    };
  }
  const title = page.getByText('주문 관리', { exact: true }).first();
  const ok = await title
    .waitFor({ state: 'visible', timeout: 15_000 })
    .then(() => true)
    .catch(() => false);
  if (!ok) {
    return {
      ok: false as const,
      error_key: 'order_management_title_not_visible' as ErrorKey,
      message: `주문 관리 타이틀 미노출`,
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
    try {
      await loading.waitFor({ state: 'hidden', timeout: 60_000 });
    } catch {
      return {
        ok: false as const,
        error_key: 'loading_timeout' as ErrorKey,
        message: `로딩이 60초 내 hidden 안 됨`,
      };
    }
  }
  await page.waitForTimeout(800);
  return { ok: true as const };
};

const verifyHasInstructOrderStep: StepHandler = async (page, _inputs) => {
  const n = await readTabCount(page, '배송준비중');
  if (n === null || n < 1) {
    return {
      ok: false as const,
      error_key: 'no_instruct_order' as ErrorKey,
      message: `배송준비중 카운트 ${n} — 1건 이상 필요`,
    };
  }
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
      message: `첫 marketOrderId 10초 내 미노출`,
    };
  }
  const txt = ((await firstId.textContent().catch(() => '')) ?? '').trim();
  if (!/^\d{11,}$/.test(txt)) {
    return {
      ok: false as const,
      error_key: 'first_order_id_parse_failed' as ErrorKey,
      message: `marketOrderId 파싱 실패: "${txt}"`,
    };
  }
  recorded.marketOrderId = txt;
  logger.info(`[instruct-to-delivering] 첫 주문 ID = ${txt}`);
  return { ok: true as const };
};

const recordCountsBeforeStep: StepHandler = async (page, _inputs) => {
  const instruct = await readTabCount(page, '배송준비중');
  const delivering = await readTabCount(page, '배송중');
  if (instruct === null || delivering === null) {
    return {
      ok: false as const,
      error_key: 'tab_count_unreadable' as ErrorKey,
      message: `배송준비중=${instruct}, 배송중=${delivering} — 둘 다 읽혀야 함`,
    };
  }
  recorded.instructBefore = instruct;
  recorded.deliveringBefore = delivering;
  logger.info(
    `[instruct-to-delivering] baseline — 배송준비중:${instruct}, 배송중:${delivering}`,
  );
  return { ok: true as const };
};

const selectFirstOrderCheckboxStep: StepHandler = async (page, _inputs) => {
  const r = await clickFirstOrderCheckbox(page);
  if (!r.ok) {
    return {
      ok: false as const,
      error_key: 'first_checkbox_failed' as ErrorKey,
      message: r.msg,
    };
  }
  return { ok: true as const };
};

const clickEditShippingInfoButtonStep: StepHandler = async (page, _inputs) => {
  const btn = page.getByRole('button', { name: '송장정보 수정' }).first();
  if (!(await btn.isVisible().catch(() => false))) {
    return {
      ok: false as const,
      error_key: 'edit_shipping_button_not_visible' as ErrorKey,
      message: `송장정보 수정 버튼 미노출`,
    };
  }
  if (await btn.isDisabled().catch(() => true)) {
    return {
      ok: false as const,
      error_key: 'edit_shipping_button_disabled' as ErrorKey,
      message: `송장정보 수정 버튼 disabled`,
    };
  }
  await btn.click({ timeout: 10_000 });
  return { ok: true as const };
};

const verifyDrawerOpenedStep: StepHandler = async (page, _inputs) => {
  const header = page.getByText('송장정보 수정', { exact: true });
  try {
    await header.first().waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'drawer_not_opened' as ErrorKey,
      message: `drawer 헤더 10초 내 미노출`,
    };
  }
  return { ok: true as const };
};

const selectDeliveryCompanyStep: StepHandler = async (page, inputs) => {
  const company = String(inputs['delivery_company'] ?? '').trim();
  if (company.length === 0) {
    return {
      ok: false as const,
      error_key: 'delivery_company_input_missing' as ErrorKey,
      message: `inputs.delivery_company 비어있음`,
    };
  }

  // 1) Dropdown trigger 클릭 — placeholder '택배사 선택' 텍스트가 trigger 안에 있음.
  const trigger = page.getByText('택배사 선택', { exact: true }).first();
  if (!(await trigger.isVisible().catch(() => false))) {
    return {
      ok: false as const,
      error_key: 'delivery_dropdown_trigger_not_visible' as ErrorKey,
      message: `'택배사 선택' trigger 미노출 — 이미 선택된 값이 있거나 drawer 미열림`,
    };
  }
  await trigger.click({ timeout: 5_000 });

  // 2) 검색 input (placeholder '검색하기') 에 택배사명 입력.
  const search = page.getByPlaceholder('검색하기').first();
  try {
    await search.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'delivery_dropdown_search_not_visible' as ErrorKey,
      message: `dropdown 검색 input 미노출`,
    };
  }
  await search.fill('');
  await search.type(company, { delay: 30 });
  // debounce 500ms 후 옵션 필터.
  await page.waitForTimeout(800);

  // 3) 옵션 클릭 — label 텍스트 정확 매치 우선, 안 보이면 부분 매치.
  let option = page.getByText(company, { exact: true });
  let count = await option.count();
  if (count === 0) {
    // 부분 매치 fallback.
    option = page.getByText(new RegExp(company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    count = await option.count();
  }
  if (count === 0) {
    return {
      ok: false as const,
      error_key: 'delivery_company_option_not_found' as ErrorKey,
      message: `검색 결과에 '${company}' 옵션 없음`,
    };
  }
  // 첫 visible 옵션 (search input 의 typed value 매치 제외 — input 안에 같은 텍스트가 있을 수 있음).
  // input 은 placeholder 가 있는 노드. visible 옵션 중 input 이 아닌 것 첫 번째.
  // 단순화: 두 번째 visible match (보통 첫 visible 은 search input value 일 수 있음).
  let clicked = false;
  for (let i = 0; i < Math.min(count, 5); i += 1) {
    const o = option.nth(i);
    if (!(await o.isVisible().catch(() => false))) continue;
    // input 자체는 click 으로 안 들어가야 함. input/textarea 태그면 skip.
    const tag = await o.evaluate((el) => el.tagName.toLowerCase()).catch(() => '');
    if (tag === 'input' || tag === 'textarea') continue;
    try {
      await o.click({ timeout: 3_000 });
      clicked = true;
      break;
    } catch {
      // 다음 후보 시도
    }
  }
  if (!clicked) {
    return {
      ok: false as const,
      error_key: 'delivery_company_click_failed' as ErrorKey,
      message: `'${company}' 옵션 클릭 실패 (visible/non-input 후보 없음)`,
    };
  }

  await page.waitForTimeout(500);

  // 4) trigger 텍스트가 placeholder ('택배사 선택') 가 아닌 선택된 옵션 label 로 변하는지 검증.
  const triggerStillPlaceholder = await page
    .getByText('택배사 선택', { exact: true })
    .first()
    .isVisible()
    .catch(() => false);
  if (triggerStillPlaceholder) {
    return {
      ok: false as const,
      error_key: 'delivery_company_not_selected' as ErrorKey,
      message: `클릭 후에도 '택배사 선택' placeholder 가 visible — 선택 미반영`,
    };
  }
  logger.info(`[instruct-to-delivering] 택배사 선택 완료: ${company}`);
  return { ok: true as const };
};

const enterTrackingNumberStep: StepHandler = async (page, inputs) => {
  const tracking = String(inputs['tracking_number'] ?? '').trim();
  if (tracking.length === 0) {
    return {
      ok: false as const,
      error_key: 'tracking_number_input_missing' as ErrorKey,
      message: `inputs.tracking_number 비어있음`,
    };
  }
  const input = page.getByPlaceholder('송장번호 입력').first();
  try {
    await input.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'tracking_input_not_visible' as ErrorKey,
      message: `송장번호 input 미노출`,
    };
  }
  await input.fill('');
  await input.fill(tracking);
  const v = await input.inputValue().catch(() => '');
  if (v.trim() !== tracking) {
    return {
      ok: false as const,
      error_key: 'tracking_input_not_reflected' as ErrorKey,
      message: `송장번호 input 갱신 안 됨: expected='${tracking}', actual='${v}'`,
    };
  }
  logger.info(`[instruct-to-delivering] 송장번호 입력 완료: ${tracking}`);
  return { ok: true as const };
};

const clickSubmitButtonStep: StepHandler = async (page, _inputs) => {
  const submit = page.getByRole('button', { name: '수정 완료' }).first();
  if (!(await submit.isVisible().catch(() => false))) {
    return {
      ok: false as const,
      error_key: 'submit_button_not_visible' as ErrorKey,
      message: `수정 완료 버튼 미노출`,
    };
  }
  await submit.click({ timeout: 10_000 });
  return { ok: true as const };
};

const waitDrawerClosedStep: StepHandler = async (page, _inputs) => {
  // drawer 닫힘 = 헤더 '송장정보 수정' 텍스트 모든 매치 hidden 도달.
  // page 의 button 텍스트 '송장정보 수정' (Controller) 도 있어 부분 hidden 검사 필요.
  // 가장 단순: '수정 완료' 버튼 hidden 으로 검증 (drawer footer 만 가짐).
  const submit = page.getByRole('button', { name: '수정 완료' }).first();
  try {
    await submit.waitFor({ state: 'hidden', timeout: 15_000 });
  } catch {
    // 닫힘 안 됐다는 건 검증 실패 가능성 — 검증 에러 메시지 캐치 시도.
    const errCandidate = page.getByText(/유효하지|입력해|확인해|잘못/).first();
    let errText = '';
    if (await errCandidate.isVisible().catch(() => false)) {
      errText = ((await errCandidate.textContent().catch(() => '')) ?? '').trim();
    }
    return {
      ok: false as const,
      error_key: 'drawer_not_closed' as ErrorKey,
      message: `drawer 가 15초 내 닫히지 않음. 검증 에러 가능성: "${errText}"`,
    };
  }
  await page.waitForTimeout(500);
  return { ok: true as const };
};

const verifyRowShippingInfoUpdatedStep: StepHandler = async (page, inputs) => {
  const company = String(inputs['delivery_company'] ?? '').trim();
  const tracking = String(inputs['tracking_number'] ?? '').trim();

  const start = Date.now();
  const TIMEOUT = 10_000;
  let companyVisible = false;
  let trackingVisible = false;
  while (Date.now() - start < TIMEOUT) {
    companyVisible = await page
      .getByText(company, { exact: true })
      .first()
      .isVisible()
      .catch(() => false);
    trackingVisible = await page
      .getByText(tracking, { exact: true })
      .first()
      .isVisible()
      .catch(() => false);
    if (companyVisible && trackingVisible) {
      logger.info(
        `[instruct-to-delivering] row 갱신 확인 — 택배사 + 송장번호 모두 visible`,
      );
      return { ok: true as const };
    }
    await page.waitForTimeout(500);
  }
  return {
    ok: false as const,
    error_key: 'row_shipping_info_not_updated' as ErrorKey,
    message: `row 갱신 검증 실패 — 택배사 visible=${companyVisible}, 송장 visible=${trackingVisible}`,
  };
};

const selectFirstOrderCheckboxAgainStep: StepHandler = async (page, _inputs) => {
  // 수정 완료 후 onResetDispatchList -> 체크 풀림. 다시 체크.
  const r = await clickFirstOrderCheckbox(page);
  if (!r.ok) {
    return {
      ok: false as const,
      error_key: 'recheck_failed' as ErrorKey,
      message: r.msg,
    };
  }
  return { ok: true as const };
};

const clickChangeToDeliveringStep: StepHandler = async (page, _inputs) => {
  const btn = page.getByRole('button', { name: '배송중으로 변경' }).first();
  if (!(await btn.isVisible().catch(() => false))) {
    return {
      ok: false as const,
      error_key: 'change_to_delivering_not_visible' as ErrorKey,
      message: `배송중으로 변경 버튼 미노출`,
    };
  }
  if (await btn.isDisabled().catch(() => true)) {
    return {
      ok: false as const,
      error_key: 'change_to_delivering_disabled' as ErrorKey,
      message: `배송중으로 변경 버튼 disabled (송장 정보 미입력 가능성)`,
    };
  }
  await btn.click({ timeout: 10_000 });
  return { ok: true as const };
};

const waitToastDeliveringSuccessStep: StepHandler = async (page, _inputs) => {
  const toast = page
    .getByText(/총\s*\d+개의\s*상품을\s*배송중으로\s*변경했습니다/)
    .first();
  try {
    await toast.waitFor({ state: 'visible', timeout: 15_000 });
    const t = ((await toast.textContent().catch(() => '')) ?? '').trim();
    logger.info(`[instruct-to-delivering] 토스트 visible: "${t}"`);
  } catch {
    logger.warn(
      `[instruct-to-delivering] 배송중 토스트 미감지 — 빠르게 사라졌을 수 있음. 카운트 검증으로 대체.`,
    );
  }
  return { ok: true as const };
};

const verifyInstructTabDecreasedStep: StepHandler = async (page, _inputs) => {
  if (recorded.instructBefore === null || recorded.marketOrderId === null) {
    return {
      ok: false as const,
      error_key: 'missing_recorded_state' as ErrorKey,
      message: `이전 step 의 record 값이 없음`,
    };
  }
  const start = Date.now();
  let lastInstruct: number | null = null;
  let stillVisible = true;
  while (Date.now() - start < 10_000) {
    lastInstruct = await readTabCount(page, '배송준비중');
    stillVisible = await page
      .getByText(recorded.marketOrderId, { exact: true })
      .first()
      .isVisible()
      .catch(() => false);
    if (
      lastInstruct !== null &&
      lastInstruct === recorded.instructBefore - 1 &&
      !stillVisible
    ) {
      logger.info(
        `[instruct-to-delivering] INSTRUCT 검증 OK — ${recorded.instructBefore} -> ${lastInstruct}, ID 사라짐`,
      );
      return { ok: true as const };
    }
    await page.waitForTimeout(500);
  }
  return {
    ok: false as const,
    error_key: 'instruct_not_decreased' as ErrorKey,
    message: `INSTRUCT 검증 실패 — 카운트 ${lastInstruct} (before ${recorded.instructBefore}), ID stillVisible=${stillVisible}`,
  };
};

const clickDeliveringTabStep: StepHandler = async (page, _inputs) => {
  const tab = page.getByText('배송중', { exact: true }).first();
  if (!(await tab.isVisible().catch(() => false))) {
    return {
      ok: false as const,
      error_key: 'delivering_tab_not_visible' as ErrorKey,
      message: `'배송중' 탭 미노출`,
    };
  }
  await tab.click({ timeout: 10_000 });
  try {
    await page.waitForURL(/orderStatus=DELIVERING/, { timeout: 10_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'delivering_url_not_reached' as ErrorKey,
      message: `URL 의 orderStatus=DELIVERING 미도달. url=${page.url()}`,
    };
  }
  await page.waitForTimeout(1_500);
  return { ok: true as const };
};

const verifyOrderInDeliveringStep: StepHandler = async (page, _inputs) => {
  if (recorded.marketOrderId === null || recorded.deliveringBefore === null) {
    return {
      ok: false as const,
      error_key: 'missing_recorded_state' as ErrorKey,
      message: `이전 record 값 없음`,
    };
  }
  const start = Date.now();
  let lastDelivering: number | null = null;
  let idVisible = false;
  while (Date.now() - start < 15_000) {
    lastDelivering = await readTabCount(page, '배송중');
    idVisible = await page
      .getByText(recorded.marketOrderId, { exact: true })
      .first()
      .isVisible()
      .catch(() => false);
    if (
      idVisible &&
      lastDelivering !== null &&
      lastDelivering === recorded.deliveringBefore + 1
    ) {
      logger.info(
        `[instruct-to-delivering] DELIVERING 검증 OK — ${recorded.deliveringBefore} -> ${lastDelivering}, ID visible`,
      );
      return { ok: true as const };
    }
    await page.waitForTimeout(500);
  }
  return {
    ok: false as const,
    error_key: 'delivering_verification_failed' as ErrorKey,
    message: `DELIVERING 검증 실패 — 카운트 ${lastDelivering} (before ${recorded.deliveringBefore}), idVisible=${idVisible}`,
  };
};

const captureFinalScreenshotStep: StepHandler = async (page, _inputs) => {
  try {
    const png = await page.screenshot({ fullPage: true });
    await test.info().attach('instruct-to-delivering-final.png', {
      body: png,
      contentType: 'image/png',
    });
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
  record_counts_before: recordCountsBeforeStep,
  select_first_order_checkbox: selectFirstOrderCheckboxStep,
  click_edit_shipping_info_button: clickEditShippingInfoButtonStep,
  verify_drawer_opened: verifyDrawerOpenedStep,
  select_delivery_company: selectDeliveryCompanyStep,
  enter_tracking_number: enterTrackingNumberStep,
  click_submit_button: clickSubmitButtonStep,
  wait_drawer_closed: waitDrawerClosedStep,
  verify_row_shipping_info_updated: verifyRowShippingInfoUpdatedStep,
  select_first_order_checkbox_again: selectFirstOrderCheckboxAgainStep,
  click_change_to_delivering: clickChangeToDeliveringStep,
  wait_toast_delivering_success: waitToastDeliveringSuccessStep,
  verify_instruct_tab_decreased: verifyInstructTabDecreasedStep,
  click_delivering_tab: clickDeliveringTabStep,
  verify_order_in_delivering: verifyOrderInDeliveringStep,
  capture_final_screenshot: captureFinalScreenshotStep,
};

test('주문 관리 — 배송준비중→배송중 (송장 입력 + 상태 변경 + 탭 이동)', async ({
  page,
}) => {
  test.setTimeout(3 * 60_000);

  // 진짜 송장 정보가 마켓 API 로 전송될 수 있어 default 없이 env 명시 강제.
  if (DELIVERY_COMPANY.length === 0 || TRACKING_NUMBER.length === 0) {
    throw new Error(
      `본 ATC 는 env ATC_DELIVERY_COMPANY + ATC_TRACKING_NUMBER 가 필요합니다.\n` +
        `실행 예: ATC_DELIVERY_COMPANY=CJ대한통운 ATC_TRACKING_NUMBER=1234567890 npx playwright test ...\n` +
        `현재 값 — ATC_DELIVERY_COMPANY="${DELIVERY_COMPANY}", ATC_TRACKING_NUMBER="${TRACKING_NUMBER}"`,
    );
  }

  const inputs = {
    delivery_company: DELIVERY_COMPANY,
    tracking_number: TRACKING_NUMBER,
  };
  logger.info(
    `[instruct-to-delivering] inputs — delivery_company="${DELIVERY_COMPANY}", tracking_number="${TRACKING_NUMBER}"`,
  );

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
