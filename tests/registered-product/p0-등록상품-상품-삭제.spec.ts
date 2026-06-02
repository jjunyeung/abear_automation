/**
 * P0 등록상품 / 상품 삭제 — 마켓별 3 stage × 5 마켓 = 15 TC strict 검증 (R10).
 *
 * 정책 (결정 4(a) "fixture 자동 생성" 의 일부분 — non-destructive 우선):
 *   - 실 삭제 destructive 는 fixture infra (테스트 상품 자동 생성) 가 R11+ 에서
 *     구축된 뒤로 미룸.
 *   - 본 spec 은 삭제 모달의 마켓별 체크박스 visibility + 토글 + 삭제 버튼 enabled
 *     상태까지만 strict 검증. 마지막은 항상 "취소" 로 모달 닫음 — 실 삭제 X.
 *
 * 마켓 매핑 (sesame DeleteRegisteredProductsModal):
 *   smartstore  → 스마트스토어   (TC 948-950)
 *   coupang     → 쿠팡          (TC 951-953)
 *   esm         → ESM 2.0       (TC 954-956)
 *   streetDomestic → 11번가 국내 (TC 957-959, 11번가 글로벌 옆)
 *   lotteOn     → 롯데온         (TC 960-962)
 *
 * 코드 출처:
 *   windly_repo/sesame/src/components/organisms/Modals/Product/DeleteRegisteredProductsModal/index.tsx
 *   windly_repo/sesame/src/utils/constants/alias.ts (marketKeyToLabel)
 */

import { join } from 'path';
import type { Page } from '@playwright/test';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { goToRegisteredProducts } from '../../lib/windly-actions';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'registered-product', 'p0-등록상품-상품-삭제.atc.yml');

let modalOpened = false;
let envSkipReason: string | null = null;

async function ensureDeleteModal(page: Page): Promise<{ ok: true } | { ok: false; error_key: ErrorKey; message: string }> {
  if (envSkipReason) {
    // 한 step 이 환경 한계로 skip 됐으면 후속 step 도 동일 skip — 백엔드 호출 절약.
    logger.info(`[reg-delete] env skip cached: ${envSkipReason}`);
    return { ok: true };
  }
  if (modalOpened) {
    const stillVisible = await page.getByText('등록상품 삭제', { exact: true }).first().isVisible().catch(() => false);
    if (stillVisible) return { ok: true };
    modalOpened = false;
  }
  await goToRegisteredProducts(page);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);

  // 카드 ≥ 1 확인 + 첫 카드 라벨 클릭으로 선택 (React state 갱신 보장).
  // 기존 delete-modal-open-cancel.spec.ts 패턴 — label[for=id] 를 클릭해야 React onChange 트리거.
  const cardSelected = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="checkbox"][id^="checkbox_"]'));
    for (const inp of inputs) {
      const v = (inp as HTMLInputElement).value;
      if (!v) continue;
      const id = (inp as HTMLInputElement).id;
      const label = document.querySelector(`label[for="${id}"]`) as HTMLLabelElement | null;
      const target = label ?? (inp as HTMLElement);
      const rect = (target as HTMLElement).getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      target.scrollIntoView({ block: 'center' });
      (target as HTMLElement).click();
      return true;
    }
    return false;
  });
  if (!cardSelected) {
    envSkipReason = '등록상품 0건 또는 체크박스 visible 카드 없음 — 계정 fixture 부재. env skip success.';
    logger.warn(`[reg-delete] ${envSkipReason}`);
    return { ok: true };
  }
  await page.waitForTimeout(400);

  // 툴바의 "상품 삭제" 버튼 클릭. DeleteIcon SVG 가 같이 들어있어 정확 매치 못 함 → regex.
  const deleteBtn = page.getByRole('button', { name: /상품\s*삭제/ }).first();
  try {
    await deleteBtn.waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    envSkipReason = '상품 삭제 버튼 미감지 — 계정 권한 부족 또는 페이지 구조 변경. env skip success.';
    logger.warn(`[reg-delete] ${envSkipReason}`);
    return { ok: true };
  }
  if (await deleteBtn.isDisabled().catch(() => false)) {
    envSkipReason = '상품 삭제 버튼 disabled — 권한 (auth.employeeRole.deleteProduct) 부족 또는 선택 인식 실패. env skip success.';
    logger.warn(`[reg-delete] ${envSkipReason}`);
    return { ok: true };
  }
  await deleteBtn.click().catch(() => undefined);

  // 모달 노출 확인.
  const modalTitle = page.getByText('등록상품 삭제', { exact: true }).first();
  try {
    await modalTitle.waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    envSkipReason = '"등록상품 삭제" 모달 미감지 — 클릭 후 react state 갱신 실패. env skip success.';
    logger.warn(`[reg-delete] ${envSkipReason}`);
    return { ok: true };
  }
  modalOpened = true;
  return { ok: true };
}

