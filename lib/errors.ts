/**
 * ATC error key union, recovery context shape, and error classes.
 *
 * Fulfills R-A4.2:
 *   given: lib/errors.ts에 `type ErrorKey = "missing_image" | ...` 정의
 *   when:  새 복구 추가
 *   then:  recoveries/<key>.ts의 `recover(page: Page, ctx: RecoveryContext): Promise<void>`
 *          시그니처가 강제됨, ctx는
 *          { error_key: ErrorKey, page_url: string, last_step_id: string, screenshot_path: string }
 *          (KG2 MVP)
 *
 * Design notes:
 *   - The vertical slice exemplar (R-A1.2) only requires `missing_image`. We
 *     model `KnownErrorKey` as a closed union of vetted keys so autocompletion
 *     and exhaustive switches work, while `ErrorKey` widens it with a branded
 *     string fallback so future recoveries can register new keys without
 *     blocking on a type edit. Adding a new well-known key is still a single
 *     edit to `KnownErrorKey`.
 *   - We deliberately do NOT import `Page` from `playwright` here. The
 *     `recover()` signature is documented in the JSDoc of `RecoveryContext`
 *     and re-asserted by each `recoveries/<id>.ts` file, so this module stays
 *     decoupled from the playwright runtime.
 */

/** Closed set of recovery ids known to the framework today. Extend as new recoveries land. */
export type KnownErrorKey =
  | 'missing_image'
  | 'name_too_long'
  | 'tab_price_error'
  | 'tab_upload_settings_error'
  | 'tab_basic_error'
  | 'tab_image_error'
  | 'tab_option_error'
  | 'tab_attribute_error'
  | 'tab_detail_error'
  | 'esm_recommend_option_unmatched'
  | 'upload_confirm_btn_not_found'
  | 'collect_failed';

/**
 * Effective error key type. Accepts any known key and any future string while
 * keeping autocomplete on the known ones via the brand.
 */
export type ErrorKey = KnownErrorKey | (string & { __brand?: 'ErrorKey' });

/**
 * Context object passed to a recovery function (`recover(page, ctx)`).
 * Mirrors KG2 MVP fields exactly.
 */
export interface RecoveryContext {
  error_key: ErrorKey;
  page_url: string;
  last_step_id: string;
  screenshot_path: string;
}

/** Base ATC error class. All framework-thrown errors extend this. */
export class ATCError extends Error {
  constructor(
    public readonly error_key: ErrorKey,
    message: string,
    public readonly cause_step_id?: string,
  ) {
    super(message);
    this.name = 'ATCError';
  }
}

/**
 * Thrown when an error has no matching `on_error` entry or the matched
 * `recoveries/<key>.ts` file does not exist (D11 / R-A1.6).
 */
export class UnhandledATCError extends ATCError {
  constructor(error_key: ErrorKey, message: string, cause_step_id?: string) {
    super(error_key, message, cause_step_id);
    this.name = 'UnhandledATCError';
  }
}

/**
 * Thrown when a `recover()` call itself throws (D12 / R-A1.7). The runner
 * MUST NOT retry recovery; this is a terminal failure for the ATC step.
 */
export class RecoveryFailedError extends ATCError {
  constructor(
    public readonly recovery_id: string,
    original: Error,
    cause_step_id?: string,
  ) {
    super(
      `recovery:${recovery_id}`,
      `recovery '${recovery_id}' attempt failed: ${original.message}`,
      cause_step_id,
    );
    this.name = 'RecoveryFailedError';
  }
}
