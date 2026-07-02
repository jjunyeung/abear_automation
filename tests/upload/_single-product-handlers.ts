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
import {
  closeUploadResultModal,
  detectUploadBlockReason,
  dismissBlockModal,
  waitUploadComplete,
} from '../../lib/upload-actions';

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
    // "업로드 하기" 가 안 보이면, 윈들리 차단 모달(사용량 초과/에러 미해결) 때문인지 먼저 확인.
    const blocked = await detectUploadBlockReason(page);
    if (blocked !== null) {
      await dismissBlockModal(page);
      return {
        ok: false as const,
        error_key: blocked.error_key as ErrorKey,
        message: blocked.message,
      };
    }
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
  // 감지 로직은 lib/upload-actions.ts::waitUploadComplete 단일 소스 (모달 성공/실패 행 +
  // 우하단 토스트 둘 다). 이전엔 여기 인라인 복사본이 토스트를 못 잡아 upload_timeout 오탐.
  const r = await waitUploadComplete(page, { timeoutMs: 240_000 });
  await closeUploadResultModal(page);
  if (r.ok) return { ok: true as const };
  return {
    ok: false as const,
    error_key: r.error_key as ErrorKey,
    message: r.message,
  };
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
