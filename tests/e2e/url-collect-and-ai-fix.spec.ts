/**
 * URL 수집 → 상세 → AI 추천 + 옵션 A-Z → 에러 0 검증 (e2e) — Playwright spec
 *
 * 대응 ATC: atcs/e2e/url-collect-and-ai-fix.atc.yml
 *
 * collect 단계는 tests/collect/_url-collect-handlers.ts 의 핸들러 재사용.
 * AI 추천 / A-Z 정규화 / 최종 verify 는 본 spec 에 정의.
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
  openCollectMenuStep,
  openUrlCollectStep,
  submitUrlStep,
  waitCompletionStep,
  closeModalAndGotoCollectedStep,
  waitFirstCardReadyStep,
  enterProductDetailStep,
  requireFreshUrlFromEnv,
} from '../product-collect/_url-collect-handlers';
import {
  clickErrorCheckButton,
  readTabStatuses,
} from '../../lib/error-check-actions';
import { readBannerErrors, walkAndFixTab } from '../../lib/tab-error-fix';
import {
  triggerUploadFromDetail,
  waitUploadComplete,
  closeUploadResultModal,
} from '../../lib/upload-actions';
import { logger } from '../../lib/logger';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'e2e',
  'url-collect-and-ai-fix.atc.yml',
);

// ─────────────────────────────────────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────────────────────────────────────

/** 보이는 input/textarea 들의 값 스냅샷 (변경 비교용). */
async function snapshotInputValues(
  page: import('@playwright/test').Page,
): Promise<string[]> {
  return page.evaluate(() => {
    const els = Array.from(
      document.querySelectorAll('input, textarea'),
    ) as HTMLInputElement[];
    return els
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      })
      .map((el) => el.value ?? '');
  });
}

/** 특정 탭으로 이동 + 안정화 대기. */
async function clickTab(
  page: import('@playwright/test').Page,
  tabName: string,
): Promise<void> {
  const tabBtn = page.getByRole('button', { name: tabName }).first();
  await tabBtn.waitFor({ state: 'visible', timeout: 10_000 });
  await tabBtn.click();
  await page.waitForTimeout(1_500);
}

// ─────────────────────────────────────────────────────────────────────────────
// 새 step handlers
// ─────────────────────────────────────────────────────────────────────────────

const aiRecommendProductNameStep: StepHandler = async (page, _inputs) => {
  await clickTab(page, '기본 정보');

  // 클릭 전 input 값 스냅샷.
  const before = await snapshotInputValues(page);

  // "AI 상품명 추천" 버튼 클릭.
  const btn = page.getByRole('button', { name: /AI\s*상품명\s*추천/ }).first();
  await btn.waitFor({ state: 'visible', timeout: 10_000 });
  await btn.click();

  // 로딩 텍스트 노출 후 사라질 때까지 대기.
  const loading = page.getByText(/AI\s*상품명\s*다듬기\s*중/);
  await loading.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => undefined);
  await loading.waitFor({ state: 'hidden', timeout: 90_000 }).catch(() => undefined);
  // mount 안정화.
  await page.waitForTimeout(1_500);

  // rate-limit / network 에러 토스트 감지.
  const errToast = page.getByText(
    /네트워크\s*오류|일시적|rate.*limit|초과|잠시\s*후/,
    { exact: false },
  );
  if ((await errToast.count()) > 0 && (await errToast.first().isVisible())) {
    const msg = await errToast.first().innerText().catch(() => '');
    return {
      ok: false as const,
      error_key: 'ai_title_rate_limited' as ErrorKey,
      message: `AI 상품명 추천 실패 토스트: ${msg}`,
    };
  }

  // 클릭 후 input 값 비교 — ≥1 변경 = AI 추천이 적용됨.
  const after = await snapshotInputValues(page);
  let changed = 0;
  const minLen = Math.min(before.length, after.length);
  for (let i = 0; i < minLen; i++) {
    if (before[i] !== after[i]) changed += 1;
  }
  logger.info(
    `[ai_recommend_product_name] input 변경 ${changed}개 (전체 ${minLen}개 비교)`,
  );
  if (changed === 0) {
    return {
      ok: false as const,
      error_key: 'ai_title_no_change' as ErrorKey,
      message: 'AI 상품명 추천 클릭 후 input 값 변경 없음 (호출 실패 또는 동일 결과)',
    };
  }
  return { ok: true as const };
};

