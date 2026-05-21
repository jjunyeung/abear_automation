/**
 * 배송대행지 신청서 작성 ATC 계열 공유 step handlers.
 *
 * 대상 시나리오: TC export Case 1378~1502 (배송대행지 › 신청서 작성, P0 72건).
 *
 * 코드 출처 (windly-frontend-web view3):
 *   src/router.tsx → path 'delivery-agency/application' → DeliveryAgencyApplication
 *   src/features/DeliveryAgencyApplication/index.tsx → ?agency=tosstoss → <Tosstoss />
 *                                                    → ?agency=quickstar → <Quickstar />
 *   src/features/DeliveryAgencyApplication/Tosstoss/  → 신청서 폼 본체
 *
 * URL: app.windly.cc/view3/delivery-agency/application?agency=tosstoss
 *   (view3 host hard-code 필수 — memory: project_windly_view3_host)
 */

import type { Page } from '@playwright/test';
import type { StepHandler } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';

const TOSSTOSS_URL = 'https://app.windly.cc/view3/delivery-agency/application?agency=tosstoss';

/** Tosstoss 신청서 페이지로 직접 이동. setup 으로 로그인 + 해구대 진입은 이미 완료. */
export const goToTosstossApplicationStep: StepHandler = async (page) => {
  await page.goto(TOSSTOSS_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  // URL 매칭 확인 — useEffect 가 agency 없으면 /delivery-agency 로 navigate 함.
  await page.waitForFunction(
    () => window.location.pathname.includes('/delivery-agency/application'),
    null,
    { timeout: 10_000 },
  ).catch(() => undefined);
  const url = page.url();
  if (!url.includes('/delivery-agency/application')) {
    return {
      ok: false as const,
      error_key: 'da_application_not_loaded' as ErrorKey,
      message: `현재 URL ${url} — 신청서 페이지 진입 실패`,
    };
  }
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  return { ok: true as const };
};

/** 페이지 안 첫 button / 텍스트 가시 확인용 sentinel (전체 폼 로드 대기). */
export async function waitForFormReady(page: Page, timeoutMs = 10_000): Promise<boolean> {
  try {
    await page.locator('input, textarea, [role="combobox"], button').first().waitFor({ state: 'visible', timeout: timeoutMs });
    return true;
  } catch {
    return false;
  }
}

/**
 * "수동으로 추가하기" 버튼 클릭 → 신청서 양식 1개 추가.
 * Product/Buttons.tsx 의 onAdd 버튼 → useControlProductForm.handleAddForm.
 * 이미 양식이 있다면 noop 효과 (양식 카운트 1 증가).
 */
export const addManualFormStep: StepHandler = async (page) => {
  const addBtn = page.getByRole('button', { name: /수동으로\s*추가하기/ }).first();
  try {
    await addBtn.waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'manual_add_button_missing' as ErrorKey,
      message: '"수동으로 추가하기" 버튼 미노출',
    };
  }
  const disabled = await addBtn.isDisabled().catch(() => false);
  if (disabled) {
    return {
      ok: false as const,
      error_key: 'manual_add_button_disabled' as ErrorKey,
      message: '"수동으로 추가하기" 버튼 비활성',
    };
  }
  await addBtn.click();
  await page.waitForTimeout(500);
  return { ok: true as const };
};

/**
 * Dropdown 컴포넌트 (windly-frontend-web) 동작:
 *   <DropdownInnerContainer>
 *     <SelectedBox onMouseDown=...> placeholder 또는 selected.label </SelectedBox>
 *     <OptionBox show={show}> <OptionGroup ... /> </OptionBox>
 *
 * placeholder 텍스트로 SelectedBox 찾아 클릭 → OptionGroup 안 첫 옵션 클릭.
 * 선택 후 SelectedBox 의 텍스트가 placeholder → 옵션 label 로 바뀜.
 */
/**
 * Dropdown SelectedBox 펼친 후 명시 옵션 텍스트로 클릭.
 * Option 컴포넌트: <OptionContainer><BaseOption type="radio" id="..._uid"/><Label htmlFor>...</Label></OptionContainer>.
 * label[for] 매칭 = Option 의 클릭 가능 영역.
 * placeholder click 으로 dropdown 펼치고 → option label 텍스트 click.
 */
export async function selectDropdownOption(
  page: Page,
  placeholderRe: RegExp,
  optionTextRe: RegExp,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const placeholderText = page.getByText(placeholderRe).first();
  if ((await placeholderText.count().catch(() => 0)) === 0) {
    return { ok: false, reason: `placeholder ${placeholderRe.source} 매칭 0건` };
  }
  await placeholderText.click();
  await page.waitForTimeout(400);

  // Option 의 Label 매칭. 옵션 텍스트가 OptionLabelText 안에 있음.
  // label[for^="checkbox_"] 가 아닌 dropdown option 의 label[for*="..."] 매칭.
  // 가장 안전: 펼친 직후 visible 한 OptionLabelText 텍스트 click.
  const option = page.getByText(optionTextRe).filter({ visible: true }).first();
  if ((await option.count().catch(() => 0)) === 0) {
    return { ok: false, reason: `펼친 dropdown 안 옵션 텍스트 ${optionTextRe.source} 매칭 0건` };
  }
  await option.click({ force: true });
  await page.waitForTimeout(300);
  return { ok: true };
}

/**
 * 라벨 텍스트로 체크박스/라디오 의 부모 label 또는 클릭 가능 영역 클릭.
 * Tosstoss CheckBox: <CheckBox label="…" onChange={...} /> — 컴포넌트 마크업 = label[for=...] + 텍스트.
 */
export async function toggleByLabelText(
  page: Page,
  labelRe: RegExp,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const el = page.getByText(labelRe).first();
  if ((await el.count().catch(() => 0)) === 0) {
    return { ok: false, reason: `label text ${labelRe.source} 매칭 0건` };
  }
  try {
    await el.waitFor({ state: 'visible', timeout: 5_000 });
    await el.click({ force: true });
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: `click 실패: ${String(e).slice(0, 120)}` };
  }
}

/**
 * placeholder 로 input 찾아서 값 입력 + value 검증.
 * 단순 입력 케이스의 공통 패턴 — 1383~1395, 1400~1406 등.
 */
export async function fillInputByPlaceholder(
  page: Page,
  placeholderRe: RegExp,
  value: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const input = page.getByPlaceholder(placeholderRe).first();
  const cnt = await input.count().catch(() => 0);
  if (cnt === 0) {
    return { ok: false, reason: `placeholder=${placeholderRe.source} 매칭 input 0건` };
  }
  await input.waitFor({ state: 'visible', timeout: 5_000 });
  await input.click();
  await input.fill('');
  await input.pressSequentially(value, { delay: 5 });
  await page.waitForTimeout(200);
  const got = await input.inputValue().catch(() => '');
  if (got !== value) {
    return { ok: false, reason: `입력값 불일치: 기대=${JSON.stringify(value)}, 실제=${JSON.stringify(got)}` };
  }
  return { ok: true };
}
