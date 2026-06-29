/**
 * ESM 2.0(옥션+지마켓) 추천옵션 모드 옵션 매칭 handler 모듈 — test() 호출 없음.
 *
 * 대응 ATC: atcs/collected-product/esm-recommend-option-match.atc.yml
 *
 * 실제 ESM 모달 플로우는 `lib/esm-option-actions.ts` 의 공유 헬퍼가 처리한다
 * (복구 `recoveries/esm_recommend_option_unmatched.ts` 와 동일 플로우 공유).
 * 이 모듈은 step.id ↔ 헬퍼 매핑 + 상품 진입/에러체크만 담당.
 *
 * 배경(2026-06): ESM 추천옵션 모드 상품은 업로드 설정 탭의 "ESM 2.0 옵션설정"에서
 *   윈들리 옵션그룹을 묶어 하나의 추천옵션 상품으로 등록해야 업로드 가능.
 *   미설정이면 업로드 설정 탭 빨강. 쿠팡(옵션 탭 그룹명 매칭)과 완전히 다름.
 */

import type { StepHandler, StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import {
  goToCollectedProducts,
  searchByProductCode,
  openFirstSearchResult,
} from '../../lib/windly-actions';
import {
  clickErrorCheckButton,
  readTabStatuses,
  summarizeTabStatuses,
} from '../../lib/error-check-actions';
import {
  goToUploadSettingsTab,
  openEsmOptionModal,
  selectAllWindlyChips,
  clickGenerate,
  saveEsmOption,
  isEsmRecommendOptionError,
} from '../../lib/esm-option-actions';
import { emitOutput } from '../../lib/atc-output';
import { logger } from '../../lib/logger';

const openCollectedListStep: StepHandler = async (page) => {
  await goToCollectedProducts(page);
  return { ok: true as const };
};

const openTargetProductStep: StepHandler = async (page, inputs) => {
  const id =
    typeof inputs['source_product_id'] === 'string'
      ? (inputs['source_product_id'] as string).trim()
      : '';

  if (id.length > 0) {
    const count = await searchByProductCode(page, id);
    if (count === 0) {
      return {
        ok: false as const,
        error_key: 'product_not_found' as ErrorKey,
        message: `상품 코드 ${id} 검색 결과 0개`,
      };
    }
    try {
      await openFirstSearchResult(page);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        ok: false as const,
        error_key: 'detail_open_failed' as ErrorKey,
        message: `상세 진입 실패: ${msg}`,
      };
    }
  } else {
    const card = page.locator('a[href*="/view2/interested-product/"]').first();
    try {
      await card.waitFor({ state: 'visible', timeout: 30_000 });
    } catch {
      return {
        ok: false as const,
        error_key: 'no_collected_products' as ErrorKey,
        message: '수집상품 카드 0개',
      };
    }
    await card.click();
    await page
      .waitForURL(/\/view2\/interested-product\/\d+/, { timeout: 30_000 })
      .catch(() => undefined);
  }
  await page.waitForTimeout(1_500);

  const matched = page.url().match(/\/view2\/interested-product\/(\d+)/);
  const resolvedId = matched?.[1] ?? id;
  if (resolvedId.length > 0) {
    emitOutput('source_product_id', resolvedId);
    logger.info(`[open_target_product] source_product_id=${resolvedId}`);
  }
  return { ok: true as const };
};

const openUploadSettingsTabStep: StepHandler = async (page) => {
  if (!(await goToUploadSettingsTab(page))) {
    return {
      ok: false as const,
      error_key: 'upload_settings_tab_not_found' as ErrorKey,
      message: '업로드 설정 탭 미노출',
    };
  }
  return { ok: true as const };
};

// "수정할 부분 없음" → 미실행(skipped). ESM 모드는 수집 시점부터 보통 이미 설정돼 있어
// 옵션설정 버튼이 없거나 매칭 섹션이 안 뜨는(= 매칭할 게 없는) 상품이 다수. 손댈 게 없으면
// 실패가 아니라 미실행으로 분류 (error_key 가 NOT_EXECUTED_KEYS — lib/runner.ts).
const openEsmOptionModalStep: StepHandler = async (page) => {
  const r = await openEsmOptionModal(page);
  if (r === 'absent') {
    return {
      ok: false as const,
      error_key: 'esm_option_setting_absent' as ErrorKey,
      message: 'ESM 2.0 옵션설정 버튼 미발견 — 수정할 ESM 설정 없음 (미실행)',
    };
  }
  if (r === 'not-opened') {
    return {
      ok: false as const,
      error_key: 'esm_option_modal_not_opened' as ErrorKey,
      message: 'ESM 2.0 옵션설정 매칭 섹션 미노출 — 이미 설정됨/수정할 부분 없음 (미실행)',
    };
  }
  return { ok: true as const };
};

