/**
 * 단건 상품 업로드 + 등록상품 검증 ATC — Playwright spec
 *
 * 대응 ATC: atcs/upload/single-product.atc.yml
 *
 * 업로드 트리거:
 *   - 상품 상세 우측 상단에 "업로드 마켓 N" 클릭 가능 generic 영역 존재 (최초 snapshot 확인).
 *   - 또는 별도 업로드 버튼/아이콘 (snapshot 으로 확인 후 selector 좁힘).
 *   - 클릭 후 확인 모달이 뜨면 진행 옵션 확정.
 *
 * 등록상품 검증:
 *   - 사이드바 "등록상품" 링크 (`/view2/registered-product`).
 *   - 페이지에 "상품 코드 검색" 같은 검색 기능이 있을 수 있음 (수집상품과 유사할 가능성).
 *   - 일단 productId 매칭 후, 안 되면 카드 텍스트 매칭 fallback.
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
  goToCollectedProducts,
  goToRegisteredProducts,
  openFirstSearchResult,
  searchByProductCode,
} from '../../lib/windly-actions';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'upload',
  'single-product.atc.yml',
);

// ─────────────────────────────────────────────────────────────────────────────
// Step handlers
// (login / enter_workspace 는 setup project = tests/auth.setup.ts 가 처리)
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// 업로드 트리거 — 상품 상세에서 업로드 시작 액션
// ─────────────────────────────────────────────────────────────────────────────

const triggerUploadStep: StepHandler = async (page, _inputs) => {
  // 사용자 정보: 업로드 버튼 = 상단 아이콘 중 ✓(에러체크) 의 즉시 오른쪽.
  // 전략: 모든 상단 icon-only button 의 위치(x) + svg path 수집 → 체크마크 idx 찾고
  //       x 가 큰 다음 icon 으로 jump.
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
        w: Math.round(r.width),
        h: Math.round(r.height),
        svgHtml: svg?.outerHTML ?? '',
      };
    });
    // 상단 영역 (y < 80) + icon-only (text 짧음 + svg 있음).
    const topIcons = meta.filter(
      (b) => b.y < 80 && b.text.length === 0 && b.svgHtml.length > 0,
    );
    const checkmark = topIcons.find((b) => b.svgHtml.includes(sig));
    if (checkmark === undefined) return -1;
    // 체크마크 오른쪽 가장 가까운 icon.
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
      message: '체크마크 오른쪽 아이콘 없음 — 상단 아이콘 배치 확인 필요',
    };
  }

  const uploadBtn = page.locator('button').nth(targetIdx);
  await uploadBtn.waitFor({ state: 'visible', timeout: 5_000 });
  await uploadBtn.scrollIntoViewIfNeeded();
  await uploadBtn.click({ timeout: 5_000 });

  // 클릭 후 "상품 업로드 유의사항 확인" 모달 노출. 그 안의 "업로드 하기" 버튼을 눌러야
  // 실제 업로드가 시작되고 업로드 진행 모달이 표시됨 (사용자 가이드).
  await page.waitForTimeout(1_500);
  const confirmBtn = page
    .getByRole('button', { name: /^업로드\s*하기$/ })
    .first();
  try {
    await confirmBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await confirmBtn.click({ timeout: 8_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'upload_confirm_btn_not_found' as ErrorKey,
      message: '"상품 업로드 유의사항 확인" 모달의 "업로드 하기" 버튼 미발견',
    };
  }

  // 업로드 진행 모달이 뜨는 시간.
  await page.waitForTimeout(1_500);
  return { ok: true as const };
};

// ─────────────────────────────────────────────────────────────────────────────
// 업로드 완료 대기
// ─────────────────────────────────────────────────────────────────────────────

const waitUploadCompleteStep: StepHandler = async (page, _inputs) => {
  // 업로드 모달은 마켓별 행 + spinner. 진행 중에는 spinner 가 돌고, 완료 시 spinner 가
  // "성공" 또는 "실패" 텍스트로 전이 (사용자 가이드).
  //
  // 검출 흐름:
  //   1) 5초 모달 mount 대기.
  //   2) polling: 안정화 — visible "성공" + "실패" leaf-text 카운트가 3 cycles (9초)
  //      변하지 않고 + spinning element 0 → 종료.
  //   3) success ≥ 1 → ok / 모두 실패 → fail.
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
      message: '240초 안에 모달의 성공/실패 텍스트 검출 실패',
    };
  }

  // 모달 닫기.
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

  // 등록상품 페이지에 "상품 코드 검색" 이 있으면 동일 패턴 사용.
  // 단 페이지 마다 모달 / textbox 구조가 다를 수 있어 우선 직접 텍스트/href 매칭 시도.
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

  // 1) 페이지 자체에서 productId 가 보이는지 (검색 없이 바로 노출되는 경우).
  const start = Date.now();
  while (Date.now() - start < 30_000) {
    if (await searchAttempt()) return { ok: true as const };
    await page.waitForTimeout(2_000);
  }

  // 2) "상품 코드 검색" 모달이 등록상품 페이지에도 있으면 활용.
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

const handlers: StepHandlers = {
  open_collected_list: openCollectedListStep,
  search_product: searchProductStep,
  open_detail: openDetailStep,
  trigger_upload: triggerUploadStep,
  wait_upload_complete: waitUploadCompleteStep,
  open_registered_list: openRegisteredListStep,
  verify_in_registered: verifyInRegisteredStep,
};

// ─────────────────────────────────────────────────────────────────────────────
// Test
// ─────────────────────────────────────────────────────────────────────────────

test('단건 상품 업로드 후 등록상품 목록 검증', async ({ page }) => {
  test.setTimeout(15 * 60_000);

  const atc = loadATC(ATC_PATH);

  const example = atc.inputs['source_product_id']?.example ?? '';
  const pickFirstNonEmpty = (...vals: (string | undefined)[]): string =>
    vals.find((v) => typeof v === 'string' && v.length > 0) ?? '';
  const inputs: Record<string, unknown> = {
    source_product_id: pickFirstNonEmpty(
      process.env['ATC_INPUT_SOURCE_PRODUCT_ID'],
      example,
    ),
  };

  const result = await runATC({ atc, page, inputs, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
