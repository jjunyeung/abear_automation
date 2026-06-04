/**
 * 마켓 연결 해제 → 동일 계정 재연결 사이클 공통 핸들러 빌더.
 *
 * ESM2/11번가국내/쿠팡/톡스토어가 동일 플로우를 공유:
 *   설정 초기화(red) → DisconnectModal(취소/설정 초기화, "되돌릴 수 없어요")
 *   → 해제 → 필드 입력 → "스토어 연결하기" → "연결을 완료했어요" 모달 → 다음에 하기.
 * (스마트스토어는 중간 확인모달이 있어 별도 spec.)
 *
 * 안전 가드: 해제 전 현재 연결 식별 필드 == .env 키 인지 확인. 다르면 abort(해제 X).
 * 동일 계정 재연결은 윈들리 "계정이 다른 경우" 경고에 미해당 → 등록상품 무손상.
 *
 * 헬퍼 모듈 (spec 아님). tests/ 내부 공유 패턴 (CLAUDE (l) _handlers 패턴과 동일).
 */

import type { StepHandler, StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

export interface MarketField {
  /** 폼 라벨 텍스트 (XPath following::input 으로 매칭) */
  label: string;
  /** 입력/대조 값 (.env) */
  value: string;
  /** 해제 전 동일계정 가드에서 현재값과 대조할지 (마스킹되는 키 필드는 false) */
  guard: boolean;
  /** 재연결 시 이 필드를 채울지 (기본 true). 연결에 불필요한 식별/가드 전용 필드는 false. */
  fillOnReconnect?: boolean;
}

export interface MarketCycleConfig {
  marketEnum: string;
  marketName: string;
  connectUrl: string;
  fields: MarketField[];
  /** 재연결 버튼 텍스트 (기본 "스토어 연결하기") */
  connectButtonName?: string;
  /**
   * 2단계 연결 마켓: connect 버튼 클릭 후 중간 확인 모달의 확정 버튼 텍스트.
   * 이 버튼이 실제 연결(putBaseSetting)을 트리거. 미설정이면 직접 연결(ESM2/11번가).
   * 예) 쿠팡/톡스토어 = "확인했어요", 스마트스토어 = "맞습니다".
   */
  intermediateConfirm?: string;
}

type Page = Parameters<StepHandler>[0];

const inputAfterLabel = (page: Page, label: string) =>
  page.locator(`xpath=(//*[contains(normalize-space(text()),"${label}")]/following::input)[1]`);

export function buildReconnectHandlers(cfg: MarketCycleConfig): StepHandlers {
  const connectBtn = cfg.connectButtonName ?? '스토어 연결하기';
  const tag = cfg.marketEnum;

  const enter: StepHandler = async (page) => {
    await page.goto(cfg.connectUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
    await page.waitForTimeout(1_500);
    const connected = await page.getByRole('button', { name: '설정 초기화' }).first().isVisible().catch(() => false);
    if (!connected) {
      return {
        ok: false as const,
        error_key: `${tag}_not_connected_precondition` as ErrorKey,
        message: `${cfg.marketName} 연결됨 상태 아님 (설정 초기화 버튼 없음)`,
      };
    }
    return { ok: true as const };
  };

  const guard: StepHandler = async (page) => {
    const missing = cfg.fields.filter((f) => !f.value).map((f) => f.label);
    if (missing.length) {
      return {
        ok: false as const,
        error_key: `${tag}_env_keys_missing` as ErrorKey,
        message: `.env 키 미설정: ${missing.join(', ')} — 재연결 불가, 해제 금지`,
      };
    }
    for (const f of cfg.fields.filter((x) => x.guard)) {
      const cur = (await inputAfterLabel(page, f.label).inputValue().catch(() => '')).trim();
      if (cur !== f.value) {
        return {
          ok: false as const,
          error_key: `${tag}_account_mismatch` as ErrorKey,
          message: `현재 연결 ${f.label}='${cur}' != .env 키 — 다른 계정 재연결 시 등록상품 영구 단절 위험. 해제 abort.`,
        };
      }
    }
    logger.info(`[${tag}:guard] 현재 연결 식별필드 == .env 키 — 동일 계정 재연결 안전. 진행.`);
    return { ok: true as const };
  };

  const openResetModal: StepHandler = async (page) => {
    await page.getByRole('button', { name: '설정 초기화' }).first().click();
    await page.waitForTimeout(700);
    const cancel = await page.getByRole('button', { name: '취소' }).first().isVisible().catch(() => false);
    const warn = await page.getByText('되돌릴 수 없어요').first().isVisible().catch(() => false);
    if (!cancel || !warn) {
      return {
        ok: false as const,
        error_key: `${tag}_reset_modal_not_open` as ErrorKey,
        message: `연결 해제 모달 미노출 (취소=${cancel}, 경고문=${warn})`,
      };
    }
    logger.info(`[${tag}:open_reset_modal] 연결 해제 모달 노출 (취소/설정초기화/경고문)`);
    return { ok: true as const };
  };

  const fillReasonAndReset: StepHandler = async (page) => {
    await inputAfterLabel(page, '설정 초기화 이유').fill(`ATC 자동화 — ${cfg.marketName} 동일 계정 재연결 검증`);
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: '설정 초기화' }).last().click();
    const connect = page.getByRole('button', { name: connectBtn });
    try {
      await connect.waitFor({ state: 'visible', timeout: 20_000 });
    } catch {
      return {
        ok: false as const,
        error_key: `${tag}_disconnect_not_reflected` as ErrorKey,
        message: `초기화 후 "${connectBtn}" 미등장 — ⚠️ 마켓이 끊긴 상태일 수 있음`,
      };
    }
    logger.info(`[${tag}:reset] 설정 초기화 실행 완료 → 미연결 (${connectBtn} 노출)`);
    return { ok: true as const };
  };

  const verifyDisconnected: StepHandler = async (page) => {
    const v = await page.getByRole('button', { name: connectBtn }).isVisible().catch(() => false);
    if (!v) {
      return {
        ok: false as const,
        error_key: `${tag}_disconnected_state_invalid` as ErrorKey,
        message: `미연결 상태 검증 실패 (${connectBtn} 부재)`,
      };
    }
    return { ok: true as const };
  };

  const fillAndConnect: StepHandler = async (page) => {
    for (const f of cfg.fields.filter((x) => x.fillOnReconnect !== false)) {
      const inp = inputAfterLabel(page, f.label);
      if (await inp.count().then((c) => c > 0).catch(() => false)) {
        await inp.fill(f.value).catch(() => logger.info(`[${tag}:connect] 필드 "${f.label}" fill 실패 — skip`));
      } else {
        logger.info(`[${tag}:connect] 필드 "${f.label}" 미발견 — fill skip`);
      }
    }
    await page.waitForTimeout(300);
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await page.getByRole('button', { name: connectBtn }).click().catch(() => undefined);
      // 2단계 마켓: 중간 확인 모달의 확정 버튼 클릭 (실제 연결 트리거)
      if (cfg.intermediateConfirm) {
        const confirm = page.getByRole('button', { name: cfg.intermediateConfirm });
        try {
          await confirm.waitFor({ state: 'visible', timeout: 10_000 });
          await confirm.click();
          logger.info(`[${tag}:connect] 중간 확인 모달 "${cfg.intermediateConfirm}" 클릭 (실제 연결 트리거)`);
        } catch {
          logger.info(`[${tag}:connect] 시도 ${attempt}/3 → 중간 확인 모달("${cfg.intermediateConfirm}") 미노출`);
        }
      }
      const done = await Promise.race([
        page.getByText(/연결을 완료했어요/).first().waitFor({ state: 'visible', timeout: 20_000 }).then(() => 'modal').catch(() => ''),
        page.getByRole('button', { name: '설정 초기화' }).first().waitFor({ state: 'visible', timeout: 20_000 }).then(() => 'reconnected').catch(() => ''),
      ]);
      if (done) {
        logger.info(`[${tag}:connect] 시도 ${attempt}/3 → 재연결 성공 (${done})`);
        return { ok: true as const };
      }
      logger.info(`[${tag}:connect] 시도 ${attempt}/3 → 미반영, retry`);
      await page.waitForTimeout(1_500);
    }
    return {
      ok: false as const,
      error_key: `${tag}_reconnect_failed` as ErrorKey,
      message: `재연결 3회 실패 — ⚠️ ${cfg.marketName} 가 끊긴 상태일 수 있음. 수동 재연결 필요.`,
    };
  };

  const verifyConnectCompleteModal: StepHandler = async (page) => {
    const modal = await page.getByText(/연결을 완료했어요/).first().isVisible().catch(() => false);
    if (!modal) {
      const reconnected = await page.getByRole('button', { name: '설정 초기화' }).first().isVisible().catch(() => false);
      if (reconnected) {
        logger.info(`[${tag}:complete] 완료 모달 미표시했으나 이미 재연결됨 — loose 통과`);
        return { ok: true as const };
      }
      return {
        ok: false as const,
        error_key: `${tag}_complete_modal_missing` as ErrorKey,
        message: '연결 완료 모달/재연결 상태 모두 미확인',
      };
    }
    const next = await page.getByRole('button', { name: '다음에 하기' }).isVisible().catch(() => false);
    const goSetting = await page.getByRole('button', { name: '설정하러 가기' }).isVisible().catch(() => false);
    logger.info(`[${tag}:complete] "연결을 완료했어요" + 다음에하기=${next} 설정하러가기=${goSetting} (TC 999/1000)`);
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
        error_key: `${tag}_not_reconnected` as ErrorKey,
        message: `⚠️ 재연결 상태 미확인 (설정 초기화 버튼 부재) — ${cfg.marketName} 가 끊긴 채일 수 있음. 수동 점검 필요.`,
      };
    }
    logger.info(`[${tag}:verify_reconnected] 연결됨 복구 확인 (설정 초기화 버튼 복귀)`);
    return { ok: true as const };
  };

  return {
    enter_connect: enter,
    guard_same_account: guard,
    open_reset_modal: openResetModal,
    fill_reason_and_reset: fillReasonAndReset,
    verify_disconnected: verifyDisconnected,
    fill_and_connect: fillAndConnect,
    verify_connect_complete_modal: verifyConnectCompleteModal,
    close_complete_modal: closeCompleteModal,
    verify_reconnected: verifyReconnected,
  };
}