const matchEsmOptionsStep: StepHandler = async (page) => {
  let selected = 0;
  try {
    selected = await selectAllWindlyChips(page);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false as const,
      error_key: 'esm_match_section_missing' as ErrorKey,
      message: msg,
    };
  }
  // 매칭할 칩이 0개 = 이미 전부 매칭됨 = 수정할 부분 없음 → 미실행(skipped).
  if (selected === 0) {
    return {
      ok: false as const,
      error_key: 'esm_nothing_to_fix' as ErrorKey,
      message: '매칭할 윈들리 옵션 칩 0개 — 이미 매칭됨/수정할 부분 없음 (미실행)',
    };
  }
  logger.info(`[match_esm_options] 윈들리 칩 선택 ${selected}건`);
  return { ok: true as const };
};

const generateStep: StepHandler = async (page) => {
  if (!(await clickGenerate(page))) {
    return {
      ok: false as const,
      error_key: 'esm_generate_disabled' as ErrorKey,
      message: '생성하기가 비활성/미발견 — 윈들리 칩 선택(묶음)이 완료되지 않음',
    };
  }
  return { ok: true as const };
};

const saveEsmOptionStep: StepHandler = async (page) => {
  if (!(await saveEsmOption(page))) {
    return {
      ok: false as const,
      error_key: 'esm_save_btn_not_found' as ErrorKey,
      message: 'ESM 옵션설정 저장 버튼 미발견/실패',
    };
  }
  return { ok: true as const };
};

/**
 * 에러체크 → 업로드 설정 탭 빨간 dot 0건 검증.
 * 업로드 설정 빨강이면 그게 ESM 추천옵션 미설정 때문인지 판별 →
 *   ESM 이면 error_key `esm_recommend_option_unmatched` 반환(복구 트리거).
 *   ESM 아니면 일반 `esm_upload_settings_still_red`.
 * 기본 정보 등 무관 탭 red 는 스코프 외(로그만).
 */
const errorCheckStep: StepHandler = async (page) => {
  const clicked = await clickErrorCheckButton(page);
  if (!clicked) {
    return {
      ok: false as const,
      error_key: 'error_check_button_not_found' as ErrorKey,
      message: '상단 에러체크 버튼 미발견',
    };
  }
  await page.waitForTimeout(1_500);

  const statuses = await readTabStatuses(page);
  const sum = summarizeTabStatuses(statuses);
  const redTabs = statuses.filter((s) => s.status === 'red').map((s) => s.name);
  logger.info(
    `[error_check] red=${sum.red} green=${sum.green} | 빨강: ${redTabs.join(', ') || '없음'}`,
  );

  if (sum.total_classified === 0) {
    return {
      ok: false as const,
      error_key: 'error_check_not_run' as ErrorKey,
      message: '에러체크 후 탭 dot 미감지 — 실제 실행 여부 확인 필요',
    };
  }

  const uploadTab = statuses.find((s) => s.name === '업로드 설정');
  if (uploadTab !== undefined && uploadTab.status === 'red') {
    // 업로드 설정 탭으로 이동해 ESM 추천옵션 미설정인지 판별.
    await goToUploadSettingsTab(page);
    const isEsm = await isEsmRecommendOptionError(page);
    return {
      ok: false as const,
      error_key: (isEsm
        ? 'esm_recommend_option_unmatched'
        : 'esm_upload_settings_still_red') as ErrorKey,
      message: isEsm
        ? `업로드 설정 탭 빨강 — ESM 추천옵션 미설정 (복구 대상). 전체 빨강: ${redTabs.join(', ')}`
        : `업로드 설정 탭 빨강 (ESM 외 사유). 전체 빨강: ${redTabs.join(', ')}`,
    };
  }

  const outOfScopeRed = redTabs.filter((t) => t !== '업로드 설정');
  logger.info(
    `[error_check] 업로드 설정 red 0건 — 통과` +
      `${outOfScopeRed.length > 0 ? ` (스코프 외 red 무시: ${outOfScopeRed.join(', ')})` : ''}`,
  );
  return { ok: true as const };
};

export const esmRecommendOptionMatchHandlers: StepHandlers = {
  open_collected_list: openCollectedListStep,
  open_target_product: openTargetProductStep,
  open_upload_settings_tab: openUploadSettingsTabStep,
  open_esm_option_modal: openEsmOptionModalStep,
  match_esm_options: matchEsmOptionsStep,
  generate: generateStep,
  save_esm_option: saveEsmOptionStep,
  error_check: errorCheckStep,
};
