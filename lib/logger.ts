/**
 * Structured console logger.
 *
 * Fulfills R-A1.3 (logger.ts portion):
 *   given: 새 ATC를 작성하는 다음 세션의 Claude
 *   when:  `lib/logger.ts`를 import해서 사용
 *   then:  레벨별 구조화 로그 함수가 importable, inline 코드 아님
 *
 * Notes:
 *   - 콘솔만 사용 (파일 싱크는 reporter가 담당, runner는 stdout으로 진행 상황 보고).
 *   - meta는 JSON 직렬화 가능한 값만 권장. 복잡한 객체는 호출자가 정리해서 넘긴다.
 *   - error 레벨만 stderr, 나머지는 stdout — Playwright reporter가 stream을 분리 캡처.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Low-level emitter. Most callers should use the convenience methods on `logger`. */
export function log(level: LogLevel, msg: string, meta?: Record<string, unknown>): void {
  const ts = new Date().toISOString();
  const payload = meta !== undefined ? ` ${JSON.stringify(meta)}` : '';
  const line = `[${ts}] [${level.toUpperCase()}] ${msg}${payload}`;
  if (level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
}

/** Convenience facade with one method per log level. */
export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>): void => log('debug', msg, meta),
  info: (msg: string, meta?: Record<string, unknown>): void => log('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>): void => log('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>): void => log('error', msg, meta),
};
