/**
 * ATC step runner — orchestrates step execution, on_error matching, recovery
 * dispatch, resume-point selection (D4), unhandled errors (D11), and
 * single-attempt recovery (D12).
 *
 * Fulfills:
 *   R-A1.5 (recovery 분기 + 재개):
 *     given: step의 `on_error: [recovery_id_a, recovery_id_b]` 정의 + 에러체크가
 *            `error_key="recovery_id_a"` 반환
 *     when:  그 step에서 에러 발생
 *     then:  `recover(page, ctx)` 호출 → 정상 종료 시 D4 재개 지점으로 복귀 →
 *            결과 리포트에 "복구 사용: recovery_id_a" 기록
 *   R-A1.6 (unhandled — D11):
 *     given: ATC step에서 에러 발생 + 매칭되는 on_error 없음 또는 recovery 미존재
 *     when:  runner가 에러 감지
 *     then:  자동 복구 시도 없이 즉시 ATC 실패 처리, `unhandled error: <key>` 기록
 *   R-A1.7 (recovery 자체 실패 — D12):
 *     given: recover() 실행 중 예외 발생
 *     when:  runner가 복구 실패 감지
 *     then:  재귀 호출 없이 1회로 종료, "recovery '<id>' attempt failed: <reason>"
 *            + 본 ATC step도 FAIL
 *
 * Design:
 *   - StepHandler가 작업의 실제 Playwright 호출을 캡슐화한다 (ATC `do` 자연어 →
 *     코드 변환은 spec 파일의 stepHandlers가 담당). runner는 흐름 제어만.
 *   - StepHandler는 throw 대신 `{ ok: false, error_key }`로 에러를 보고하는 것이
 *     1순위; 핸들러가 throw하면 즉시 실패 (등록된 error_key 없음 = unhandled 동등).
 *   - 복구가 성공하면 D4 규칙에 따라 인덱스 재조정:
 *       on_recovery.restart_from === '__start__'  → i = 0
 *       on_recovery.restart_from === <step_id>    → 해당 step 인덱스
 *       기본                                       → 실패한 step 그대로 (재시도)
 */

import type { Page } from '@playwright/test';
import type { ErrorKey, RecoveryContext } from './errors';
import type { ATC } from './atc-schema';
import { RecoveryRegistry } from './recovery-registry';
import { logger } from './logger';
import {
  getEmittedOutputs,
  resetEmittedOutputs,
  type OutputValue,
} from './atc-output';

/** Per-step terminal status recorded in the run report. */
export type StepStatus = 'success' | 'failed' | 'recovered' | 'unhandled' | 'skipped';

/** Single-step execution record (one entry per attempt). */
export interface StepResult {
  step_id: string;
  status: StepStatus;
  duration_ms: number;
  error_key?: ErrorKey;
  recovery_id?: string;
  message?: string;
}

/**
 * "미실행(blocked)" 으로 분류할 error_key 목록 — 코드 회귀가 아니라 외부/환경 요인이라
 * 자동화로 진행 자체가 불가능한 케이스. 이 키로 끝나면 실패가 아니라 `overall: 'skipped'`
 * 로 보고해 스케줄 리포트에서 진짜 회귀 실패와 분리한다 (스케줄 빨강 노이즈 제거).
 *  - upload_quota_exceeded: 플랜 등록상품수 사용량 소진 (사람이 플랜/슬롯 정리해야 함)
 *  - collect_failed: 외부 소스(타오바오 등) 수집 실패
 *  - missing_input: from:previous 입력이 없어(단독/스케줄 재시도 실행 시 앞 TC outputs 미주입)
 *    TC 가 실제로 실행되지 못한 경우. retry 가 입력 없이 "안 돈" 것이라 실패가 아니라 미실행.
 *  - no_ready_card: URL 수집 후 "수집중"→ProductCard swap 타이밍 race 로 첫 카드 미노출.
 *    재실행하면 통과하는 일시 환경 요인 — 스케줄에서 재시도 대신 미실행 처리.
 *  - esm_option_setting_absent / esm_option_modal_not_opened / esm_nothing_to_fix:
 *    ESM 추천옵션 매칭 TC 의 "수정할 부분 없음" 케이스. ESM 모드는 수집 시점부터 보통
 *    이미 잘 설정돼 있어 매칭할 옵션이 없는 상품이 다수 — 손댈 게 없으면 실패가 아니라 미실행.
 *    (매칭할 칩이 있어 수정을 시도한 뒤의 생성/저장/에러체크 실패는 그대로 failed.)
 * 새 외부요인 키는 여기에만 추가하면 소비자(reporter/배치)는 overall==='skipped' 만 본다.
 */
