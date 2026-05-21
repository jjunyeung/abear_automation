/**
 * 등록상품 맨 위 상품 삭제 ATC — Playwright spec
 *
 * 대응 ATC: atcs/upload/delete-top-product.atc.yml
 *
 * 핵심 step 노트:
 *   - capture_top_product_id : 첫 카드 href `/view2/registered-product/<id>` 에서 id 추출.
 *     deletion 후 verify 단계에서 동일 id 가 사라졌는지 확인하는 데 쓴다.
 *     입력 dict 에 `_captured_id` 키로 저장하여 step 간 공유 (handler 가 inputs 를 mutate).
 *   - select_top_checkbox : 첫 row 의 첫 번째 셀 (체크박스) 클릭. 윈들리는 custom 체크박스 ("–"
 *     기호) 라 좌표 click 이 가장 안전. click 후 toolbar 의 "상품 삭제" 버튼이 enabled 되는지
 *     확인 (disabled 이면 fail).
 *   - click_delete_button : 상단 toolbar 의 disabled 가 풀린 "상품 삭제" 버튼 클릭.
 *   - select_all_stores : 모달 안 "전체 선택" 버튼 클릭.
 *   - confirm_delete : 모달의 "삭제" / "삭제하기" / "확인" 버튼 클릭.
 *   - wait_deletion : 토스트 또는 모달 닫힘 검출.
 *   - verify_not_in_list : 캡처한 id 로 search → count 0 검증.
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
import {
  goToRegisteredProducts,
  searchByProductCode,
} from '../../lib/windly-actions';
import { logger } from '../../lib/logger';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'registered-product',
  'delete-top-product.atc.yml',
);

// ─────────────────────────────────────────────────────────────────────────────
// Step handlers
// (login / enter_workspace 는 setup project = tests/auth.setup.ts 가 처리)
// ─────────────────────────────────────────────────────────────────────────────

const openRegisteredListStep: StepHandler = async (page, _inputs) => {
  await goToRegisteredProducts(page);
  const firstCard = page
    .locator('a[href*="/view2/registered-product/"]')
    .first();
  try {
    await firstCard.waitFor({ state: 'visible', timeout: 30_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'no_registered_products' as ErrorKey,
      message: '등록상품 카드가 없음 — 삭제 대상 없음',
    };
  }
  await firstCard.scrollIntoViewIfNeeded().catch(() => undefined);
  await page.waitForTimeout(500);
  return { ok: true as const };
};

const captureTopProductIdStep: StepHandler = async (page, inputs) => {
  const href = await page
    .locator('a[href*="/view2/registered-product/"]')
    .first()
    .getAttribute('href')
    .catch(() => null);
  if (href === null) {
    return {
      ok: false as const,
      error_key: 'top_card_not_found' as ErrorKey,
      message: '첫 카드 href 추출 실패',
    };
  }
  const m = href.match(/\/view2\/registered-product\/(\d+)/);
  if (m === null) {
    return {
      ok: false as const,
      error_key: 'top_card_not_found' as ErrorKey,
      message: `href 에서 product id 추출 실패: ${href}`,
    };
  }
  const id = m[1];
  inputs['_captured_id'] = id;
  logger.info(`[capture_top_product_id] 맨 위 상품 코드 = ${id}`);
  return { ok: true as const };
};

/**
 * 첫 row 의 체크박스 클릭. 윈들리는 표준 input 이 아닌 custom checkbox 셀 (텍스트 "–").
 * 좌표 기반 click 으로 안전하게 처리.
 */
