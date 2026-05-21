/**
 * 수집상품 N개 선택 후 "기본 설정값 적용" 일괄 실행 — Playwright spec
 *
 * 대응 ATC: atcs/collect/bulk-apply-base-setting.atc.yml
 *
 * Selector 출처 (sesame):
 *   - InterestedProduct.tsx — More(...) 버튼 → AnchoredModalItem "기본 설정값 적용"
 *   - BulkSyncBaseSettingModal — title "기본 설정값 적용", primary button "적용"
 *   - ProductCard.tsx — 각 카드 안 ProductCardSelector > CheckBox (value=productId)
 *   - CheckBox.tsx — `<input type="checkbox" value={id}>` + label wrapper
 *
 * 카드 entry = `<ProductCardLink to={productId}>` → DOM 에선 `<a href="/view2/interested-product/{id}">`
 * 카드 내부 체크박스: 시각적으로 가려진 styled input — `check({ force: true })` 사용.
 *
 * 검증 = success toast `"${N}개 상품이 일괄 업데이트 되었습니다."` 매치.
 * 실패 toast = `"일부 상품이 업데이트되지 않았습니다."` 도 같이 모니터링.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import {
  runATC,
  type StepHandler,
  type StepHandlers,
} from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { goToCollectedProducts } from '../../lib/windly-actions';
import { logger } from '../../lib/logger';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'collected-product',
  'bulk-apply-base-setting.atc.yml',
);

// login / enter_workspace 는 setup project 가 처리.

const openCollectedListStep: StepHandler = async (page, _inputs) => {
  await goToCollectedProducts(page);
  return { ok: true as const };
};

function parseCount(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') return parseInt(raw, 10);
  return NaN;
}

const selectNProductsStep: StepHandler = async (page, inputs) => {
  const n = parseCount(inputs['product_count']);
  if (!Number.isInteger(n) || n < 1) {
    return {
      ok: false as const,
      error_key: 'missing_input' as ErrorKey,
      message: `inputs.product_count 가 양의 정수가 아님: ${String(inputs['product_count'])}`,
    };
  }

  const cards = page.locator('a[href*="/view2/interested-product/"]');
  // 카드 mount 대기.
  await cards.first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => undefined);
  const total = await cards.count();
  if (total < n) {
    return {
      ok: false as const,
      error_key: 'not_enough_products' as ErrorKey,
      message: `수집상품 카드 ${total}개 < 필요 ${n}개`,
    };
  }

  for (let i = 0; i < n; i++) {
    const card = cards.nth(i);
    // sesame CheckBox: <input type=checkbox> + <label htmlFor="checkbox_..."> + 시각적 BaseCheckBox.
    // <input> 은 styled hidden (visible 아님 → scrollIntoView 무한 retry) — label 을 클릭해야 함
    // (메모리: "윈들리 체크박스는 label 을 잡아야 클릭됨").
    const checkbox = card.locator('input[type="checkbox"]').first();
    if (await checkbox.isChecked().catch(() => false)) continue; // 이미 체크면 skip
    const label = card.locator('label[for^="checkbox_"]').first();
    await label.scrollIntoViewIfNeeded();
    await label.click();
  }
  // 선택 후 React state 반영 대기.
  await page.waitForTimeout(500);

  // 검증 — 체크된 input 수가 N 이상 (전체 선택 헤더 등 다른 체크박스 가능성 고려).
  const checkedCards = await cards.locator('input[type="checkbox"]:checked').count();
  if (checkedCards < n) {
    return {
      ok: false as const,
      error_key: 'card_checkbox_not_checked' as ErrorKey,
      message: `체크 시도 ${n} / 실제 체크된 카드 ${checkedCards}`,
    };
  }
  logger.info(`[bulk-apply] ${n}개 카드 체크 완료`);
  return { ok: true as const };
};

const openApplyBaseSettingModalStep: StepHandler = async (page, _inputs) => {
  // sesame InterestedProduct 의 일괄 작업 More(...) 버튼:
  //   <AnchoredModal isClickActionDisabled={isEmptySelection}>
  //     <Button disabled={isEmptySelection} onlyIcon><MoreIcon/></Button>  <-- 이거 클릭
  //     <AnchoredModalContainer> ... AnchoredModalItem "기본 설정값 적용" </AnchoredModalContainer>
  //   </AnchoredModal>
  // MoreIcon (`/icons/more.svg`) = 3 dots horizontal, path d 가 "M5 10C3.9 10..." 로 시작 (시그니처).
  // 카드 영역엔 More icon 없음 → toolbar 의 단일 매치.

  const targetItem = page.getByText('기본 설정값 적용', { exact: true });

  // 1) 이미 펼쳐져 있으면 바로 클릭.
  if (!(await targetItem.first().isVisible().catch(() => false))) {
    // 2) MoreIcon svg path 시그니처로 trigger 정확 매치.
    const moreBtn = page
      .locator('button:not([disabled])')
      .filter({ has: page.locator('svg path[d^="M5 10C3.9 10"]') })
      .first();
    try {
      await moreBtn.waitFor({ state: 'visible', timeout: 5_000 });
    } catch {
      return {
        ok: false as const,
        error_key: 'more_button_not_found' as ErrorKey,
        message: 'enabled More(...) 버튼 (MoreIcon svg) 미발견 — 카드 선택 상태 확인 필요',
      };
    }
    await moreBtn.click();
    try {
      await targetItem.first().waitFor({ state: 'visible', timeout: 3_000 });
    } catch {
      return {
        ok: false as const,
        error_key: 'bulk_menu_not_openable' as ErrorKey,
        message: 'More 버튼 클릭 후 "기본 설정값 적용" 항목 노출 안 됨',
      };
    }
  }
  await targetItem.first().click();

  // 모달 노출 대기 — title "기본 설정값 적용" + body 텍스트 + "적용" 버튼.
  const modalApplyBtn = page.getByRole('button', { name: /^적용$/ }).first();
  try {
    await modalApplyBtn.waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'apply_modal_not_shown' as ErrorKey,
      message: '"기본 설정값 적용" 클릭 후 확인 모달 노출 안 됨',
    };
  }
  return { ok: true as const };
};

const confirmAndWaitCompleteStep: StepHandler = async (page, inputs) => {
  const n = parseCount(inputs['product_count']);
  const COMPLETE_TIMEOUT_MS = 60_000;

  // 모달의 "적용" 버튼 클릭.
  const applyBtn = page.getByRole('button', { name: /^적용$/ }).first();
  await applyBtn.click({ timeout: 5_000 });

  // success toast: "${N}개 상품이 일괄 업데이트 되었습니다."
  // partial fail toast: "일부 상품이 업데이트되지 않았습니다."
  const successToast = page.getByText(
    new RegExp(`^${n}개 상품이 일괄 업데이트 되었습니다\\.?$`),
  );
  const partialFailToast = page.getByText(/^일부 상품이 업데이트되지 않았습니다\.?$/);

  const start = Date.now();
  while (Date.now() - start < COMPLETE_TIMEOUT_MS) {
    if (await successToast.first().isVisible().catch(() => false)) {
      logger.info(`[bulk-apply] success toast 검출 — ${n}개 상품 일괄 업데이트 완료`);
      return { ok: true as const };
    }
    if (await partialFailToast.first().isVisible().catch(() => false)) {
      return {
        ok: false as const,
        error_key: 'bulk_apply_partial_fail' as ErrorKey,
        message: '"일부 상품이 업데이트되지 않았습니다." toast 노출 — 일부 상품 업데이트 실패',
      };
    }
    await page.waitForTimeout(500);
  }
  return {
    ok: false as const,
    error_key: 'bulk_apply_timeout' as ErrorKey,
    message: `${COMPLETE_TIMEOUT_MS}ms 안에 success/fail toast 모두 미검출`,
  };
};

const handlers: StepHandlers = {
  open_collected_list: openCollectedListStep,
  select_n_products: selectNProductsStep,
  open_apply_base_setting_modal: openApplyBaseSettingModalStep,
  confirm_and_wait_complete: confirmAndWaitCompleteStep,
};

test('수집상품 N개 선택 후 기본 설정값 적용 일괄 실행', async ({ page }) => {
  test.setTimeout(5 * 60_000);

  const atc = loadATC(ATC_PATH);
  // example/hardcoded default 제거 — placeholder 가 silent 하게 실제 값으로 둔갑하는 함정 방지.
  // 빈 값은 핸들러 책임으로 위임.
  const inputs: Record<string, unknown> = {
    product_count: process.env['ATC_INPUT_PRODUCT_COUNT'] ?? '',
  };

  const result = await runATC({ atc, page, inputs, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