const NOT_EXECUTED_KEYS = new Set<string>([
  'upload_quota_exceeded',
  'collect_failed',
  'missing_input',
  'no_ready_card',
  'esm_option_setting_absent',
  'esm_option_modal_not_opened',
  'esm_nothing_to_fix',
]);

/** Aggregate result returned by `runATC()`. */
export interface RunResult {
  atc_title: string;
  steps: StepResult[];
  overall: 'success' | 'failed' | 'skipped';
  inputs_used: Record<string, unknown>;
  /**
   * spec.ts 가 `emitOutput()` 으로 채운 "다음 TC 가 받아갈" 값들. 빈 객체면
   * 이 TC 는 어떤 output 도 발급하지 않은 것. GUI 큐가 같은 batch 의 뒤 TC
   * 입력 자동 주입에 사용 (inputs.<name>.from === 'previous' 매칭).
   */
  outputs: Record<string, OutputValue>;
}

/** Outcome shape a StepHandler MUST return. */
export type StepOutcome =
  | { ok: true }
  | { ok: false; error_key: ErrorKey; message?: string };

/**
 * Concrete Playwright work for a single step. ATC `do` text describes intent;
 * the spec file provides one StepHandler per step id.
 */
export type StepHandler = (
  page: Page,
  inputs: Record<string, unknown>,
) => Promise<StepOutcome>;

/** Map of step id → handler. Spec files build this. */
export type StepHandlers = Record<string, StepHandler>;

/** Options accepted by `runATC()`. */
export interface RunOptions {
  atc: ATC;
  page: Page;
  inputs: Record<string, unknown>;
  handlers: StepHandlers;
  /** Defaults to `${process.cwd()}/recoveries`. */
  recoveriesDir?: string;
  /** Defaults to a fresh load from `recoveriesDir`. Override for tests/injection. */
  registry?: RecoveryRegistry;
}

/**
 * Execute the ATC end-to-end. Returns a structured RunResult on every path
 * (never throws — all failures land in `overall: 'failed'`).
 */