const selectTopCheckboxStep: StepHandler = async (page, _inputs) => {
  // 첫 카드 row 의 첫 번째 셀 (cursor=pointer "–" 셀) 좌표 추출.
  const coords = await page.evaluate(() => {
    const card = document.querySelector(
      'a[href*="/view2/registered-product/"]',
    );
    if (card === null) return null;
    // ascend to row.
    const vw = window.innerWidth;
    let row: Element = card;
    let cur: Element | null = card.parentElement;
    while (cur !== null) {
      const r = cur.getBoundingClientRect();
      if (r.width >= vw * 0.6 && cur.children.length >= 6) {
        row = cur;
        break;
      }
      cur = cur.parentElement;
    }
    // 첫 번째 자식 (체크박스 셀).
    const cbCell = row.children[0] as HTMLElement | undefined;
    if (cbCell === undefined) return null;
    const r = cbCell.getBoundingClientRect();
    return { cx: Math.round(r.x + r.width / 2), cy: Math.round(r.y + r.height / 2) };
  });

  if (coords === null) {
    return {
      ok: false as const,
      error_key: 'top_card_not_found' as ErrorKey,
      message: '첫 row 의 체크박스 셀 좌표 추출 실패',
    };
  }
  await page.mouse.click(coords.cx, coords.cy);
  await page.waitForTimeout(800);

  // 상단 "상품 삭제" 버튼이 enabled 되었는지 확인.
  const deleteBtn = page
    .getByRole('button', { name: /^상품\s*삭제$/ })
    .first();
  const cnt = await deleteBtn.count();
  if (cnt === 0) {
    return {
      ok: false as const,
      error_key: 'delete_button_not_found' as ErrorKey,
      message: '상품 삭제 버튼이 페이지에 없음',
    };
  }
  const isDisabled = await deleteBtn
    .isDisabled()
    .catch(() => true);
  if (isDisabled) {
    return {
      ok: false as const,
      error_key: 'delete_button_disabled' as ErrorKey,
      message:
        '체크박스 클릭 후에도 상품 삭제 버튼이 disabled — 체크박스 click 미적용',
    };
  }
  logger.info('[select_top_checkbox] 상품 삭제 버튼 enabled 확인');
  return { ok: true as const };
};

const clickDeleteButtonStep: StepHandler = async (page, _inputs) => {
  const deleteBtn = page
    .getByRole('button', { name: /^상품\s*삭제$/ })
    .first();
  await deleteBtn.scrollIntoViewIfNeeded().catch(() => undefined);
  await deleteBtn.click({ timeout: 5_000 });
  await page.waitForTimeout(1_500);
  return { ok: true as const };
};

const selectAllStoresStep: StepHandler = async (page, _inputs) => {
  // 윈들리 체크박스 구조: <label for="..."><input ...><span class="checkbox-label">전체 선택</span></label>
  // span 만 잡으면 부모 label 이 pointer-event 를 가로챔. label 자체를 클릭해야 안전.
  const label = page
    .locator('label:has(span.checkbox-label)')
    .filter({ hasText: /^전체\s*선택$/ })
    .first();

  if ((await label.count()) === 0) {
    // fallback: span 직접 force click.
    const span = page.getByText(/^전체\s*선택$/).first();
    if ((await span.count()) === 0) {
      return {
        ok: false as const,
        error_key: 'select_all_btn_not_found' as ErrorKey,
        message: '모달 안 전체 선택 라벨/스팬 미발견',
      };
    }
    await span.click({ force: true, timeout: 5_000 });
  } else {
    await label.scrollIntoViewIfNeeded().catch(() => undefined);
    await label.click({ timeout: 5_000 });
  }
  await page.waitForTimeout(800);
  logger.info('[select_all_stores] 전체 선택 클릭');
  return { ok: true as const };
};

const confirmDeleteStep: StepHandler = async (page, _inputs) => {
  // 모달 안 삭제 버튼 후보 — 우선순위 순.
  const buttonCandidates: RegExp[] = [
    /^삭제\s*하기$/,
    /^삭제$/,
    /^확인$/,
    /^예$/,
  ];

  let totalClicks = 0;
  for (let cycle = 0; cycle < 4; cycle++) {
    let clicked = false;
    for (const re of buttonCandidates) {
      const btn = page.getByRole('button', { name: re }).first();
      if ((await btn.count()) === 0) continue;
      if (!(await btn.isVisible().catch(() => false))) continue;
      logger.info(`[confirm_delete cycle ${cycle + 1}] 버튼 매칭 + 클릭: ${re}`);
      await btn.click({ timeout: 8_000 }).catch(() => undefined);
      clicked = true;
      totalClicks += 1;
      break;
    }
    if (!clicked) break;
    await page.waitForTimeout(1_500);
  }

  if (totalClicks === 0) {
    return {
      ok: false as const,
      error_key: 'delete_confirm_btn_not_found' as ErrorKey,
      message: '모달 삭제 버튼 후보 0회 클릭',
    };
  }
  logger.info(`[confirm_delete] 총 ${totalClicks}회 클릭`);
  return { ok: true as const };
};

