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

/** Aggregate result returned by `runATC()`. */
export interface RunResult {
  atc_title: string;
  steps: StepResult[];
  overall: 'success' | 'failed';
  inputs_used: Record<string, unknown>;
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
      return { atc_title: atc.title, steps: results, overall: 'failed', inputs_used: inputs };
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
      return { atc_title: atc.title, steps: results, overall: 'failed', inputs_used: inputs };
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

    // ── 에러 발생 — D5 매칭 ────────────────────────────────────────────────
    const ekey = outcome.error_key;
    const candidates = step.on_error ?? [];
    const matched = candidates.find((c) => c === String(ekey));

    // D11: 매칭 없음 OR 매칭은 있지만 registry에 미존재 → unhandled
    if (matched === undefined || !registry.has(matched)) {
      const message = `unhandled error: ${String(ekey)}`;
      results.push({
        step_id: step.id,
        status: 'unhandled',
        duration_ms: Date.now() - start,
        error_key: ekey,
        message,
      });
      logger.error(`✗ unhandled error '${String(ekey)}' at step '${step.id}'`);
      return { atc_title: atc.title, steps: results, overall: 'failed', inputs_used: inputs };
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
      return { atc_title: atc.title, steps: results, overall: 'failed', inputs_used: inputs };
    }

    const ctx: RecoveryContext = {
      error_key: ekey,
      page_url: page.url(),
      last_step_id: step.id,
      screenshot_path: '',
    };

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
      return { atc_title: atc.title, steps: results, overall: 'failed', inputs_used: inputs };
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

  return { atc_title: atc.title, steps: results, overall: 'success', inputs_used: inputs };
}