const aiRecommendCategoryStep: StepHandler = async (page, _inputs) => {
  await clickTab(page, '기본 정보');

  const btn = page.getByRole('button', { name: /AI\s*카테고리\s*추천/ }).first();
  await btn.waitFor({ state: 'visible', timeout: 10_000 });
  await btn.click();

  const loading = page.getByText(/AI\s*카테고리\s*추천\s*중/);
  await loading.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => undefined);
  await loading.waitFor({ state: 'hidden', timeout: 120_000 }).catch(() => undefined);
  await page.waitForTimeout(1_500);

  const errToast = page.getByText(
    /네트워크\s*오류|일시적|rate.*limit|초과|잠시\s*후/,
    { exact: false },
  );
  if ((await errToast.count()) > 0 && (await errToast.first().isVisible())) {
    const msg = await errToast.first().innerText().catch(() => '');
    return {
      ok: false as const,
      error_key: 'ai_category_rate_limited' as ErrorKey,
      message: `AI 카테고리 추천 실패 토스트: ${msg}`,
    };
  }
  return { ok: true as const };
};

const applyAlphabetOptionNamesStep: StepHandler = async (page, _inputs) => {
  await clickTab(page, '옵션');

  // "A-Z" 버튼 정확 매치 (Tooltip content 가 "A to Z 로 변환하기" 라 부분 매치 사용 시 충돌 가능).
  const azBtns = page.getByRole('button', { name: /^A-Z$/ });
  // count 는 초기 한 번만 캡처 — DOM mutation 시 변경 가능.
  const initialCount = await azBtns.count();
  logger.info(`[apply_alphabet_option_names] A-Z 버튼 ${initialCount}개 발견`);
  if (initialCount === 0) {
    logger.info(
      '[apply_alphabet_option_names] A-Z 버튼 0개 — 옵션 그룹 없는 상품, step skip (ok)',
    );
    return { ok: true as const };
  }

  // detail URL 잠그기 — 어떤 step 에서 잘못 클릭으로 navigate 되면 명확히 fail.
  const detailUrlBefore = page.url();
  if (!/\/view2\/interested-product\/\d+/.test(detailUrlBefore)) {
    return {
      ok: false as const,
      error_key: 'unexpected_navigation' as ErrorKey,
      message: `detail 페이지 아님 (시작 시점). url=${detailUrlBefore}`,
    };
  }

  for (let i = 0; i < initialCount; i++) {
    const cur = page.getByRole('button', { name: /^A-Z$/ }).nth(i);
    if ((await cur.count()) === 0) {
      logger.warn(
        `[apply_alphabet_option_names] A-Z 버튼 nth(${i}) 사라짐 — skip`,
      );
      continue;
    }
    await cur.scrollIntoViewIfNeeded();
    await cur.click();
    // AnchoredModal Content 등장 대기.
    await page.waitForTimeout(700);

    // sesame AnchoredModal Content 는 className "anchored-modal" 부여 (AnchoredModal.tsx line 75/85).
    // 그 안에 AlphabetOrderTypeModal > Button (icon-only) 가 있음.
    // 페이지에 여러 .anchored-modal 가 있을 수 있어 visible + button 가지는 것만 골라 그 안의 button 클릭.
    const subBtnSelector = await page.evaluate(() => {
      const modals = Array.from(document.querySelectorAll('.anchored-modal')) as HTMLElement[];
      for (const modal of modals) {
        const mr = modal.getBoundingClientRect();
        if (mr.width === 0 || mr.height === 0) continue;
        const btns = Array.from(modal.querySelectorAll('button')) as HTMLButtonElement[];
        for (const b of btns) {
          const br = b.getBoundingClientRect();
          if (br.width === 0 || br.height === 0) continue;
          const text = (b.textContent ?? '').trim();
          if (text.length > 0) continue;
          if (b.querySelector('svg') === null) continue;
          // unique data attribute 부여하여 추후 locator 로 정확히 잡기.
          const uniq = `__atc_az_sub_${Math.random().toString(36).slice(2, 10)}`;
          b.setAttribute('data-atc-target', uniq);
          return `[data-atc-target="${uniq}"]`;
        }
      }
      return '';
    });
    if (subBtnSelector === '') {
      return {
        ok: false as const,
        error_key: 'alphabet_modal_button_not_found' as ErrorKey,
        message: `A-Z[${i}] 클릭 후 .anchored-modal 안 icon-only sub 버튼 미발견`,
      };
    }
    await page.locator(subBtnSelector).click({ timeout: 5_000 }).catch(() => undefined);
    await page.waitForTimeout(800);

    // navigate 되었는지 verify — 안 되었어야 함.
    if (!/\/view2\/interested-product\/\d+/.test(page.url())) {
      return {
        ok: false as const,
        error_key: 'unexpected_navigation' as ErrorKey,
        message: `A-Z[${i}] 처리 후 detail 페이지에서 navigate 됨. 현재 url=${page.url()}`,
      };
    }

    // 모달 close 는 별도 액션 안 함 — 다음 iteration 의 A-Z 클릭 자체가 outside click 역할.
    // 마지막 iteration 후 모달이 열려있어도 검증은 페이지 input 값을 읽으므로 문제없음.
    // 진단 로그.
    const peek = await page.evaluate(() => {
      const inputs = Array.from(
        document.querySelectorAll('input, textarea'),
      ) as HTMLInputElement[];
      return inputs
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        })
        .map((el) => (el.value ?? '').slice(0, 40))
        .filter((v) => v.length > 0 && v.length <= 6 && /^[A-Za-z]+$/.test(v))
        .slice(0, 30);
    });
    logger.info(
      `[apply_alphabet_option_names] [${i}] 클릭 후 알파벳 input ${peek.length}개 미리보기: ${peek.join(', ')}`,
    );
  }

  // 검증: 옵션명 input 값이 모두 ^[A-Z]+$ 형태인지.
  // 옵션 row 의 input/textarea 중에서 옵션명 (label.value) 에 해당하는 것만 골라야 함.
  // 단순화: visible textbox 중 값이 1~4자 이고 [A-Z]+ 인 것 ≥1 면 정규화 effective.
  const matched = await page.evaluate(() => {
    const inputs = Array.from(
      document.querySelectorAll('input, textarea'),
    ) as HTMLInputElement[];
    const out: string[] = [];
    for (const inp of inputs) {
      const r = inp.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const v = (inp.value ?? '').trim();
      if (v.length === 0) continue;
      if (/^[A-Z]+$/.test(v) && v.length <= 4) out.push(v);
    }
    return out;
  });
  logger.info(
    `[apply_alphabet_option_names] [A-Z]+ 패턴 input 값 ${matched.length}개: ${matched.slice(0, 20).join(', ')}${matched.length > 20 ? '...' : ''}`,
  );
  if (matched.length === 0) {
    return {
      ok: false as const,
      error_key: 'option_names_not_normalized' as ErrorKey,
      message: 'A-Z 처리 후에도 [A-Z]+ 패턴 옵션명 0개 — 정규화 미적용',
    };
  }
  return { ok: true as const };
};

