/**
 * 연결설정 / 카카오톡 페이지 + 연결 해제 모달 (non-destructive).
 *
 * 대응 ATC : atcs/base-setting/connect-kakao-app.atc.yml
 * TC 원본  : Case No 3408, 3410, 3419, 3423, 3424, 3428 / P0 (6건).
 *           OAuth/external/toggle destructive skip.
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
  'connect-kakao-app.atc.yml',
);

const PAGE_URL = 'https://app.windly.cc/view3/connect?setting=KAKAO_APP';

const SECTION_HEADERS = [
  '카카오톡 계정 연결 설정',
  '채널 친구 추가',
  '알림 받기 기능 활성화 확인',
];

const CONNECT_BUTTON = '카카오 계정 연결하기';
const ADD_CHANNEL_BUTTON = '채널 친구 추가하기';
const DISCONNECT_BUTTON = '연결 해제';
const DISCONNECT_MODAL_TITLE = '카카오톡 계정 연결 해제';
const CANCEL_BUTTON = '취소';

const ALERT_LABELS = ['주문알림 받기', 'AI 전세계 상품수집 완료알림 받기'];

let disconnectModalOpened = false;

const enterKakaoAppConnectStep: StepHandler = async (page) => {
  disconnectModalOpened = false;
  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
  await page
    .getByText(/카카오톡 계정 연결 설정|카카오/)
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 })
    .catch(() => undefined);
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (!bodyText.includes(SECTION_HEADERS[0])) {
    return {
      ok: false as const,
      error_key: 'kakao_connect_page_not_loaded' as ErrorKey,
      message: `${SECTION_HEADERS[0]} 헤더 미노출`,
    };
  }
  return { ok: true as const };
};

const verifySectionHeadersStep: StepHandler = async (page) => {
  const bodyText = await page.evaluate(() => document.body.innerText);
  const missing = SECTION_HEADERS.filter((h) => !bodyText.includes(h));
  if (missing.length > 0) {
    return {
      ok: false as const,
      error_key: 'kakao_section_header_missing' as ErrorKey,
      message: `섹션 헤더 누락: ${missing.join(' / ')}`,
    };
  }
  return { ok: true as const };
};

const verifyConnectButtonsStep: StepHandler = async (page) => {
  const bodyText = await page.evaluate(() => document.body.innerText);
  const missing: string[] = [];
  if (!bodyText.includes(CONNECT_BUTTON)) missing.push(CONNECT_BUTTON);
  if (!bodyText.includes(ADD_CHANNEL_BUTTON)) missing.push(ADD_CHANNEL_BUTTON);
  if (missing.length > 0) {
    return {
      ok: false as const,
      error_key: 'kakao_connect_buttons_missing' as ErrorKey,
      message: `버튼 누락: ${missing.join(' / ')}`,
    };
  }
  return { ok: true as const };
};

const verifyAlertTogglesLabelsStep: StepHandler = async (page) => {
  const bodyText = await page.evaluate(() => document.body.innerText);
  const missing = ALERT_LABELS.filter((l) => !bodyText.includes(l));
  if (missing.length > 0) {
    return {
      ok: false as const,
      error_key: 'kakao_alert_labels_missing' as ErrorKey,
      message: `알림 토글 라벨 누락: ${missing.join(' / ')}`,
    };
  }
  return { ok: true as const };
};

const openDisconnectModalOrSkipStep: StepHandler = async (page) => {
  const disconnectBtn = page.getByRole('button', { name: DISCONNECT_BUTTON, exact: true }).first();
  if (!(await disconnectBtn.isVisible().catch(() => false))) {
    // eslint-disable-next-line no-console
    console.log('[TC3419] 카카오 미연결 - 연결 해제 모달 흐름 skip success.');
    return { ok: true as const };
  }
  await disconnectBtn.click({ timeout: 5_000 });
  await page.waitForTimeout(800);
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (!bodyText.includes(DISCONNECT_MODAL_TITLE)) {
    return {
      ok: false as const,
      error_key: 'kakao_disconnect_modal_not_opened' as ErrorKey,
      message: `${DISCONNECT_MODAL_TITLE} 모달 title 미노출`,
    };
  }
  disconnectModalOpened = true;
  return { ok: true as const };
};

const closeDisconnectModalOrSkipStep: StepHandler = async (page) => {
  if (!disconnectModalOpened) {
    return { ok: true as const };
  }
  const cancel = page.getByRole('button', { name: CANCEL_BUTTON, exact: true }).first();
  if (await cancel.isVisible().catch(() => false)) {
    await cancel.click({ timeout: 3_000 });
  } else {
    await page.keyboard.press('Escape');
  }
  await page.waitForTimeout(800);
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (bodyText.includes(DISCONNECT_MODAL_TITLE)) {
    return {
      ok: false as const,
      error_key: 'kakao_disconnect_modal_not_closed' as ErrorKey,
      message: '취소 후 연결 해제 모달이 닫히지 않음',
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  enter_kakao_app_connect: enterKakaoAppConnectStep,
  verify_section_headers: verifySectionHeadersStep,
  verify_connect_buttons: verifyConnectButtonsStep,
  verify_alert_toggles_labels: verifyAlertTogglesLabelsStep,
  open_disconnect_modal_or_skip: openDisconnectModalOrSkipStep,
  close_disconnect_modal_or_skip: closeDisconnectModalOrSkipStep,
};

test('[TC 3408/3410/3419/3423/3424/3428] 연결설정 → 카카오톡 페이지 → 3 섹션 헤더 + [카카오 계정 연결하기] + [채널 친구 추가하기] + 2 알림 토글 (주문/AI) 노출 → (연결 환경 시) [연결 해제] 모달 open/cancel', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