const waitDeletionStep: StepHandler = async (page, _inputs) => {
  // 토스트 / 진행 모달 / 단순 모달 닫힘 중 하나로 완료 시그널 검출.
  const start = Date.now();
  let toastText = '';
  let toastSuccess = false;
  let toastFail = false;
  while (Date.now() - start < 120_000) {
    const snap = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('*'));
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let toastText = '';
      let toastSuccess = false;
      let toastFail = false;
      for (const el of all) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.x < vw * 0.4) continue;
        if (r.y < vh * 0.6) continue;
        const cs = window.getComputedStyle(el as HTMLElement);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        const txt = (el.textContent ?? '').trim();
        if (txt.length === 0 || txt.length > 80) continue;
        if (/삭제\s*(완료|성공)|삭제되었|삭제\s*되었습니다/.test(txt)) {
          toastSuccess = true;
          toastText = txt;
        } else if (/삭제\s*(실패|에러)/.test(txt)) {
          toastFail = true;
          toastText = txt;
        }
      }
      return { toastText, toastSuccess, toastFail };
    });
    toastText = snap.toastText;
    toastSuccess = snap.toastSuccess;
    toastFail = snap.toastFail;
    if (toastSuccess || toastFail) break;

    // 진행 모달 (성공/실패 텍스트) 도 검사.
    const progress = await page.evaluate(() => {
      let success = 0;
      let fail = 0;
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
      return { success, fail };
    });
    if (progress.success + progress.fail >= 1) {
      logger.info(
        `[wait_deletion] 진행 모달 검출: 성공 ${progress.success} / 실패 ${progress.fail}`,
      );
      break;
    }

    await page.waitForTimeout(2_000);
  }

  logger.info(
    `[wait_deletion] toast="${toastText}" success=${toastSuccess} fail=${toastFail}`,
  );

  if (toastFail && !toastSuccess) {
    return {
      ok: false as const,
      error_key: 'deletion_failed' as ErrorKey,
      message: `삭제 실패 토스트: ${toastText}`,
    };
  }

  // 모달이 떴다면 닫기 시도 (있는 경우).
  const close = page
    .getByRole('button', { name: /^확인$|^닫기$|등록상품\s*메뉴로\s*가기/ })
    .first();
  if ((await close.count()) > 0 && (await close.isVisible().catch(() => false))) {
    await close.click({ timeout: 3_000 }).catch(() => undefined);
  }
  await page.waitForTimeout(1_500);
  return { ok: true as const };
};

const verifyNotInListStep: StepHandler = async (page, inputs) => {
  const id =
    typeof inputs['_captured_id'] === 'string'
      ? (inputs['_captured_id'] as string)
      : '';
  if (id.length === 0) {
    return {
      ok: false as const,
      error_key: 'missing_input' as ErrorKey,
      message: '_captured_id 누락 — capture step 미실행?',
    };
  }

  // 등록상품 페이지로 강제 이동/리프레시 후 search.
  await goToRegisteredProducts(page);
  await page.waitForTimeout(1_500);

  const count = await searchByProductCode(page, id);
  logger.info(`[verify_not_in_list] 상품 코드 ${id} 검색 결과 ${count}개`);

  if (count !== 0) {
    return {
      ok: false as const,
      error_key: 'product_still_in_list' as ErrorKey,
      message: `삭제 후에도 상품 코드 ${id} 가 등록상품 목록에 ${count}개 검색됨`,
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_registered_list: openRegisteredListStep,
  capture_top_product_id: captureTopProductIdStep,
  select_top_checkbox: selectTopCheckboxStep,
  click_delete_button: clickDeleteButtonStep,
  select_all_stores: selectAllStoresStep,
  confirm_delete: confirmDeleteStep,
  wait_deletion: waitDeletionStep,
  verify_not_in_list: verifyNotInListStep,
};

// ─────────────────────────────────────────────────────────────────────────────
// Test
// ─────────────────────────────────────────────────────────────────────────────

test('등록상품 맨 위 상품 삭제 후 목록 검증', async ({ page }) => {
  test.setTimeout(10 * 60_000);

  const atc = loadATC(ATC_PATH);
  const inputs: Record<string, unknown> = {};

  const result = await runATC({ atc, page, inputs, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
