/**
 * 윈들리 상품 상세 → 업로드 트리거 + 진행 모달 완료 대기 공용 헬퍼.
 *
 * 의존성: @playwright/test 만.
 * 추출 출처: tests/upload/single-product.spec.ts (triggerUploadStep, waitUploadCompleteStep).
 */

import type { Page } from '@playwright/test';

/** 에러체크 (✓) 아이콘의 SVG path 시작 시그니처 — 업로드 버튼 위치 추정용 anchor. */
const CHECKMARK_PATH_SIG = 'M9 16.17L4.83 12L3.41 13.41L9 19L21 7';

export type UploadTriggerResult =
  | { ok: true }
  | { ok: false; error_key: string; message: string };

/**
 * 상품 상세에서 업로드 트리거.
 *
 * 흐름:
 *   1) 상단 icon-only 버튼 중 체크마크(에러체크) 의 즉시 오른쪽 아이콘 = 업로드 버튼 (사용자 가이드).
 *   2) 클릭 → "상품 업로드 유의사항 확인" 모달 노출.
 *   3) 모달의 "업로드 하기" 버튼 클릭 → 업로드 진행 모달로 전환.
 */
export async function triggerUploadFromDetail(page: Page): Promise<UploadTriggerResult> {
  const targetIdx = await page.evaluate((sig: string) => {
    const btns = Array.from(document.querySelectorAll('button'));
    const meta = btns.map((btn, idx) => {
      const r = btn.getBoundingClientRect();
      const svg = btn.querySelector('svg');
      return {
        idx,
        text: (btn.textContent ?? '').trim(),
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        svgHtml: svg?.outerHTML ?? '',
      };
    });
    const topIcons = meta.filter(
      (b) => b.y < 80 && b.text.length === 0 && b.svgHtml.length > 0,
    );
    const checkmark = topIcons.find((b) => b.svgHtml.includes(sig));
    if (checkmark === undefined) return -1;
    const right = topIcons
      .filter((b) => b.x > checkmark.x)
      .sort((a, b) => a.x - b.x);
    if (right.length === 0) return -1;
    return right[0].idx;
  }, CHECKMARK_PATH_SIG);

  if (targetIdx < 0) {
    return {
      ok: false,
      error_key: 'upload_btn_not_found',
      message: '체크마크 오른쪽 아이콘 없음 — 상단 아이콘 배치 확인 필요',
    };
  }

  const uploadBtn = page.locator('button').nth(targetIdx);
  await uploadBtn.waitFor({ state: 'visible', timeout: 5_000 });
  await uploadBtn.scrollIntoViewIfNeeded();
  await uploadBtn.click({ timeout: 5_000 });
  await page.waitForTimeout(1_500);

  // "상품 업로드 유의사항 확인" 모달의 "업로드 하기" 버튼.
  const confirmBtn = page.getByRole('button', { name: /^업로드\s*하기$/ }).first();
  try {
    await confirmBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await confirmBtn.click({ timeout: 8_000 });
  } catch {
    return {
      ok: false,
      error_key: 'upload_confirm_btn_not_found',
      message: '"상품 업로드 유의사항 확인" 모달의 "업로드 하기" 버튼 미발견',
    };
  }
  await page.waitForTimeout(1_500);
  return { ok: true };
}

export interface UploadResult {
  success: number;
  fail: number;
}

export type WaitUploadResult =
  | { ok: true; result: UploadResult }
  | { ok: false; error_key: string; message: string; result: UploadResult };

/**
 * 업로드 진행 모달의 "성공" / "실패" leaf-text 가 안정화될 때까지 polling.
 *
 * - 안정화 = total (성공+실패) 변화 없고 spinning 0 인 cycle 3회 (≈ 9초).
 * - timeoutMs 안에 안정화 안 되면 fail.
 * - 안정화 후 success ≥ 1 이면 ok, 모두 fail 이면 fail.
 *
 * 모달 close 는 호출자가 알아서 (수집상품으로 가기 / 확인 / 닫기 등).
 */
export async function waitUploadComplete(
  page: Page,
  opts: { timeoutMs?: number } = {},
): Promise<WaitUploadResult> {
  const timeoutMs = opts.timeoutMs ?? 240_000;

  const measure = async (): Promise<{ success: number; fail: number; spinning: number }> => {
    return page.evaluate(() => {
      let success = 0;
      let fail = 0;
      let spinning = 0;
      const all = Array.from(document.querySelectorAll('*'));
      for (const el of all) {
        if (el.children.length > 0) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const cs = window.getComputedStyle(el as HTMLElement);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        const txt = (el.textContent ?? '').trim();
        if (txt === '성공') success += 1;
        else if (txt === '실패') fail += 1;
      }
      for (const el of all) {
        const cs = window.getComputedStyle(el as HTMLElement);
        const anim = cs.animationName ?? '';
        if (!/spin|rotate|loading/i.test(anim)) continue;
        const r = el.getBoundingClientRect();
        if (r.width >= 6 && r.width <= 64) spinning += 1;
      }
      return { success, fail, spinning };
    });
  };

  await page.waitForTimeout(5_000);
  const start = Date.now();
  let stableTicks = 0;
  let lastTotal = -1;
  let last = { success: 0, fail: 0, spinning: 0 };
  while (Date.now() - start < timeoutMs) {
    const cur = await measure();
    const total = cur.success + cur.fail;
    if (total === lastTotal && total > 0 && cur.spinning === 0) {
      stableTicks += 1;
    } else {
      stableTicks = 0;
    }
    lastTotal = total;
    last = cur;
    if (stableTicks >= 3) break;
    await page.waitForTimeout(3_000);
  }

  if (last.success === 0 && last.fail === 0) {
    return {
      ok: false,
      error_key: 'upload_timeout',
      message: `${Math.round(timeoutMs / 1000)}초 안에 모달의 성공/실패 텍스트 검출 실패`,
      result: { success: 0, fail: 0 },
    };
  }
  if (last.success === 0) {
    return {
      ok: false,
      error_key: 'upload_failed',
      message: `모든 마켓 실패 (성공 0 / 실패 ${last.fail})`,
      result: { success: 0, fail: last.fail },
    };
  }
  return { ok: true, result: { success: last.success, fail: last.fail } };
}

/** 업로드 결과 모달의 close 버튼 클릭 시도 (없으면 silently skip). */
export async function closeUploadResultModal(page: Page): Promise<void> {
  const closeBtn = page
    .getByRole('button', { name: /수집상품\s*메뉴로\s*가기|^확인$|^닫기$/ })
    .first();
  if (
    (await closeBtn.count()) > 0 &&
    (await closeBtn.isVisible().catch(() => false))
  ) {
    await closeBtn.click({ timeout: 5_000 }).catch(() => undefined);
  }
  await page.waitForTimeout(800);
}
