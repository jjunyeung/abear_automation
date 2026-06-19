/**
 * 스스관부가세(및 등록상품 업로드설정) 공유 step handlers.
 *
 * 여는 경로: 등록상품 목록 → 첫 카드 상세 → [업로드 설정] 탭.
 * 첫 등록상품(예: 235019585)은 7개 마켓 전부 업로드 대상이라 업로드설정 탭에
 * 관부가세/스마트스토어/쿠팡/톡스토어/ESM 섹션이 모두 렌더된다(2026-06-19 실측).
 * 한글 텍스트는 getByText 불안정 → body innerText 정규식으로 검증.
 */

import type { Page } from '@playwright/test';
import type { StepHandler } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { openTopRegisteredProductStep } from '../registered-product/_handlers';
import { clickTabByLabelStep } from '../collected-product/_talkstore-handlers';

const REGISTERED_URL = 'https://app.windly.cc/view2/registered-product';
/** 업로드설정 탭 렌더 마커 (공통 업로드 설정 = 항상 노출). */
const UPLOAD_TAB_MARKER = '공통 업로드 설정';

const bodyHas = (page: Page, src: string): Promise<boolean> =>
  page.evaluate((s) => new RegExp(s).test(document.body.innerText), src).catch(() => false);

let listEntered = false;
let detailOpen = false;

/** 등록상품 상세 → 업로드 설정 탭 보장 (idempotent / stateless via marker). */
export const ensureRegisteredUploadTab: StepHandler = async (page, inputs) => {
  if (await bodyHas(page, UPLOAD_TAB_MARKER)) return { ok: true as const };
  if (!listEntered) {
    await page.goto(REGISTERED_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
    await page.waitForTimeout(1_000);
    listEntered = true;
  }
  if (!detailOpen) {
    const r = await openTopRegisteredProductStep(page, inputs);
    if (!r.ok) return r;
    detailOpen = true;
  }
  const tab = await clickTabByLabelStep(/^업로드 설정$/)(page, inputs);
  if (!tab.ok) return tab;
  for (let i = 0; i < 8; i += 1) {
    if (await bodyHas(page, UPLOAD_TAB_MARKER)) return { ok: true as const };
    await page.waitForTimeout(700);
  }
  return { ok: false as const, error_key: 'upload_tab_not_open' as ErrorKey, message: '업로드 설정 탭 미노출' };
};

/** 업로드설정 탭 보장 후 텍스트(라벨/옵션) 노출 검증. */
export const verifyUploadText = (re: RegExp, key: string): StepHandler => async (page, inputs) => {
  const e = await ensureRegisteredUploadTab(page, inputs);
  if (!e.ok) return e;
  for (let i = 0; i < 5; i += 1) {
    if (await bodyHas(page, re.source)) return { ok: true as const };
    await page.waitForTimeout(500);
  }
  return { ok: false as const, error_key: key as ErrorKey, message: `업로드설정 미노출: ${re.source}` };
};

/** 테스트 격리용 — spec beforeEach 에서 호출해 모듈 state 초기화. */
export const resetCustomsState = (): void => {
  listEntered = false;
  detailOpen = false;
};
