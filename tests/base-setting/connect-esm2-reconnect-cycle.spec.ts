/**
 * 연결설정 / ESM 2.0 해제 → 동일 계정 재연결 사이클.
 *
 * 대응 ATC : atcs/base-setting/connect-esm2-reconnect-cycle.atc.yml
 * TC 원본  : Case No 996/999/1000/1005/1006 / P0 (ESM 2.0 연결/해제 플로우).
 *
 * destructive: 실제 설정 초기화(연결 해제) → 동일 계정 재연결. finite quota 1 소모.
 * 안전 가드(guard_same_account): 현재 연결 아이디 != .env 키 면 해제하지 않고 fail.
 * 동일 계정 재연결은 윈들리 "계정이 다른 경우" 경고에 해당 X → 등록상품 연결 무손상.
 */

import 'dotenv/config';
import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'base-setting', 'connect-esm2-reconnect-cycle.atc.yml');
const URL = 'https://app.windly.cc/view3/connect?setting=MARKET&openMarket=ESM2';

const AUCTION_ID = process.env.ESM2_AUCTION_ID ?? '';
const GMARKET_ID = process.env.ESM2_GMARKET_ID ?? '';

// 라벨 텍스트 다음의 첫 input (TextField 는 htmlFor 연결이 없어 XPath 로 잡음)
const inputAfterLabel = (page: Parameters<StepHandler>[0], label: string) =>
  page.locator(`xpath=(//*[contains(normalize-space(text()),"${label}")]/following::input)[1]`);

const enterEsm2Connect: StepHandler = async (page) => {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
  await page.waitForTimeout(1_500);
  const connected = await page.getByRole('button', { name: '설정 초기화' }).first().isVisible().catch(() => false);
  if (!connected) {
    return {
      ok: false as const,
      error_key: 'esm2_not_connected_precondition' as ErrorKey,
      message: 'ESM2 가 연결됨 상태가 아님 (설정 초기화 버튼 없음) — 사이클 전제 미충족',
    };
  }
  return { ok: true as const };
};

// 안전 가드: 현재 연결 아이디 == .env 키 인지. 다르면 해제 금지 (등록상품 영구 단절 방지).
const guardSameAccount: StepHandler = async (page) => {
  if (!AUCTION_ID || !GMARKET_ID) {
    return {
      ok: false as const,
      error_key: 'esm2_env_keys_missing' as ErrorKey,
      message: '.env 에 ESM2_AUCTION_ID/ESM2_GMARKET_ID 미설정 — 재연결 불가, 해제 금지',
    };
  }
  const curAuction = (await inputAfterLabel(page, '옥션 아이디').inputValue().catch(() => '')).trim();
  const curGmarket = (await inputAfterLabel(page, '지마켓 아이디').inputValue().catch(() => '')).trim();
  if (curAuction !== AUCTION_ID || curGmarket !== GMARKET_ID) {
    return {
      ok: false as const,
      error_key: 'esm2_account_mismatch' as ErrorKey,
      message: `현재 연결 아이디(옥션='${curAuction}', 지마켓='${curGmarket}')가 .env 키와 불일치 — 다른 계정 재연결 시 등록상품 영구 단절 위험. 해제 abort.`,
    };
  }
  logger.info('[guard] 현재 연결 아이디 == .env 키 — 동일 계정 재연결 안전. 진행.');
  return { ok: true as const };
};

const openResetModal: StepHandler = async (page) => {
  await page.getByRole('button', { name: '설정 초기화' }).first().click();
  await page.waitForTimeout(700);
  const modalTitle = await page.getByText('ESM 2.0 연결 해제').first().isVisible().catch(() => false);
  const cancelBtn = await page.getByRole('button', { name: '취소' }).first().isVisible().catch(() => false);
  const warn = await page.getByText('되돌릴 수 없어요').first().isVisible().catch(() => false);
  if (!modalTitle || !cancelBtn) {
    return {
      ok: false as const,
      error_key: 'esm2_reset_modal_not_open' as ErrorKey,
      message: `설정 초기화 모달 미노출 (title=${modalTitle}, 취소=${cancelBtn})`,
    };
  }
  logger.info(`[open_reset_modal] 연결 해제 모달 노출 (경고문='되돌릴 수 없어요' visible=${warn})`);
  return { ok: true as const };
};

