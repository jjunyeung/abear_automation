/**
 * 수정 업로드 모달 일부 마켓 선택 → 2단계 진입 검증.
 *
 * 대응 ATC : atcs/upload/bulk-edit-partial-then-next.atc.yml
 * TC 원본  : Case No 3582 / 등록상품 › 수정 업로드 › 일부 마켓 선택 / P0
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
  openRegisteredListStep,
  selectFirstProductStep,
  clickBulkEditButtonStep,
  modalNextButton,
} from './_bulk-edit-handlers';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'smartstore-customs-tax',
  'bulk-edit-partial-then-next.atc.yml',
);

const EDIT_FORM_LABEL_RE = /(가격\s*공식|배송\s*정보|상하단이미지|리뷰포인트|모음전\s*정책|관부가세)/;

const MARKET_LABEL_RE = /(스마트스토어|쿠팡|11번가|톡스토어|롯데온|위메프|인터파크|에스엠|G마켓|옥션)/;

/** 모달 1단계의 첫 번째 개별 마켓 체크박스. 한국어 마켓명 텍스트로 매칭 (모달 backdrop 뒤 페이지 체크박스 회피). */
const selectOneMarketStep: StepHandler = async (page) => {
  await page
    .locator('.banner')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 });

  // 모달 안 마켓 체크박스는 라벨 텍스트가 한국어 마켓명 (스마트스토어/쿠팡/...). 페이지 본문의
  // 등록상품 row 체크박스 라벨은 빈 텍스트 (값만 들어감) → 텍스트 필터로 모달 안 라벨만 잡힘.
  const firstMarketLabel = page
    .locator('label[for^="checkbox_"]')
    .filter({ hasText: MARKET_LABEL_RE })
    .first();

  const cnt = await firstMarketLabel.count().catch(() => 0);
  if (cnt === 0) {
    return {
      ok: false as const,
      error_key: 'market_checkbox_missing' as ErrorKey,
      message: '모달 1단계 마켓 체크박스 매칭 0건 (한국어 마켓명 라벨)',
    };
  }
  await firstMarketLabel.waitFor({ state: 'visible', timeout: 5_000 });
  await firstMarketLabel.click();
  return { ok: true as const };
};

const clickNextStep: StepHandler = async (page) => {
  const next = modalNextButton(page);
  await next.waitFor({ state: 'visible', timeout: 5_000 });
  const disabled = await next.isDisabled().catch(() => false);
  if (disabled) {
    return {
      ok: false as const,
      error_key: 'next_button_disabled' as ErrorKey,
      message: '다음 버튼 비활성 — 마켓 선택이 반영 안 됨',
    };
  }
  await next.click();
  return { ok: true as const };
};

const verifyStep2EnteredStep: StepHandler = async (page) => {
  // step1 banner 사라짐 + EditForms 라벨 가시.
  const editFormLabel = page.getByText(EDIT_FORM_LABEL_RE).first();
  try {
    await editFormLabel.waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'step2_not_visible' as ErrorKey,
      message: '2단계 EditForms 라벨 미노출 (가격 공식 / 배송 정보 / 상하단이미지 등)',
    };
  }
  // banner 가 사라졌는지 (1단계만 노출되는 요소).
  const bannerStillThere = await page.locator('.banner').first().isVisible().catch(() => false);
  if (bannerStillThere) {
    return {
      ok: false as const,
      error_key: 'step1_banner_still_visible' as ErrorKey,
      message: '2단계 진입 후에도 1단계 banner 가시 — 단계 전환 실패 가능',
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_registered_list: openRegisteredListStep,
  select_first_product: selectFirstProductStep,
  click_bulk_edit_button: clickBulkEditButtonStep,
  select_one_market: selectOneMarketStep,
  click_next: clickNextStep,
  verify_step2_entered: verifyStep2EnteredStep,
};

test('수정 업로드 모달 일부 마켓 선택 → 2단계 진입', async ({ page }) => {
  test.setTimeout(3 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