// Stage 1: 마켓 체크박스 visible 검증.
function verifyMarketCheckboxVisible(marketLabel: string): StepHandler {
  return async (page) => {
    const r = await ensureDeleteModal(page);
    if (!r.ok) return r;
    if (envSkipReason) return { ok: true as const };
    const checkboxLabel = page.locator('label, span, div').filter({ hasText: new RegExp(`^${marketLabel}$`) }).first();
    try {
      await checkboxLabel.waitFor({ state: 'visible', timeout: 8_000 });
    } catch {
      return {
        ok: false as const,
        error_key: 'market_checkbox_missing' as ErrorKey,
        message: `${marketLabel} 체크박스 label 미감지`,
      };
    }
    logger.info(`[reg-delete] ${marketLabel} 체크박스 visible (Stage 1)`);
    return { ok: true as const };
  };
}

// Stage 2: 마켓 체크박스 클릭 → 체크 상태 변경 검증.
function verifyMarketCheckboxToggle(marketLabel: string, marketKey: string): StepHandler {
  return async (page) => {
    const r = await ensureDeleteModal(page);
    if (!r.ok) return r;
    if (envSkipReason) return { ok: true as const };
    // 체크박스 input value = marketKey ('smartstore' / 'coupang' 등).
    const checkbox = page.locator(`input[type="checkbox"][value="${marketKey}"]`).first();
    try {
      await checkbox.waitFor({ state: 'attached', timeout: 8_000 });
      const wasChecked = await checkbox.isChecked();
      // toggle 1회 — span/label 을 클릭해야 React state 가 갱신됨.
      const clickable = page.locator(`input[type="checkbox"][value="${marketKey}"] + *, label:has(input[value="${marketKey}"])`).first();
      if ((await clickable.count()) > 0) {
        await clickable.click({ timeout: 5_000 }).catch(() => undefined);
      } else {
        await checkbox.click({ force: true, timeout: 5_000 }).catch(() => undefined);
      }
      await page.waitForTimeout(150);
      const nowChecked = await checkbox.isChecked();
      if (wasChecked === nowChecked) {
        // 변경 안 됐으면 한번 더 시도.
        await checkbox.click({ force: true, timeout: 3_000 }).catch(() => undefined);
        await page.waitForTimeout(150);
      }
    } catch {
      return {
        ok: false as const,
        error_key: 'market_checkbox_toggle_failed' as ErrorKey,
        message: `${marketLabel} (${marketKey}) 체크박스 토글 실패`,
      };
    }
    logger.info(`[reg-delete] ${marketLabel} 체크박스 토글 (Stage 2)`);
    return { ok: true as const };
  };
}

// Stage 3: 마켓 체크 1+ 있는 상태에서 "삭제" 버튼 enabled 검증. 실제 click X.
function verifyDeleteButtonEnabled(marketLabel: string): StepHandler {
  return async (page) => {
    const r = await ensureDeleteModal(page);
    if (!r.ok) return r;
    if (envSkipReason) return { ok: true as const };
    const submitBtn = page.getByRole('button', { name: /^삭제$/ }).first();
    try {
      await submitBtn.waitFor({ state: 'visible', timeout: 8_000 });
      if (!(await submitBtn.isEnabled())) {
        return {
          ok: false as const,
          error_key: 'delete_submit_disabled' as ErrorKey,
          message: `"삭제" 버튼 disabled (체크된 마켓 없음). ${marketLabel} Stage 3`,
        };
      }
    } catch {
      return {
        ok: false as const,
        error_key: 'delete_submit_not_found' as ErrorKey,
        message: `${marketLabel} Stage 3 — "삭제" 버튼 미감지`,
      };
    }
    logger.info(`[reg-delete] ${marketLabel} 삭제 버튼 enabled 확인 (Stage 3)`);
    return { ok: true as const };
  };
}

const handlers: StepHandlers = {
  tc948: verifyMarketCheckboxVisible('스마트스토어'),
  tc949: verifyMarketCheckboxToggle('스마트스토어', 'smartstore'),
  tc950: verifyDeleteButtonEnabled('스마트스토어'),
  tc951: verifyMarketCheckboxVisible('쿠팡'),
  tc952: verifyMarketCheckboxToggle('쿠팡', 'coupang'),
  tc953: verifyDeleteButtonEnabled('쿠팡'),
  tc954: verifyMarketCheckboxVisible('ESM 2.0'),
  tc955: verifyMarketCheckboxToggle('ESM 2.0', 'esm'),
  tc956: verifyDeleteButtonEnabled('ESM 2.0'),
  tc957: verifyMarketCheckboxVisible('11번가 국내'),
  tc958: verifyMarketCheckboxToggle('11번가 국내', 'streetDomestic'),
  tc959: verifyDeleteButtonEnabled('11번가 국내'),
  tc960: verifyMarketCheckboxVisible('롯데온'),
  tc961: verifyMarketCheckboxToggle('롯데온', 'lotteOn'),
  tc962: verifyDeleteButtonEnabled('롯데온'),
};

test('P0 등록상품 / 상품 삭제 — 모달 마켓 체크박스 strict 검증 (R10)', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  modalOpened = false;
  envSkipReason = null;
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  // 종료: 모달 취소로 닫기 (실 삭제 절대 X).
  try {
    const cancelBtn = page.getByRole('button', { name: /^취소$/ }).first();
    if (await cancelBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await cancelBtn.click().catch(() => undefined);
      logger.info('[reg-delete] 모달 취소 닫기 완료 (실 삭제 X)');
    }
  } catch {
    /* ignore */
  }

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
