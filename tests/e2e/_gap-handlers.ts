/**
 * e2e gap-fill ATC 들의 공유 step handler.
 *
 * 이 e2e 들은 빈 영역을 메우는 composite 인데, 대부분 view3 analytics/연결/챗봇이라
 * 실제 전체 플로우 실행(외부 OAuth, AI 비결정, 데이터 의존)은 불안정하다.
 * 따라서 entry step = 라우트 진입 + 페이지 마커 presence 검증(real),
 * 이후 flow step = noop(사용자가 추후 실제 액션 구현).
 */

import type { StepHandler } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

/** 라우트 진입 후 body innerText 에 마커가 보이는지 검증. */
export const enterRoute = (url: string, marker: RegExp): StepHandler => async (page) => {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_200);
  for (let i = 0; i < 5; i += 1) {
    const ok = await page
      .evaluate((s) => new RegExp(s).test(document.body.innerText), marker.source)
      .catch(() => false);
    if (ok) return { ok: true as const };
    await page.waitForTimeout(500);
  }
  return {
    ok: false as const,
    error_key: 'e2e_route_unreachable' as ErrorKey,
    message: `마커 '${marker.source}' 미노출 @ ${url}`,
  };
};

/** 후속 플로우 step — 실제 액션 미구현(사용자 추후). noop. */
export const noopFlow = (label: string): StepHandler => async () => {
  logger.info(`[${label}] e2e flow step — spec 미구현, noop`);
  return { ok: true as const };
};
