/**
 * 단건 업로드 + 등록 검증 handler 모듈 — test() 호출 없음 (e2e import 안전).
 */

import type { Page } from '@playwright/test';
import type {
  StepHandler,
  StepHandlers,
} from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import {
  goToCollectedProducts,
  goToRegisteredProducts,
  openFirstSearchResult,
  searchByProductCode,
} from '../../lib/windly-actions';

const openCollectedListStep: StepHandler = async (page, _inputs) => {
  await goToCollectedProducts(page);
  return { ok: true as const };
};

const searchProductStep: StepHandler = async (page, inputs) => {
  const id =
    typeof inputs['source_product_id'] === 'string'
      ? (inputs['source_product_id'] as string)
      : '';
  if (id.length === 0) {
    return {
      ok: false as const,
      error_key: 'missing_input' as ErrorKey,
      message: 'inputs.source_product_id 누락',
    };
  }
  const count = await searchByProductCode(page, id);
  if (count === 0) {
    return {
      ok: false as const,
      error_key: 'product_not_found' as ErrorKey,
      message: `상품 코드 ${id} 검색 결과 0개`,
    };
  }
  return { ok: true as const };
};

const openDetailStep: StepHandler = async (page, _inputs) => {
  try {
    await openFirstSearchResult(page);
    return { ok: true as const };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false as const,
      error_key: 'detail_open_failed' as ErrorKey,
      message: `상세 진입 실패: ${msg}`,
    };
  }
};

const triggerUploadStep: StepHandler = async (page, _inputs) => {
  const CHECKMARK_PATH_SIG = 'M9 16.17L4.83 12L3.41 13.41L9 19L21 7';
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
      ok: false as const,
      error_key: 'upload_btn_not_found' as ErrorKey,
      message: '체크마크 오른쪽 아이콘 없음',
    };
  }

  const uploadBtn = page.locator('button').nth(targetIdx);
  await uploadBtn.waitFor({ state: 'visible', timeout: 5_000 });
  await uploadBtn.scrollIntoViewIfNeeded();
  await uploadBtn.click({ timeout: 5_000 });

  await page.waitForTimeout(1_500);
  const confirmBtn = page.getByRole('button', { name: /^업로드\s*하기$/ }).first();
  try {
    await confirmBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await confirmBtn.click({ timeout: 8_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'upload_confirm_btn_not_found' as ErrorKey,
      message: '"업로드 하기" 버튼 미발견',
    };
  }

  await page.waitForTimeout(1_500);
  return { ok: true as const };
};

const waitUploadCompleteStep: StepHandler = async (page, _inputs) => {
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
  while (Date.now() - start < 240_000) {
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
      ok: false as const,
      error_key: 'upload_timeout' as ErrorKey,
      message: '240초 안에 성공/실패 텍스트 검출 실패',
    };
  }

  const closeBtn = page
    .getByRole('button', { name: /수집상품\s*메뉴로\s*가기|^확인$|^닫기$/ })
    .first();
  if ((await closeBtn.count()) > 0 && (await closeBtn.isVisible().catch(() => false))) {
    await closeBtn.click({ timeout: 5_000 }).catch(() => undefined);
  }
  await page.waitForTimeout(800);

  if (last.success === 0) {
    return {
      ok: false as const,
      error_key: 'upload_failed' as ErrorKey,
      message: `모든 마켓 실패 (성공 0 / 실패 ${last.fail})`,
    };
  }
  return { ok: true as const };
};

const openRegisteredListStep: StepHandler = async (page, _inputs) => {
  await goToRegisteredProducts(page);
  return { ok: true as const };
};

const verifyInRegisteredStep: StepHandler = async (page, inputs) => {
  const id =
    typeof inputs['source_product_id'] === 'string'
      ? (inputs['source_product_id'] as string)
      : '';
  if (id.length === 0) {
    return {
      ok: false as const,
      error_key: 'missing_input' as ErrorKey,
      message: 'inputs.source_product_id 누락',
    };
  }
  await page.waitForTimeout(1_500);

  const searchAttempt = async (): Promise<boolean> => {
    return page.evaluate((pid: string) => {
      if (document.body.innerText.includes(pid)) return true;
      const all = document.querySelectorAll('*');
      for (const el of Array.from(all)) {
        const attrs = el.attributes;
        for (let i = 0; i < attrs.length; i++) {
          if (attrs[i].value.includes(pid)) return true;
        }
      }
      return false;
    }, id);
  };

  const start = Date.now();
  while (Date.now() - start < 30_000) {
    if (await searchAttempt()) return { ok: true as const };
    await page.waitForTimeout(2_000);
  }

  const codeSearchBtn = page.getByRole('button', { name: /^상품\s*코드\s*검색$/ }).first();
  if ((await codeSearchBtn.count()) > 0) {
    await codeSearchBtn.click().catch(() => undefined);
    await page.waitForTimeout(800);
    const codeInput = page
      .getByPlaceholder(/상품\s*코드를?\s*입력/)
      .or(page.getByRole('textbox', { name: /상품\s*코드/ }))
      .first();
    if ((await codeInput.count()) > 0) {
      await codeInput.click();
      await codeInput.fill('');
      await codeInput.pressSequentially(id, { delay: 10 });
      const submit = page
        .getByRole('button', { name: /^검색하기$|^조회하기$|^확인$/ })
        .first();
      await submit.click({ timeout: 5_000 }).catch(() => undefined);
      await codeInput.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => undefined);
      await page.waitForTimeout(2_000);

      const cardCount = await page
        .locator('a[href*="/view2/registered-product/"]')
        .count();
      if (cardCount >= 1) return { ok: true as const };
    }
  }

  return {
    ok: false as const,
    error_key: 'not_in_registered_list' as ErrorKey,
    message: `등록상품 목록에서 source_product_id=${id} 매칭 실패`,
  };
};

export const singleProductUploadHandlers: StepHandlers = {
  open_collected_list: openCollectedListStep,
  search_product: searchProductStep,
  open_detail: openDetailStep,
  trigger_upload: triggerUploadStep,
  wait_upload_complete: waitUploadCompleteStep,
  open_registered_list: openRegisteredListStep,
  verify_in_registered: verifyInRegisteredStep,
};
