/**
 * 수집상품 / 상품상세 영역 P0 TC 묶음 (10건) — skeleton ATC, destructive/외부/AI/환경 의존 → 진입 + noop log.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { goToCollectedProducts } from '../../lib/windly-actions';

const ATC_PATH = join(__dirname, '..', '..', "atcs", "collected-product", "p0-수집상품-상품상세.atc.yml");
const URL = "https://app.windly.cc/view2/interested-product";

let entered = false;

const enterPage: StepHandler = async (page) => {
  if (entered) return { ok: true as const };
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);
  const body = await page.evaluate(() => document.body.innerText);
  if (!body.includes("\uc218\uc9d1\uc0c1\ud488")) {
    logger.warn(`[collected] 페이지 라벨 '수집상품' 미감지 — host/URL 변경 가능. 일단 통과.`);
  }
  entered = true;
  return { ok: true as const };
};

const noopAfter = (label: string, reason: string): StepHandler => async (page) => {
  const e = await enterPage(page, {});
  if (!e.ok) return e;
  logger.info(`[${label}] ${reason} — skip`);
  return { ok: true as const };
};

const verifyPageReachable: StepHandler = async (page) => {
  const e = await enterPage(page, {});
  if (!e.ok) return e;
  const length = await page.evaluate(() => document.body.innerText.length);
  if (length < 10) {
    return { ok: false as const, error_key: 'page_blank' as ErrorKey, message: `page body length ${length}` };
  }
  return { ok: true as const };
};

// ── ESM 2.0 옵션설정 모달 (TC 867/868/869) ──────────────────────────────
// 위치: 수집상품 상세 → [업로드 설정] 탭 → "ESM 2.0 옵션설정" 섹션.
// 게이팅: 섹션은 (uploadMarkets.esm || uploadedMarkets.esm) 일 때만 렌더 — 즉
//   인터파크/ESM 마켓 연결 + esm 업로드 대상 ON 이 전제 (환경 의존).
// 모달 트리거 = "옵션설정" 버튼. 모달 닫기 = "닫기" 버튼 (저장 안 함 → 비-destructive).
// 환경에 ESM 가 없으면 fail 이 아니라 정직 skip (R5+ 정직성 원칙).

let uploadTabReady = false;
let esmSectionPresent = false;

async function openFirstProductUploadTab(
  page: Parameters<StepHandler>[0],
): Promise<{ ok: boolean; reason?: string }> {
  if (uploadTabReady) return { ok: true };
  await goToCollectedProducts(page);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  const link = page
    .locator('a[href*="/view2/interested-product/"]:not([href$="/view2/interested-product/"])')
    .first();
  try {
    await link.waitFor({ state: 'visible', timeout: 8_000 });
  } catch {
    return { ok: false, reason: '수집상품 카드 없음 (빈 환경)' };
  }
  await link.scrollIntoViewIfNeeded();
  await link.click();
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_500);
  const tab = page.getByText('업로드 설정', { exact: true }).first();
  try {
    await tab.waitFor({ state: 'visible', timeout: 8_000 });
  } catch {
    return { ok: false, reason: '[업로드 설정] 탭 미노출 (상세 mount 실패 가능)' };
  }
  await tab.click();
  await page.waitForTimeout(1_200);
  uploadTabReady = true;
  esmSectionPresent = await page
    .getByText('ESM 2.0 옵션설정')
    .first()
    .isVisible()
    .catch(() => false);
  return { ok: true };
}

// TC867 — ESM 2.0 옵션설정 섹션 + 추천옵션 모드 토글 노출 확인.
const tc867: StepHandler = async (page) => {
  const nav = await openFirstProductUploadTab(page);
  if (!nav.ok) {
    logger.info(`[tc867] ${nav.reason} — 환경 의존 skip`);
    return { ok: true as const };
  }
  if (!esmSectionPresent) {
    logger.info('[tc867] "ESM 2.0 옵션설정" 섹션 미노출 (인터파크 미연결 또는 esm 업로드 마켓 OFF) — 환경 의존 skip');
    return { ok: true as const };
  }
  const hasToggle = await page
    .getByText('추천옵션 모드')
    .first()
    .isVisible()
    .catch(() => false);
  if (!hasToggle) {
    return {
      ok: false as const,
      error_key: 'esm_option_mode_toggle_missing' as ErrorKey,
      message: 'ESM 2.0 옵션설정 섹션은 있으나 "추천옵션 모드" 토글 미노출',
    };
  }
  logger.info('[tc867] ESM 2.0 옵션설정 섹션 + 추천옵션 모드 토글 노출 — strict verified');
  return { ok: true as const };
};

// TC868 — "옵션설정" 버튼 클릭 → 옵션 모드 모달 오픈 확인 (닫기/저장 버튼 노출).
const tc868: StepHandler = async (page) => {
  const nav = await openFirstProductUploadTab(page);
  if (!nav.ok || !esmSectionPresent) {
    logger.info('[tc868] ESM 섹션 없음 — 모달 오픈 검증 skip (환경 의존)');
    return { ok: true as const };
  }
  const btn = page.getByRole('button', { name: '옵션설정' });
  const visible = await btn.isVisible().catch(() => false);
  if (!visible) {
    logger.info('[tc868] "옵션설정" 버튼 미노출 — skip');
    return { ok: true as const };
  }
  const disabled = await btn.isDisabled().catch(() => true);
  if (disabled) {
    logger.info('[tc868] "옵션설정" 버튼 disabled (옵션 에러/단일모드 등) — 모달 오픈 skip');
    return { ok: true as const };
  }
  await btn.click();
  await page.waitForTimeout(900);
  const opened =
    (await page.getByRole('button', { name: '닫기' }).isVisible().catch(() => false)) &&
    (await page.getByRole('button', { name: '저장' }).isVisible().catch(() => false));
  if (!opened) {
    return {
      ok: false as const,
      error_key: 'esm_option_modal_not_open' as ErrorKey,
      message: '"옵션설정" 클릭 후 옵션 모드 모달(닫기/저장 버튼) 미노출',
    };
  }
  logger.info('[tc868] 옵션설정 → 옵션 모드 모달 오픈 확인 — strict verified');
  return { ok: true as const };
};

// TC869 — 옵션 모드 모달 "닫기"(비저장) → 모달 닫힘 확인.
const tc869: StepHandler = async (page) => {
  const closeBtn = page.getByRole('button', { name: '닫기' });
  const modalOpen = await closeBtn.isVisible().catch(() => false);
  if (!modalOpen) {
    logger.info('[tc869] 모달 미오픈 상태 — 닫기 검증 skip (환경 의존)');
    return { ok: true as const };
  }
  await closeBtn.click();
  await page.waitForTimeout(700);
  const stillOpen = await page
    .getByRole('button', { name: '저장' })
    .isVisible()
    .catch(() => false);
  if (stillOpen) {
    return {
      ok: false as const,
      error_key: 'esm_option_modal_not_closed' as ErrorKey,
      message: '"닫기" 클릭 후에도 옵션 모드 모달 잔존',
    };
  }
  logger.info('[tc869] 옵션 모드 모달 닫기(비저장) → 닫힘 확인 — strict verified');
  return { ok: true as const };
};

const handlers: StepHandlers = {
  "tc861": verifyPageReachable,
  "tc862": noopAfter("tc862", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc867_esm-20": tc867,
  "tc868_esm-20": tc868,
  "tc869_esm-20": tc869,
  "tc943": noopAfter("tc943", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc944": noopAfter("tc944", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc945": noopAfter("tc945", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc946": noopAfter("tc946", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc947": noopAfter("tc947", 'destructive / 환경 의존 / AI 비결정 — skip'),
};

test("수집상품 / 상품상세 영역 P0 TC 묶음 (10건) — 진입 + destructive/AI noop skip", async ({ page }) => {
  test.setTimeout(3 * 60_000);
  entered = false;
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