const errorCheckAndVerifyCleanStep: StepHandler = async (page, _inputs) => {
  const MAX_PASSES = 3;
  // ESC 로 잔여 모달 정리.
  await page.keyboard.press('Escape').catch(() => undefined);
  await page.waitForTimeout(300);

  // 첫 에러체크.
  const ok = await clickErrorCheckButton(page);
  if (!ok) {
    return {
      ok: false as const,
      error_key: 'error_check_btn_not_found' as ErrorKey,
      message: '에러체크 버튼 미발견',
    };
  }
  await page.waitForTimeout(2_000);

  // multi-pass: 빨간 탭 → walkAndFixTab → 재트리거. 더 못 줄이면 종료.
  let prevReds = -1;
  for (let pass = 1; pass <= MAX_PASSES; pass++) {
    const statuses = await readTabStatuses(page);
    const reds = statuses.filter((s) => s.status === 'red');
    logger.info(
      `[error_check_and_verify_clean] pass ${pass}: status=${JSON.stringify(statuses)}, reds=${reds.length}`,
    );
    if (reds.length === 0) break;

    let fixedThisPass = 0;
    for (const redTab of reds) {
      const r = await walkAndFixTab(page, redTab.name);
      if (r.fixed > 0) {
        logger.info(`  [${redTab.name}] ${r.fixed}건 수정`);
        fixedThisPass += r.fixed;
      } else if (r.reason !== undefined && r.reason !== 'no errors') {
        logger.warn(`  [${redTab.name}] skip: ${r.reason}`);
      }
      await page.waitForTimeout(300);
    }

    // 에러체크 재트리거.
    await page.keyboard.press('Escape').catch(() => undefined);
    await page.waitForTimeout(300);
    await clickErrorCheckButton(page);
    await page.waitForTimeout(1_500);

    if (fixedThisPass === 0 || prevReds === reds.length) {
      logger.warn(
        `[error_check_and_verify_clean] pass ${pass} fix ${fixedThisPass}건 / 빨간 탭 변화 없음 — 조기 종료`,
      );
      break;
    }
    prevReds = reds.length;
  }

  // 최종 검증.
  const finalStatuses = await readTabStatuses(page);
  logger.info(
    `[error_check_and_verify_clean] 최종 status=${JSON.stringify(finalStatuses)}`,
  );
  const finalReds = finalStatuses.filter((s) => s.status === 'red');
  if (finalReds.length === 0) {
    return { ok: true as const };
  }
  // 빨간 탭 잔존.
  const firstRed = finalReds[0];
  const tabBtn = page.getByRole('button', { name: firstRed.name }).first();
  await tabBtn.click().catch(() => undefined);
  await page.waitForTimeout(800);
  const banners = await readBannerErrors(page);
  const firstBanner = banners[0]?.raw ?? '(배너 없음)';
  return {
    ok: false as const,
    error_key: 'red_tabs_remaining' as ErrorKey,
    message:
      `자동수정 + 재시도 후에도 빨간 탭 ${finalReds.length}개: ${finalReds.map((r) => r.name).join(', ')}. ` +
      `첫 탭 [${firstRed.name}] 배너: ${firstBanner}`,
  };
};