export async function runATC(opts: RunOptions): Promise<RunResult> {
  const { atc, page, inputs, handlers } = opts;
  const recoveriesDir = opts.recoveriesDir ?? `${process.cwd()}/recoveries`;
  const registry = opts.registry ?? RecoveryRegistry.load(recoveriesDir);
  const results: StepResult[] = [];

  // spec.ts 가 `emitOutput()` 으로 채울 buffer 를 리셋. 끝에서 getEmittedOutputs()
  // 로 한 번에 읽어 RunResult.outputs 로 옮긴다.
  resetEmittedOutputs();

  // 같은 (step_id, error_key) 로 복구를 이미 시도했는지 추적 — D12(복구 1회) 보장 +
  // 복구 후 재개했는데 같은 에러가 또 나는 무한루프 방지.
  const attemptedRecoveries = new Set<string>();

  let i = 0;
  while (i < atc.steps.length) {
    const step = atc.steps[i];
    const start = Date.now();
    logger.info(`▶ step '${step.id}': ${step.do}`);

    const handler = handlers[step.id];
    if (!handler) {
      const message = `핸들러 미정의: '${step.id}'`;
      results.push({
        step_id: step.id,
        status: 'failed',
        duration_ms: Date.now() - start,
        message,
      });
      logger.error(message);
      return { atc_title: atc.title, steps: results, overall: 'failed', inputs_used: inputs, outputs: getEmittedOutputs() };
    }

    let outcome: StepOutcome;
    try {
      outcome = await handler(page, inputs);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      const message = `핸들러 throw: ${err.message}`;
      results.push({
        step_id: step.id,
        status: 'failed',
        duration_ms: Date.now() - start,
        message,
      });
      logger.error(message);
      return { atc_title: atc.title, steps: results, overall: 'failed', inputs_used: inputs, outputs: getEmittedOutputs() };
    }

    if (outcome.ok) {
      results.push({
        step_id: step.id,
        status: 'success',
        duration_ms: Date.now() - start,
      });
      i += 1;
      continue;
    }

    // ── 에러 발생 — D5 매칭 + 전역 자동복구 ────────────────────────────────
    const ekey = outcome.error_key;
    const candidates = step.on_error ?? [];
    const recoveryAttemptKey = `${step.id}:${String(ekey)}`;
    const alreadyAttempted = attemptedRecoveries.has(recoveryAttemptKey);

    // 1순위: step.on_error 에 명시된 복구. 없으면 전역 fallback —
    // recoveries/ 에 해당 error_key 파일이 있으면 on_error 미명시여도 자동 복구 시도.
    // (recoveries/ 디렉토리 자체가 "자동복구 허용목록" — 복구 파일을 만들어 넣으면 어느
    //  TC 에서 에러가 나든 자동으로 복구를 탄다. 복구 불가 케이스는 파일을 안 만들면 그대로 실패.)
    let matched: string | undefined = candidates.find((c) => c === String(ekey));
    if (matched === undefined && !alreadyAttempted && registry.has(String(ekey))) {
      matched = String(ekey);
      logger.warn(
        `⚠ on_error 미명시지만 recoveries/${String(ekey)} 존재 → 전역 자동 복구 시도`,
      );
    }

    // D11: 복구 대상 없음(매칭X + 파일X) OR 이미 1회 복구함(D12) OR registry 미존재 → unhandled
    if (matched === undefined || alreadyAttempted || !registry.has(matched)) {
      const handlerMessage =
        typeof outcome.message === 'string' && outcome.message.length > 0
          ? outcome.message
          : undefined;
      // 외부/환경 요인(NOT_EXECUTED_KEYS)은 실패가 아니라 '미실행(skipped)' 으로 분리.
      const isNotExecuted = NOT_EXECUTED_KEYS.has(String(ekey));
      // 복구를 1회 시도했는데 같은 에러가 또 난 경우(D12)와 애초에 복구가 없는 경우를 구분.
      const prefix = isNotExecuted
        ? `미실행 (${String(ekey)})`
        : alreadyAttempted
          ? `복구 후 재발 (${String(ekey)})`
          : `unhandled (${String(ekey)})`;
      const message =
        handlerMessage !== undefined ? `${prefix}: ${handlerMessage}` : prefix;
      results.push({
        step_id: step.id,
        status: isNotExecuted ? 'skipped' : 'unhandled',
        duration_ms: Date.now() - start,
        error_key: ekey,
        message,
      });
      if (isNotExecuted) {
        logger.warn(
          `⏭ 미실행 '${String(ekey)}' at step '${step.id}' (외부/환경 요인 — 실패 아님)${handlerMessage !== undefined ? `: ${handlerMessage}` : ''}`,
        );
        return { atc_title: atc.title, steps: results, overall: 'skipped', inputs_used: inputs, outputs: getEmittedOutputs() };
      }
      logger.error(
        `✗ unhandled error '${String(ekey)}' at step '${step.id}'${handlerMessage !== undefined ? `: ${handlerMessage}` : ''}`,
      );
      return { atc_title: atc.title, steps: results, overall: 'failed', inputs_used: inputs, outputs: getEmittedOutputs() };
    }

    // D12: 복구 1회 시도
    const recoverFn = registry.get(matched);
    if (recoverFn === undefined) {
      // registry.has true인데 get undefined는 발생 안 하지만 타입 안전성 위해 가드.
      const message = `registry 불일치: '${matched}'`;
      results.push({
        step_id: step.id,
        status: 'unhandled',
        duration_ms: Date.now() - start,
        error_key: ekey,
        message,
      });
      logger.error(message);
      return { atc_title: atc.title, steps: results, overall: 'failed', inputs_used: inputs, outputs: getEmittedOutputs() };
    }

    const ctx: RecoveryContext = {
      error_key: ekey,
      page_url: page.url(),
      last_step_id: step.id,
      screenshot_path: '',
    };

    // 복구 시도 기록 — 복구 후 같은 step 재개 시 동일 에러가 또 나면 두 번째엔 unhandled (D12).
    attemptedRecoveries.add(recoveryAttemptKey);

    try {
      logger.warn(`⚠ recovery '${matched}' 시작...`);
      await recoverFn(page, ctx);
      logger.info(`✓ recovery '${matched}' 완료`);
      results.push({
        step_id: step.id,
        status: 'recovered',
        duration_ms: Date.now() - start,
        error_key: ekey,
        recovery_id: matched,
      });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      const message = `recovery '${matched}' attempt failed: ${err.message}`;
      results.push({
        step_id: step.id,
        status: 'failed',
        duration_ms: Date.now() - start,
        error_key: ekey,
        recovery_id: matched,
        message,
      });
      logger.error(message);
      return { atc_title: atc.title, steps: results, overall: 'failed', inputs_used: inputs, outputs: getEmittedOutputs() };
    }

    // ── D4: 복구 후 재개 지점 결정 ────────────────────────────────────────
    const restartFrom = step.on_recovery?.restart_from;
    if (restartFrom === '__start__') {
      i = 0;
    } else if (restartFrom !== undefined) {
      const idx = atc.steps.findIndex((s) => s.id === restartFrom);
      if (idx >= 0) {
        i = idx;
      }
      // 못 찾으면 i 그대로 (실패한 step 재시도)
    }
    // 기본: i 그대로 → 실패한 step부터 다시 (D4 default)
  }

  return { atc_title: atc.title, steps: results, overall: 'success', inputs_used: inputs, outputs: getEmittedOutputs() };
}