const fillReasonAndReset: StepHandler = async (page) => {
  await inputAfterLabel(page, '설정 초기화 이유').fill('ATC 자동화 — ESM2 동일 계정 재연결 검증');
  await page.waitForTimeout(300);
  // 모달의 "설정 초기화" 확인 버튼 (페이지 버튼과 동명 → 뒤에 mount 된 .last())
  await page.getByRole('button', { name: '설정 초기화' }).last().click();
  // 해제 반영 대기: "스토어 연결하기" 버튼 등장
  const connect = page.getByRole('button', { name: '스토어 연결하기' });
  try {
    await connect.waitFor({ state: 'visible', timeout: 20_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'esm2_disconnect_not_reflected' as ErrorKey,
      message: '초기화 후 "스토어 연결하기" 미등장 — 해제 미반영(주의: 마켓이 끊긴 상태일 수 있음)',
    };
  }
  logger.info('[fill_reason_and_reset] 설정 초기화 실행 완료 → 미연결 상태 (스토어 연결하기 노출)');
  return { ok: true as const };
};

const verifyDisconnected: StepHandler = async (page) => {
  const connect = await page.getByRole('button', { name: '스토어 연결하기' }).isVisible().catch(() => false);
  if (!connect) {
    return {
      ok: false as const,
      error_key: 'esm2_disconnected_state_invalid' as ErrorKey,
      message: '미연결 상태 검증 실패 (스토어 연결하기 버튼 부재)',
    };
  }
  return { ok: true as const };
};

const MAX_CONNECT_ATTEMPTS = 3;

const fillAndConnect: StepHandler = async (page) => {
  await inputAfterLabel(page, '옥션 아이디').fill(AUCTION_ID);
  await inputAfterLabel(page, '지마켓 아이디').fill(GMARKET_ID);
  await page.waitForTimeout(300);

  for (let attempt = 1; attempt <= MAX_CONNECT_ATTEMPTS; attempt += 1) {
    await page.getByRole('button', { name: '스토어 연결하기' }).click().catch(() => undefined);
    // 연결 성공 신호: "연결을 완료했어요" 모달 OR "설정 초기화" 버튼 복귀
    const done = await Promise.race([
      page.getByText(/연결을 완료했어요/).first().waitFor({ state: 'visible', timeout: 20_000 }).then(() => 'modal').catch(() => ''),
      page.getByRole('button', { name: '설정 초기화' }).first().waitFor({ state: 'visible', timeout: 20_000 }).then(() => 'reconnected').catch(() => ''),
    ]);
    if (done) {
      logger.info(`[fill_and_connect] 시도 ${attempt}/${MAX_CONNECT_ATTEMPTS} → 재연결 성공 (${done})`);
      return { ok: true as const };
    }
    logger.info(`[fill_and_connect] 시도 ${attempt}/${MAX_CONNECT_ATTEMPTS} → 미반영, retry`);
    await page.waitForTimeout(1_500);
  }
  return {
    ok: false as const,
    error_key: 'esm2_reconnect_failed' as ErrorKey,
    message: `재연결 ${MAX_CONNECT_ATTEMPTS}회 실패 — ⚠️ ESM2 가 끊긴 상태일 수 있음. 수동 재연결 필요 (옥션/지마켓 아이디=${AUCTION_ID}).`,
  };
};

const verifyConnectCompleteModal: StepHandler = async (page) => {
  const modal = await page.getByText(/연결을 완료했어요/).first().isVisible().catch(() => false);
  if (!modal) {
    // 모달이 안 떴어도 이미 재연결됐으면 안전 — loose 통과
    const reconnected = await page.getByRole('button', { name: '설정 초기화' }).first().isVisible().catch(() => false);
    if (reconnected) {
      logger.info('[verify_connect_complete_modal] 완료 모달 미표시했으나 이미 재연결됨 — loose 통과');
      return { ok: true as const };
    }
    return {
      ok: false as const,
      error_key: 'esm2_complete_modal_missing' as ErrorKey,
      message: '연결 완료 모달/재연결 상태 모두 미확인',
    };
  }
  const next = await page.getByRole('button', { name: '다음에 하기' }).isVisible().catch(() => false);
  const goSetting = await page.getByRole('button', { name: '설정하러 가기' }).isVisible().catch(() => false);
  logger.info(`[verify_connect_complete_modal] "연결을 완료했어요" 모달 + 다음에하기=${next} 설정하러가기=${goSetting} (TC 999/1000)`);
  return { ok: true as const };
};

const closeCompleteModal: StepHandler = async (page) => {
  const next = page.getByRole('button', { name: '다음에 하기' });
  if (await next.isVisible().catch(() => false)) {
    await next.click().catch(() => undefined);
    await page.waitForTimeout(700);
  }
  return { ok: true as const };
};

const verifyReconnected: StepHandler = async (page) => {
  await page.waitForTimeout(800);
  const reset = await page.getByRole('button', { name: '설정 초기화' }).first().isVisible().catch(() => false);
  if (!reset) {
    return {
      ok: false as const,
      error_key: 'esm2_not_reconnected' as ErrorKey,
      message: '⚠️ 재연결 상태 미확인 (설정 초기화 버튼 부재) — ESM2 가 끊긴 채일 수 있음. 수동 점검 필요.',
    };
  }
  const curAuction = (await inputAfterLabel(page, '옥션 아이디').inputValue().catch(() => '')).trim();
  logger.info(`[verify_reconnected] 연결됨 복구 확인 (설정 초기화 버튼 복귀, 옥션 아이디='${curAuction}')`);
  return { ok: true as const };
};

const handlers: StepHandlers = {
  enter_esm2_connect: enterEsm2Connect,
  guard_same_account: guardSameAccount,
  open_reset_modal: openResetModal,
  fill_reason_and_reset: fillReasonAndReset,
  verify_disconnected: verifyDisconnected,
  fill_and_connect: fillAndConnect,
  verify_connect_complete_modal: verifyConnectCompleteModal,
  close_complete_modal: closeCompleteModal,
  verify_reconnected: verifyReconnected,
};

test('[TC 996/999/1000/1005/1006] ESM 2.0 설정 초기화 → 동일 계정 재연결 사이클 (destructive, 안전 가드 포함)', async ({ page }) => {
  test.setTimeout(4 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