const triggerUploadStep: StepHandler = async (page, _inputs) => {
  // ESC 로 잔여 모달/툴팁 정리.
  await page.keyboard.press('Escape').catch(() => undefined);
  await page.waitForTimeout(300);

  const r = await triggerUploadFromDetail(page);
  if (!r.ok) {
    return {
      ok: false as const,
      error_key: r.error_key as ErrorKey,
      message: r.message,
    };
  }
  return { ok: true as const };
};

const waitUploadCompleteStep: StepHandler = async (page, _inputs) => {
  const r = await waitUploadComplete(page, { timeoutMs: 240_000 });
  logger.info(
    `[wait_upload_complete] 결과: 성공 ${r.result.success} / 실패 ${r.result.fail}`,
  );
  // 성공/실패 무관하게 결과 모달 close 시도.
  await closeUploadResultModal(page);
  if (!r.ok) {
    return {
      ok: false as const,
      error_key: r.error_key as ErrorKey,
      message: r.message,
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_collect_menu: openCollectMenuStep,
  open_url_collect: openUrlCollectStep,
  submit_url: submitUrlStep,
  wait_completion: waitCompletionStep,
  close_modal_goto_collected: closeModalAndGotoCollectedStep,
  wait_first_card_ready: waitFirstCardReadyStep,
  enter_product_detail: enterProductDetailStep,
  ai_recommend_product_name: aiRecommendProductNameStep,
  ai_recommend_category: aiRecommendCategoryStep,
  apply_alphabet_option_names: applyAlphabetOptionNamesStep,
  error_check_and_verify_clean: errorCheckAndVerifyCleanStep,
  trigger_upload: triggerUploadStep,
  wait_upload_complete: waitUploadCompleteStep,
};

// ─────────────────────────────────────────────────────────────────────────────
// Test
// ─────────────────────────────────────────────────────────────────────────────

test('URL 수집 → 상세 → AI 추천 + 옵션 A-Z → 에러 0 → 업로드 실행 검증 (e2e)', async ({ page }) => {
  test.setTimeout(20 * 60_000);

  const atc = loadATC(ATC_PATH);
  const url = requireFreshUrlFromEnv();

  const result = await runATC({
    atc,
    page,
    inputs: { product_url: url },
    handlers,
  });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
