/**
 * Environment configuration loader + runId builder.
 *
 * Fulfills R-A1.3 (config.ts portion):
 *   given: 새 ATC를 작성하는 다음 세션의 Claude
 *   when:  `lib/config.ts`를 import해서 사용
 *   then:  env 로딩 + 검증 유틸이 importable, inline 코드 아님
 *
 * Notes:
 *   - dotenv는 import side effect로 .env를 process.env에 로드한다.
 *   - 검증은 zod safeParse로 수행, 실패 시 친절한 에러 메시지를 throw.
 *   - WINDLY_BASE_URL 등은 모두 optional — UI ATC가 아닌 경우도 있고
 *     (R-A2 환경) 사용 시점에 부재가 드러나는 것이 더 안전하기 때문.
 *   - runId는 D6 패턴 `result_YYYY-MM-DD_HH-MM-SS` (기존 자산과 동일).
 */

import 'dotenv/config';
import { z } from 'zod';

/** zod schema for the supported environment variables (KG2 / D7 / .env.example). */
const envSchema = z.object({
  WINDLY_BASE_URL: z.string().url().optional(),
  WINDLY_EXTENSION_PATH: z.string().optional(),
  WINDLY_LOGIN_EMAIL: z.string().email().optional(),
  WINDLY_LOGIN_PASSWORD: z.string().optional(),
});

/** Inferred env shape — all fields optional at runtime. */
export type AppEnv = z.infer<typeof envSchema>;

/**
 * Read process.env through the zod schema.
 * Throws Error with a human-readable message listing every failing field.
 */
export function loadEnv(): AppEnv {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    throw new Error(`환경변수 검증 실패: ${detail}`);
  }
  return result.data;
}

/**
 * Build a fresh runId in the canonical format `result_YYYY-MM-DD_HH-MM-SS`.
 * One call per ATC execution; collisions are avoided by second-resolution.
 */
export function buildRunId(now: Date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const mi = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `result_${yyyy}-${mm}-${dd}_${hh}-${mi}-${ss}`;
}
