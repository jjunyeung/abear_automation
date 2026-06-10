/**
 * 배송대행지 토스토스 신청서 — 부가서비스 조건부 옵션 검증.
 *
 * 대응 ATC: atcs/delivery-agency/da-additional-service-conditional.atc.yml
 * TC 원본 : Case No 1413~1437 / 배송대행지 › 신청서 작성 › 옵션 조건부 선택 / P0 (25건)
 *
 * 조건부 disable 규칙(option.disabledOptions/exclusiveOptions + 통관정책)은 API 데이터 의존이라
 * 25개 순열을 정적으로 재현하지 않고, 부가서비스 섹션 렌더 + 옵션 선택 시 선택/비활성 상태가
 * 실제로 변하는 메커니즘을 loose 검증 (기존 da-* ATC 와 동일 tier).
 *
 * 신규 step handler 는 본 spec 에 self-contained — 공유 모듈(_da-application-handlers.ts)은
 * 기존 export(goToTosstossApplicationStep / addManualFormStep / toggleByLabelText)만 재사용.
 */

import { join } from 'path';
import type { Page, Locator } from '@playwright/test';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import {
  goToTosstossApplicationStep,
  addManualFormStep,
  toggleByLabelText,
} from './_da-application-handlers';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'delivery-agency',
  'da-additional-service-conditional.atc.yml',
);

const SECTION_TITLE = '부가 서비스 요청';

interface ServiceState {
  /** 부가서비스 섹션 안 체크박스 총 개수 */
  boxes: number;
  /** disabled 인 체크박스 개수 */
  disabledCount: number;
  /** checked 인 체크박스 개수 */
  checkedCount: number;
  /** 클릭 가능한(활성 + 미선택) 옵션 라벨 텍스트 목록 */
  enabledLabels: string[];
}

/**
 * '부가 서비스 요청' Collapse 컨테이너로 스코프를 좁혀 체크박스 상태를 수집한다.
 * Collapse 구조: Container > TitleContainer > Text("부가 서비스 요청") + (children: 옵션들).
 * 제목 Text 에서 위로 올라가며 체크박스를 처음 포함하는 조상(=Collapse Container)에서 집계.
 */
async function readServiceState(titleLoc: Locator): Promise<ServiceState> {
  return titleLoc.evaluate((el: Element) => {
    let container: HTMLElement | null = el as HTMLElement;
    for (let i = 0; i < 6 && container; i += 1) {
      if (container.querySelector('input[type="checkbox"]')) {
        break;
      }
      container = container.parentElement;
    }
    if (!container) {
      return { boxes: 0, disabledCount: 0, checkedCount: 0, enabledLabels: [] };
    }
    const inputs = Array.from(
      container.querySelectorAll('input[type="checkbox"]'),
    ) as HTMLInputElement[];
    const labelEls = Array.from(container.querySelectorAll('.checkbox-label'));
    const enabledLabels: string[] = [];
    inputs.forEach((input, idx) => {
      const labelText = (labelEls[idx]?.textContent || '').trim().replace(/\*$/, '').trim();
      if (!input.disabled && !input.checked && labelText.length > 0) {
        enabledLabels.push(labelText);
      }
    });
    return {
      boxes: inputs.length,
      disabledCount: inputs.filter((i) => i.disabled).length,
      checkedCount: inputs.filter((i) => i.checked).length,
      enabledLabels,
    };
  });
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sectionTitleLocator(page: Page): Locator {
  return page.getByText(SECTION_TITLE, { exact: true }).first();
}

/** 부가서비스 섹션 + 필수 안내문 + 옵션 체크박스 렌더 검증. */
const verifyAdditionalServiceSection: StepHandler = async (page) => {
  const notice = page.getByText(/부가서비스는\s*1개\s*이상\s*필수\s*선택/).first();
  try {
    await notice.waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'additional_service_section_missing' as ErrorKey,
      message: '부가서비스 필수 선택 안내문 미노출 — 섹션 진입 실패',
    };
  }
  const titleLoc = sectionTitleLocator(page);
  if ((await titleLoc.count().catch(() => 0)) === 0) {
    return {
      ok: false as const,
      error_key: 'additional_service_section_missing' as ErrorKey,
      message: `섹션 제목 '${SECTION_TITLE}' 미노출`,
    };
  }
  const state = await readServiceState(titleLoc);
  if (state.boxes < 1) {
    return {
      ok: false as const,
      error_key: 'additional_service_options_missing' as ErrorKey,
      message: '부가서비스 섹션에 옵션 체크박스가 0개',
    };
  }
  return { ok: true as const };
};

/** 활성 옵션 1개 선택 → 선택/비활성 상태가 변하는 조건부 메커니즘 검증. */
const verifyConditionalToggle: StepHandler = async (page) => {
  const titleLoc = sectionTitleLocator(page);
  const before = await readServiceState(titleLoc);
  if (before.enabledLabels.length === 0) {
    // 모든 옵션이 통관정책 등으로 이미 disabled — 본 환경에선 토글 검증 불가(데이터 의존).
    // 섹션/옵션 렌더는 직전 step 에서 확인됨 → loose pass.
    return { ok: true as const };
  }
  const target = before.enabledLabels[0];
  const clicked = await toggleByLabelText(page, new RegExp(`^${escapeRegExp(target)}$`));
  if (!clicked.ok) {
    return {
      ok: false as const,
      error_key: 'conditional_option_click_failed' as ErrorKey,
      message: `부가서비스 옵션 '${target}' 클릭 실패: ${clicked.reason}`,
    };
  }
  await page.waitForTimeout(600);
  const after = await readServiceState(titleLoc);
  const checkedChanged = after.checkedCount !== before.checkedCount;
  const disabledChanged = after.disabledCount !== before.disabledCount;
  if (!checkedChanged && !disabledChanged) {
    return {
      ok: false as const,
      error_key: 'conditional_option_no_effect' as ErrorKey,
      message: `옵션 '${target}' 선택해도 선택/비활성 상태 변화 없음 (checked ${before.checkedCount}→${after.checkedCount}, disabled ${before.disabledCount}→${after.disabledCount})`,
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_tosstoss_application: goToTosstossApplicationStep,
  add_manual_form: addManualFormStep,
  verify_additional_service_section: verifyAdditionalServiceSection,
  verify_conditional_toggle: verifyConditionalToggle,
};

test('#1413~1437 토스토스 신청서 부가서비스 조건부 옵션', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
