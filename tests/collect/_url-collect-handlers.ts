/**
 * url-collect 계열 ATC (url-collect / url-collect-verify) 의 공유 step handlers.
 *
 * 정책 (사용자 명시):
 *   1) example 폴백 금지 — 매 실행마다 ATC_INPUT_PRODUCT_URL 필수.
 *   2) 동일 URL 재사용 금지 — tests/collect/.url-collect-history.log 에 기록된
 *      URL 이 다시 들어오면 즉시 fail.
 *   3) 시도 시점 (성공/실패 무관) 에 즉시 history 에 append.
 *
 * 모달 DOM (windly_repo/windly-frontend-web/src/features/ProductImport/...):
 *   - BulkImportTableRow 한 row 안:
 *       importing → <SpinLoader> + URL link `a.importing`
 *       success   → <Badge type="complete"> (check icon) + URL link `a.success`
 *       fail      → <Badge type="error">    (error icon) + URL link `a.fail`
 *   - "닫기" 클릭 시 modalStatus === 'complete' 이면 자동으로
 *     /view2/interested-product 로 navigate (모달 index.tsx 직접 처리).
 */

import { existsSync, readFileSync, appendFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import type { Page } from '@playwright/test';
import type { StepHandler } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { goToCollectImportMenu } from '../../lib/windly-actions';
import { emitOutput } from '../../lib/atc-output';

export const HISTORY_LOG_PATH = join(__dirname, '.url-collect-history.log');

// ─────────────────────────────────────────────────────────────────────────────
// 시도 이력 관리
// ─────────────────────────────────────────────────────────────────────────────

export function normalizeUrl(raw: string): string {
  return raw.trim();
}

export function readTriedUrls(): Set<string> {
  if (!existsSync(HISTORY_LOG_PATH)) return new Set();
  const text = readFileSync(HISTORY_LOG_PATH, 'utf-8');
  const set = new Set<string>();
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) continue;
    const tabIdx = trimmed.indexOf('\t');
    const url = tabIdx >= 0 ? trimmed.slice(tabIdx + 1) : trimmed;
    set.add(url);
  }
  return set;
}

export function appendTriedUrl(url: string): void {
  mkdirSync(dirname(HISTORY_LOG_PATH), { recursive: true });
  const line = `${new Date().toISOString()}\t${url}\n`;
  appendFileSync(HISTORY_LOG_PATH, line, 'utf-8');
}

/**
 * env 에서 URL 을 읽고, 비어있거나 이미 시도된 URL 이면 throw.
 * 통과하면 즉시 history 에 append → 같은 URL 재시도 차단.
 */
