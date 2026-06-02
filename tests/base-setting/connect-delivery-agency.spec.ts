/**
 * 연결설정 / 배송대행지 페이지 + 퀵스타 연결 모달 검증 (non-destructive).
 *
 * 대응 ATC : atcs/base-setting/connect-delivery-agency.atc.yml
 * TC 원본  : Case No 1321, 1323, 1325, 1327, 1328 / P0 (5건).
 *           실 연동/회원가입 (1324/1329) destructive skip.
 *
 * 환경 의존: 퀵스타 미연결이면 ConnectModal 노출 흐름. 연결됐으면 skip success.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'base-setting',
  'connect-delivery-agency.atc.yml',
);

const PAGE_URL = 'https://app.windly.cc/view3/connect?setting=DELIVERY_AGENCY';

const HEADER_TEXT = '사용하실 배송대행지를 연결해 주세요';
const QUICKSTAR_LABEL = '퀵스타';
const TOSSTOSS_LABEL = '토스토스';
const CONNECT_BUTTON_LABEL = '연결';
const DISCONNECT_BUTTON_LABEL = '연결 해제';
const CONNECT_MODAL_TITLE = '퀵스타 연결';
const SIGNUP_LINK = '회원가입 하기';
const SIGNUP_MODAL_TITLE = '퀵스타 회원가입';

// 모달 흐름 활성 여부를 step 간 공유 — closure 로 캡처.
let connectModalOpened = false;
let signupModalOpened = false;

const enterDeliveryAgencyConnectStep: StepHandler = async (page) => {
  // 새 spec 시작 시 상태 초기화.
  connectModalOpened = false;
  signupModalOpened = false;

  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
  await page
    .getByText(new RegExp(HEADER_TEXT))
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 })
    .catch(() => undefined);
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (!bodyText.includes(HEADER_TEXT)) {
    return {
      ok: false as const,
      error_key: 'delivery_agency_header_missing' as ErrorKey,
      message: `${HEADER_TEXT} 헤더 미노출`,
    };
  }
  return { ok: true as const };
};

const verifyTwoAgencyCardsVisibleStep: StepHandler = async (page) => {
  const bodyText = await page.evaluate(() => document.body.innerText);
  const missing: string[] = [];
  if (!bodyText.includes(QUICKSTAR_LABEL)) missing.push(QUICKSTAR_LABEL);
  if (!bodyText.includes(TOSSTOSS_LABEL)) missing.push(TOSSTOSS_LABEL);
  if (missing.length > 0) {
    return {
      ok: false as const,
      error_key: 'agency_card_label_missing' as ErrorKey,
      message: `배송대행지 카드 라벨 누락: ${missing.join(' / ')}`,
    };
  }
  return { ok: true as const };
};

const openQuickstarConnectModalOrSkipStep: StepHandler = async (page) => {
  // 퀵스타 카드 안 "연결" 버튼을 클릭. 이미 연결 상태면 버튼 라벨이 "연결 해제" 라
  // 모달 안 열리고 disconnect modal 이 열림 — 그 경우 skip.
  const quickstarConnectBtn = page.getByRole('button', { name: CONNECT_BUTTON_LABEL, exact: true }).first();
  const quickstarDisconnectBtn = page
    .getByRole('button', { name: DISCONNECT_BUTTON_LABEL, exact: true })
    .first();

  const hasConnect = await quickstarConnectBtn.isVisible().catch(() => false);
  const hasDisconnect = await quickstarDisconnectBtn.isVisible().catch(() => false);

  if (hasDisconnect && !hasConnect) {
    // eslint-disable-next-line no-console
    console.log('[TC1323] 퀵스타 이미 연결됨 — ConnectModal 흐름 skip success.');
    return { ok: true as const };
  }

  if (!hasConnect) {
    return {
      ok: false as const,
      error_key: 'quickstar_connect_button_missing' as ErrorKey,
      message: `퀵스타 ${CONNECT_BUTTON_LABEL} 버튼 미노출`,
    };
  }

  try {
    await quickstarConnectBtn.click({ timeout: 3_000 });
  } catch (e) {
    return {
      ok: false as const,
      error_key: 'quickstar_connect_button_click_failed' as ErrorKey,
      message: `퀵스타 ${CONNECT_BUTTON_LABEL} 버튼 클릭 실패: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
  await page.waitForTimeout(800);

  // ConnectModal 노출 확인.
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (!bodyText.includes(CONNECT_MODAL_TITLE)) {
    return {
      ok: false as const,
      error_key: 'quickstar_connect_modal_not_opened' as ErrorKey,
      message: `${CONNECT_MODAL_TITLE} modal title 미노출`,
    };
  }
  connectModalOpened = true;
  return { ok: true as const };
};

const verifyConnectModalTitleStep: StepHandler = async (page) => {
  if (!connectModalOpened) {
    // skip - 이미 연결됐던 케이스
    return { ok: true as const };
  }
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (!bodyText.includes(CONNECT_MODAL_TITLE)) {
    return {
      ok: false as const,
      error_key: 'connect_modal_title_lost' as ErrorKey,
      message: `${CONNECT_MODAL_TITLE} title 가 노출 안 됨 - 모달이 빠르게 닫혔거나 selector 변경`,
    };
  }
  return { ok: true as const };
};

const openSignupModalStep: StepHandler = async (page) => {
  if (!connectModalOpened) {
    return { ok: true as const };
  }
  // "회원가입 하기" — Link 컴포넌트로 렌더링됨. role=link 또는 role=button 일 수 있어 텍스트로 매칭.
  const signupLink = page.getByText(SIGNUP_LINK, { exact: true }).first();
  try {
    await signupLink.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'signup_link_missing' as ErrorKey,
      message: `${SIGNUP_LINK} 링크 미노출`,
    };
  }
  await signupLink.click({ timeout: 3_000 });
  await page.waitForTimeout(800);
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (!bodyText.includes(SIGNUP_MODAL_TITLE)) {
    return {
      ok: false as const,
      error_key: 'signup_modal_not_opened' as ErrorKey,
      message: `${SIGNUP_MODAL_TITLE} modal title 미노출`,
    };
  }
  signupModalOpened = true;
  return { ok: true as const };
};

const verifySignupModalTitleStep: StepHandler = async (page) => {
  if (!signupModalOpened) {
    return { ok: true as const };
  }
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (!bodyText.includes(SIGNUP_MODAL_TITLE)) {
    return {
      ok: false as const,
      error_key: 'signup_modal_title_lost' as ErrorKey,
      message: `${SIGNUP_MODAL_TITLE} title 노출 안 됨`,
    };
  }
  return { ok: true as const };
};

const closeAllModalsStep: StepHandler = async (page) => {
  if (signupModalOpened) {
    // SignUpModal 의 "취소" 버튼 클릭.
    const cancel = page.getByRole('button', { name: '취소', exact: true }).first();
    if (await cancel.isVisible().catch(() => false)) {
      await cancel.click({ timeout: 3_000 }).catch(() => undefined);
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(500);
  }
  if (connectModalOpened) {
    // ConnectModal 닫기 — Escape 가 가장 안전 (modal X 버튼 또는 outside click).
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  enter_delivery_agency_connect: enterDeliveryAgencyConnectStep,
  verify_two_agency_cards_visible: verifyTwoAgencyCardsVisibleStep,
  open_quickstar_connect_modal_or_skip: openQuickstarConnectModalOrSkipStep,
  verify_connect_modal_title: verifyConnectModalTitleStep,
  open_signup_modal: openSignupModalStep,
  verify_signup_modal_title: verifySignupModalTitleStep,
  close_all_modals: closeAllModalsStep,
};

test('[TC 1321/1323/1325/1327/1328] 연결설정 → 배송대행지 페이지 → 퀵스타/토스토스 카드 → 퀵스타 [연결] 클릭 → ConnectModal → [회원가입 하기] → SignUpModal 열림 → 모두 닫기 (연결된 환경이면 모달 흐름 skip)', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
