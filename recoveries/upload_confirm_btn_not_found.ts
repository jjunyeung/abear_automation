/**
 * 복구: 업로드 트리거 후 뜨는 확인 모달(들)을 "업로드 하기"(+ 진행/확인 계열) 로 전부 통과.
 *
 * 트리거 키: upload_confirm_btn_not_found
 *   - 업로드 아이콘 클릭 후 "상품 업로드 유의사항 확인" 등의 모달이 떴는데, 본 step 이
 *     짧은 대기 안에 "업로드 하기" 버튼을 못 찾아 실패한 경우 (batch #12 원인).
 *   - 모달이 늦게 뜨거나 2단(유의사항 → 최종 확인) 으로 이어지는 케이스를 더 긴 대기 +
 *     cascade 클릭으로 넘긴다.
 *
 * 재개(D4): 이 복구가 걸리는 step 에는 ATC 에서 on_recovery.restart_from: wait_upload_complete
 *   를 걸어 둔다 — 모달은 이미 넘겼으니 완료 대기로 바로 진행 (실패한 step 재실행 시 사라진
 *   모달을 다시 찾다 재실패하는 것을 방지).
 *
 * 실패 정책(D12): 넉넉한 대기 후에도 진행 버튼을 한 번도 못 누르면 throw → 1회 실패로 기록.
 */

import type { Page } from '@playwright/test';
import type { RecoveryContext } from '../lib/errors';
import { logger } from '../lib/logger';

export async function recover(page: Page, _ctx: RecoveryContext): Promise<void> {
  // "업로드 하기" 우선, 이어지는 최종확인/진행 계열 버튼도 커버.
  const buttonCandidates: RegExp[] = [
    /^업로드\s*하기$/,
    /^수정\s*업로드$/,
    /^재업로드$/,
    /^다시\s*업로드$/,
    /^업로드\s*진행$/,
    /^진행$/,
    /^계속$/,
    /^확인$/,
  ];

  const MAX_CYCLES = 6;
  const PER_CYCLE_WAIT_MS = 5_000; // 모달이 늦게 뜨는 케이스 대비 (기존 step 대기보다 넉넉히).
  let totalClicks = 0;

  for (let cycle = 0; cycle < MAX_CYCLES; cycle += 1) {
    const deadline = Date.now() + PER_CYCLE_WAIT_MS;
    let clickedThisCycle = false;

    // 이 사이클 안에서 (늦게라도) 진행 버튼이 뜨면 첫 후보를 클릭.
    while (Date.now() < deadline && !clickedThisCycle) {
      for (const re of buttonCandidates) {
        const btn = page.getByRole('button', { name: re }).first();
        if ((await btn.count()) === 0) continue;
        if (!(await btn.isVisible().catch(() => false))) continue;
        logger.info(
          `[recover upload_confirm_btn_not_found] cycle ${cycle + 1} 진행 버튼 클릭: ${re}`,
        );
        await btn.click({ timeout: 8_000 }).catch(() => undefined);
        clickedThisCycle = true;
        totalClicks += 1;
        break;
      }
      if (!clickedThisCycle) await page.waitForTimeout(500);
    }

    if (!clickedThisCycle) break; // 더 이상 넘길 모달 없음.
    await page.waitForTimeout(1_500); // 다음 모달 렌더 여유.
  }

  if (totalClicks === 0) {
    throw new Error(
      '업로드 확인 모달에서 "업로드 하기" 계열 버튼을 찾지 못함 (모달 미노출/버튼 라벨 상이)',
    );
  }
  logger.info(
    `[recover upload_confirm_btn_not_found] 총 ${totalClicks}회 클릭 — 모달 통과 완료`,
  );
}