export function requireFreshUrlFromEnv(): string {
  const rawUrl = process.env['ATC_INPUT_PRODUCT_URL'] ?? '';
  const url = normalizeUrl(rawUrl);
  if (url.length === 0) {
    throw new Error(
      'ATC_INPUT_PRODUCT_URL 환경변수가 비어 있음. 매 실행마다 URL 필수 (example 폴백 없음).\n' +
        '예: ATC_INPUT_PRODUCT_URL=https://detail.tmall.com/item.htm?id=... npx playwright test ...',
    );
  }
  const tried = readTriedUrls();
  if (tried.has(url)) {
    throw new Error(
      `이미 시도한 URL: ${url}\n` +
        `이력 파일: ${HISTORY_LOG_PATH}\n` +
        '동일 URL 재실행 금지 — 새 URL 을 사용하거나 history 파일을 직접 정리한 뒤 재실행하세요.',
    );
  }
  appendTriedUrl(url);
  return url;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step handlers
// ─────────────────────────────────────────────────────────────────────────────

export const openCollectMenuStep: StepHandler = async (page, _inputs) => {
  await goToCollectImportMenu(page);
  return { ok: true as const };
};

export const openUrlCollectStep: StepHandler = async (page, _inputs) => {
  // "URL 수집" 카드 = div [cursor=pointer] + import-icon img + "URL 수집" 텍스트.
  const urlCard = page
    .locator('div')
    .filter({ has: page.getByRole('img', { name: 'import-icon' }) })
    .filter({ hasText: /^URL 수집$/ })
    .first();
  await urlCard.waitFor({ state: 'visible', timeout: 20_000 });
  await urlCard.scrollIntoViewIfNeeded();
  await urlCard.click();
  await page.waitForTimeout(1_000);
  return { ok: true as const };
};

export const submitUrlStep: StepHandler = async (page, inputs) => {
  const url =
    typeof inputs['product_url'] === 'string' ? (inputs['product_url'] as string) : '';
  if (url.length === 0) {
    return {
      ok: false as const,
      error_key: 'missing_input' as ErrorKey,
      message: 'inputs.product_url 누락',
    };
  }

  // URL 입력은 textarea (UrlImportForm.tsx 참조 — multiline).
  const urlField = page
    .getByPlaceholder(/URL|주소|링크|http/i)
    .or(page.locator('textarea'))
    .or(page.locator('input[type="url"]'))
    .or(page.locator('input[type="text"]'))
    .first();
  await urlField.waitFor({ state: 'visible', timeout: 30_000 });
  await urlField.click();
  await urlField.pressSequentially(url, { delay: 10 });

  // "수집하기" 버튼 — index.tsx 의 rightButtonText (modalStatus === 'default' 일 때).
  const submitBtn = page
    .getByRole('button', { name: /^수집하기$/ })
    .first();
  await submitBtn.waitFor({ state: 'visible', timeout: 15_000 });
  await submitBtn.click();
  return { ok: true as const };
};

/**
 * BulkImportTable 의 row 상태로 완료를 정확히 판정.
 *
 * 흐름:
 *   1) 모달이 default → importing 으로 전환되어 row 가 1개 이상 mount 될 때까지 대기.
 *   2) 폴링: a.importing (스피너 row) 이 0 개가 될 때까지.
 *   3) 종료 상태:
 *        - a.success ≥ 1 && a.fail === 0  →  ok
 *        - a.fail    ≥ 1                  →  fail (error_key='collect_failed')
 *        - 둘 다 0   →  fail (error_key='collect_no_terminal_status')
 */
export const waitCompletionStep: StepHandler = async (page, _inputs) => {
  const importingRow = page.locator('a.importing');
  const successRow = page.locator('a.success');
  const failRow = page.locator('a.fail');

  // (1) 첫 row 등장 — submit 후 importing 상태로 전환되며 BulkImportTable 이 mount 됨.
  const firstRowAppearStart = Date.now();
  while (Date.now() - firstRowAppearStart < 30_000) {
    const total =
      (await importingRow.count()) +
      (await successRow.count()) +
      (await failRow.count());
    if (total >= 1) break;
    await page.waitForTimeout(400);
  }

  // (2) 스피너 사라질 때까지 폴링 (최대 5분 — 단건 수집 기준 충분).
  const completeStart = Date.now();
  while (Date.now() - completeStart < 5 * 60_000) {
    const importing = await importingRow.count();
    if (importing === 0) break;
    await page.waitForTimeout(800);
  }

  // (3) 종료 상태 판정.
  const finalImporting = await importingRow.count();
  if (finalImporting > 0) {
    return {
      ok: false as const,
      error_key: 'collect_timeout' as ErrorKey,
      message: `5분 내 수집 미완료 — 잔여 importing row: ${finalImporting}`,
    };
  }
  // 안정화 — Badge 가 mount 되는 시간.
  await page.waitForTimeout(500);
  const successes = await successRow.count();
  const fails = await failRow.count();

  if (fails > 0) {
    return {
      ok: false as const,
      error_key: 'collect_failed' as ErrorKey,
      message: `수집 실패 row: ${fails}, 성공 row: ${successes}`,
    };
  }
  if (successes === 0) {
    return {
      ok: false as const,
      error_key: 'collect_no_terminal_status' as ErrorKey,
      message: 'importing 사라졌으나 success / fail row 모두 0개',
    };
  }
  return { ok: true as const };
};

/**
 * "닫기" 버튼 클릭 → modalStatus === 'complete' 이면 모달 자체가 자동으로
 * /view2/interested-product 로 navigate (ImportByUrlModal/index.tsx 의 handleClose).
 */
export const closeModalAndGotoCollectedStep: StepHandler = async (page, _inputs) => {
  const closeBtn = page.getByRole('button', { name: /^닫기$/ }).first();
  await closeBtn.waitFor({ state: 'visible', timeout: 10_000 });
  await closeBtn.click();
  // 모달의 자동 navigate 대기.
  try {
    await page.waitForURL(/\/view2\/interested-product/, { timeout: 30_000 });
  } catch {
    // 자동 navigate 안 되면 수동으로 이동 (defensive).
    await page
      .goto('https://global.windly.cc/view2/interested-product', {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      })
      .catch(() => undefined);
  }
  await page
    .waitForLoadState('domcontentloaded', { timeout: 30_000 })
    .catch(() => undefined);
  await page.waitForTimeout(1_500);
  return { ok: true as const };
};

/**
 * 수집 직후 첫 카드는 ProductImportingCard (수집중 상태) — windly 후처리 시간 동안
 * SpinLoader + "수집중" 텍스트 표시. 후처리 완료되면 정식 ProductCard
 * (`<div class="product-card">`) 로 swap 됨 (sesame ProductCard.tsx line 235-249).
 *
 * "수집중" 텍스트는 ProductImportingCard 안에서만 렌더 (sesame ProductImportingCard.tsx).
 * → 페이지에 "수집중" 텍스트가 0개가 되면 모든 importing → ready 전환 완료.
 *
 * 첫 .product-card 의 image (img[alt=""]) + 제목 텍스트가 visible 이면 진입 가능 상태.
 */
export const waitFirstCardReadyStep: StepHandler = async (page, _inputs) => {
  const importingText = page.getByText('수집중', { exact: true });

  // (1) 수집중 텍스트가 사라질 때까지 폴링 (최대 10분).
  //     너무 빨리 처리되어 처음부터 0 일 수도 있음 — 그것도 OK (이미 ready 상태).
  const start = Date.now();
  while (Date.now() - start < 10 * 60_000) {
    if ((await importingText.count()) === 0) break;
    await page.waitForTimeout(1_500);
  }
  if ((await importingText.count()) > 0) {
    return {
      ok: false as const,
      error_key: 'importing_timeout' as ErrorKey,
      message: '10분 내 "수집중" 카드가 ready 상태로 전환 안 됨',
    };
  }

  // (2) 첫 .product-card 가 image + 제목 visible 인지 확인.
  const firstCard = page.locator('.product-card').first();
  await firstCard.waitFor({ state: 'visible', timeout: 30_000 }).catch(() => undefined);
  if ((await firstCard.count()) === 0) {
    return {
      ok: false as const,
      error_key: 'no_ready_card' as ErrorKey,
      message: '"수집중" 사라졌으나 .product-card 0개',
    };
  }

  // 이미지: ProductCardImage 는 alt="" + non-empty src.
  //   소싱몰 아이콘은 alt="소싱몰 아이콘" 으로 구별됨.
  const cardImage = firstCard.locator('img[alt=""]').first();
  await cardImage
    .waitFor({ state: 'visible', timeout: 15_000 })
    .catch(() => undefined);
  const imgSrc = (await cardImage.getAttribute('src')) ?? '';
  if (imgSrc === '') {
    return {
      ok: false as const,
      error_key: 'product_image_missing' as ErrorKey,
      message: '첫 카드 이미지 src 비어있음 (수집은 됐으나 이미지 미로드)',
    };
  }

  // 제목: ProductCardTitle 안 텍스트 (소싱몰 아이콘 alt 제외 실제 텍스트 ≥1자).
  const titleText = (await firstCard.innerText()).trim();
  if (titleText === '') {
    return {
      ok: false as const,
      error_key: 'product_title_missing' as ErrorKey,
      message: '첫 카드 텍스트 비어있음',
    };
  }

  // eslint-disable-next-line no-console
  console.log(
    `[url-collect-verify] 첫 카드 ready: img.src=${imgSrc.slice(0, 60)}..., title 길이=${titleText.length}`,
  );
  return { ok: true as const };
};

/**
 * 첫 .product-card 클릭 → /view2/interested-product/<digits> 도달 + detail 페이지에
 * 이미지가 visible 인지 확인.
 */
export const enterProductDetailStep: StepHandler = async (page, _inputs) => {
  const firstCard = page.locator('.product-card').first();
  const firstCardLink = firstCard.locator('a[href*="/view2/interested-product/"]').first();

  await firstCardLink.waitFor({ state: 'visible', timeout: 10_000 });
  const href = (await firstCardLink.getAttribute('href')) ?? '';
  await firstCardLink.click();

  try {
    await page.waitForURL(/\/view2\/interested-product\/\d+/, { timeout: 30_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'product_detail_not_reached' as ErrorKey,
      message: `첫 카드 클릭 후 detail URL 도달 실패. 카드 href=${href}, 현재 URL=${page.url()}`,
    };
  }
  await page
    .waitForLoadState('domcontentloaded', { timeout: 30_000 })
    .catch(() => undefined);

  // detail 페이지 mount 대기 — 이미지가 visible 한지로 검증.
  const anyImg = page.locator('img').first();
  await anyImg.waitFor({ state: 'visible', timeout: 30_000 }).catch(() => undefined);
  const imgCount = await page.locator('img').count();
  if (imgCount === 0) {
    return {
      ok: false as const,
      error_key: 'product_detail_empty' as ErrorKey,
      message: 'detail 페이지에 img 0개 — 페이지 mount 실패 가능',
    };
  }

  // eslint-disable-next-line no-console
  console.log(
    `[url-collect-verify] detail 진입 성공: ${page.url()}, img ${imgCount}개`,
  );

  // D13: 같은 batch 의 뒤 TC (upload/single-product 등) 가 inputs.source_product_id.from: previous
  // 로 받아갈 수 있도록 URL 의 digits 부분을 emit. atc.yml 에 outputs 선언이 없는 ATC 에서는
  // 단순히 buffer 에 쌓였다가 무시되므로 부수효과 없음.
  const idMatch = page.url().match(/\/view2\/interested-product\/(\d+)/);
  if (idMatch !== null) {
    emitOutput('source_product_id', idMatch[1]);
  }

  return { ok: true as const };
};

/** url-collect ATC (case A) 의 step.id → handler 매핑. */
export function makeCollectHandlers(): Record<string, StepHandler> {
  return {
    open_collect_menu: openCollectMenuStep,
    open_url_collect: openUrlCollectStep,
    submit_url: submitUrlStep,
    wait_completion: waitCompletionStep,
  };
}

/** url-collect-verify ATC (case B) 의 step.id → handler 매핑. */
export function makeCollectVerifyHandlers(): Record<string, StepHandler> {
  return {
    open_collect_menu: openCollectMenuStep,
    open_url_collect: openUrlCollectStep,
    submit_url: submitUrlStep,
    wait_completion: waitCompletionStep,
    close_modal_goto_collected: closeModalAndGotoCollectedStep,
    wait_first_card_ready: waitFirstCardReadyStep,
    enter_product_detail: enterProductDetailStep,
  };
}

// (Page 타입 미사용 경고 방지 — re-export 가능성)
export type { Page };
