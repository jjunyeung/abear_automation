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
  // OAuth 실 로그인 검증용 (결정 10 — "로그인만 되는지 확인").
  // 미설정 시 OAuth 로그인 spec 은 skip / fail with clear message.
  // 네이버는 ID (john_dk) 도 email (foo@naver.com) 도 받음 → .email() 강제 X.
  NAVER_TEST_EMAIL: z.string().optional(),
  NAVER_TEST_PASSWORD: z.string().optional(),
  GOOGLE_TEST_EMAIL: z.string().optional(),
  GOOGLE_TEST_PASSWORD: z.string().optional(),
  KAKAO_TEST_EMAIL: z.string().optional(),
  // 직원 계정 — atcs/e2e/staff-account-permission.atc.yml (K2) 에서 사용.
  WINDLY_STAFF_EMAIL: z.string().email().optional(),
  WINDLY_STAFF_PASSWORD: z.string().optional(),
  // 자동 회귀용 URL pool — data/url-pool/{taobao,tmall,rakuten}.txt head 1개씩 consume.
  // 미설정 시 ATC_INPUT_PRODUCT_URL 사용 (기존 정책).
  ATC_URL_POOL_DIR: z.string().optional(),
  // Slack 알림 — 자동 회귀 결과 통합 알림.
  // (1) Bot 방식 (DM/임의 채널 가능): SLACK_BOT_TOKEN + SLACK_TARGET_CHANNEL
  // (2) Webhook 방식 (발급 시 채널 고정): SLACK_WEBHOOK_URL
  // 둘 다 있으면 (1) 우선, 실패 시 (2) fallback.
  SLACK_BOT_TOKEN: z.string().startsWith('xoxb-').optional(),
  SLACK_TARGET_CHANNEL: z.string().optional(),
  SLACK_WEBHOOK_URL: z.string().url().optional(),
  // ─── 마켓 연결 TC 용 자격증명 (atc-decisions-form.md → .env 로 이관) ───
  // 연결설정/오픈마켓 연결 TC (TC 994~1012) 가 폼에 입력. 미설정 시 해당 마켓 연결 TC skip.
  // 스마트스토어 (네이버 커머스 — 폼은 "API 연동용 판매자 ID" 1개만 요구)
  SMARTSTORE_SELLER_ID: z.string().optional(),
  // 쿠팡 (쿠팡 ID / 업체 코드 / Access Key / Secret Key)
  COUPANG_ID: z.string().optional(),
  COUPANG_CODE: z.string().optional(),
  COUPANG_ACCESS_KEY: z.string().optional(),
  COUPANG_SECRET_KEY: z.string().optional(),
  // 11번가 국내 (Open API Key)
  ELEVENSTREET_DOMESTIC_API_KEY: z.string().optional(),
  // ESM 2.0 (옥션 아이디 / 지마켓 아이디)
  ESM2_AUCTION_ID: z.string().optional(),
  ESM2_GMARKET_ID: z.string().optional(),
  // 톡스토어 (Open API 인증키 / 채널명 = store.kakao.com/<channel>)
  TALKSTORE_OPENAPI_KEY: z.string().optional(),
  TALKSTORE_CHANNEL_ID: z.string().optional(),
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
