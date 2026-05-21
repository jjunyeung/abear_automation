/**
 * 배송대행지 진입 → "신청서 작성" → 작성 페이지에서 "주문관리에서 불러오기"
 * → 주문 1건 선택 → "불러오기" 클릭하여 모달 닫기까지.
 *
 * 대응 ATC: atcs/e2e/delivery-agency-enter-application.atc.yml
 *
 * Selector 출처 (windly-frontend-web):
 *   - src/router.tsx:114,118
 *       /delivery-agency               → <Agency />
 *       /delivery-agency/application   → <DeliveryAgencyApplication />
 *   - src/features/DeliveryAgency/index.tsx:26
 *       <Layout title="배송대행지">
 *   - src/features/DeliveryAgency/Quickstar/Order/Header/Application.tsx:32-44
 *       <Button buttonType="primary" color="blue" size="small">신청서 작성</Button>
 *       onClick → navigate('/delivery-agency/application?agency=quickstar')
 *   - src/features/DeliveryAgencyApplication/Quickstar/Product/Buttons.tsx:18
 *       <Button buttonType="secondary">주문관리에서 불러오기</Button> onClick=onLoad
 *   - src/features/DeliveryAgencyApplication/Quickstar/Product/modals/LoadProductModal/index.tsx
 *       Modal title="주문관리에서 상품 정보 불러오기"
 *             rightButtonText="불러오기"
 *             rightButtonDisabled={currentOrderList.length <= 0}
 *   - .../LoadProductModal/List/Item.tsx — Container onClick 으로 row 토글, 내부 input[type=checkbox]
 *   - .../LoadProductModal/List/index.tsx — productOrders.length<=0 시 "불러올 상품이 없어요"
 *
 * 사전조건:
 *   - 계정에 quickstar 또는 tosstoss 배송대행지 1개 이상 연결.
 *     미연결이면 Connect/DeliveryAgency 화면이 뜨고 "신청서 작성" 버튼 없음 → 실패.
 *   - 주문관리에 status=ACCEPT|INSTRUCT, receiverType=CUSTOMS 인 주문 1건 이상 존재.
 *     미존재 시 LoadProductModal 에 "불러올 상품이 없어요" 노출되어 select_first_order 에서 fail.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'delivery-agency',
  'delivery-agency-enter-application.atc.yml',
);

const DELIVERY_AGENCY_URL = 'https://app.windly.cc/view3/delivery-agency';

const openDeliveryAgencyStep: StepHandler = async (page, _inputs) => {
  await page.goto(DELIVERY_AGENCY_URL, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });

  // SPA client-side hydrate 안정화.
  await page.waitForTimeout(1_500);

  const cur = page.url();
  if (!/\/view3\/delivery-agency(\?|$)/.test(cur)) {
    return {
      ok: false as const,
      error_key: 'delivery_agency_navigate_failed' as ErrorKey,
      message: `goto 후 url 이 /view3/delivery-agency 가 아님 — 현재 url: ${cur}`,
    };
  }

  // Layout title="배송대행지" — Layout 컴포넌트가 페이지 헤더에 노출.
  // 사이드바 메뉴 텍스트와 동일 — 첫 매치만 검증 (둘 다 보이면 페이지 정상).
  const titleVisible = await page
    .getByText('배송대행지', { exact: true })
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 })
    .then(() => true)
    .catch(() => false);

  if (!titleVisible) {
    return {
      ok: false as const,
      error_key: 'delivery_agency_title_not_visible' as ErrorKey,
      message: `'배송대행지' 타이틀이 15초 내 visible 되지 않음`,
    };
  }

  return { ok: true as const };
};

const clickApplyFormStep: StepHandler = async (page, _inputs) => {
  // Quickstar Order Header 의 primary 버튼.
  // 동일 텍스트 ("신청서 작성") 가 Stock EmptyView 에도 있으므로 visible 한 첫 매치.
  // exact: true 로 정확 매치 (다른 button 의 부분 텍스트와 충돌 방지).
  const applyBtn = page
    .getByRole('button', { name: '신청서 작성', exact: true })
    .first();

  const visible = await applyBtn
    .waitFor({ state: 'visible', timeout: 15_000 })
    .then(() => true)
    .catch(() => false);

  if (!visible) {
    return {
      ok: false as const,
      error_key: 'apply_form_button_not_found' as ErrorKey,
      message:
        '"신청서 작성" 버튼이 15초 내 visible 되지 않음. 배송대행지가 미연결 상태(isAllDisconnected)일 가능성 — Connect 화면이 노출되면 이 버튼은 렌더되지 않는다.',
    };
  }

  await applyBtn.scrollIntoViewIfNeeded();
  await applyBtn.click();
  return { ok: true as const };
};

const waitApplicationPageStep: StepHandler = async (page, _inputs) => {
  try {
    await page.waitForURL(/\/view3\/delivery-agency\/application/, {
      timeout: 30_000,
    });
  } catch {
    return {
      ok: false as const,
      error_key: 'application_page_not_reached' as ErrorKey,
      message: `버튼 클릭 후 /view3/delivery-agency/application URL 도달 실패. 현재 URL: ${page.url()}`,
    };
  }

  await page
    .waitForLoadState('domcontentloaded', { timeout: 30_000 })
    .catch(() => undefined);

  // SPA mount 안정화.
  await page.waitForTimeout(1_500);

  // 페이지가 깨지지 않았는지 — body 안에 텍스트 노드가 1개 이상.
  const bodyText = (await page.locator('body').innerText()).trim();
  if (bodyText.length === 0) {
    return {
      ok: false as const,
      error_key: 'application_page_empty' as ErrorKey,
      message:
        'application 페이지 mount 후 body 텍스트 0자 — SPA render 실패 가능',
    };
  }

  logger.info(
    `[delivery-agency-enter-application] 작성 페이지 진입 성공: ${page.url()}, body 텍스트 길이=${bodyText.length}`,
  );
  return { ok: true as const };
};

// ─────────────────────────────────────────────────────────────────────────────
// LoadProductModal 관련 step handlers
// ─────────────────────────────────────────────────────────────────────────────

const LOAD_MODAL_TITLE = '주문관리에서 상품 정보 불러오기';
const EMPTY_ORDERS_TEXT = '불러올 상품이 없어요';

const clickLoadFromOrdersStep: StepHandler = async (page, _inputs) => {
  // Quickstar Product Buttons.tsx 의 secondary 버튼.
  // exact: true 로 "재고에서 불러오기" 등과 분리.
  const loadBtn = page
    .getByRole('button', { name: '주문관리에서 불러오기', exact: true })
    .first();

  const visible = await loadBtn
    .waitFor({ state: 'visible', timeout: 15_000 })
    .then(() => true)
    .catch(() => false);

  if (!visible) {
    return {
      ok: false as const,
      error_key: 'load_from_orders_button_not_found' as ErrorKey,
      message: '"주문관리에서 불러오기" 버튼이 15초 내 visible 되지 않음',
    };
  }

  await loadBtn.scrollIntoViewIfNeeded();
  await loadBtn.click();
  return { ok: true as const };
};

const waitLoadModalStep: StepHandler = async (page, _inputs) => {
  // (1) 모달 타이틀 visible 대기.
  const modalTitle = page.getByText(LOAD_MODAL_TITLE, { exact: true }).first();
  const titleVisible = await modalTitle
    .waitFor({ state: 'visible', timeout: 15_000 })
    .then(() => true)
    .catch(() => false);

  if (!titleVisible) {
    return {
      ok: false as const,
      error_key: 'load_modal_not_opened' as ErrorKey,
      message: `LoadProductModal 타이틀('${LOAD_MODAL_TITLE}') 이 15초 내 visible 되지 않음`,
    };
  }

  // (2) 리스트 mount 대기 — 빈 메시지 또는 첫 Item checkbox 등장 둘 중 하나.
  //     주의: 모달의 "같은 주문서에 있는 상품 모두 불러오기" Toggle 도 input[type=checkbox] 사용
  //     (Toggle/style.ts BaseToggle = styled.input). 따라서 Item 의 checkbox 만 잡으려면
  //     .checkbox className wrapper 로 scope (Item.tsx 의 <div className="checkbox">).
  const empty = page.getByText(EMPTY_ORDERS_TEXT, { exact: true });
  const orderCheckbox = page.locator('div.checkbox input[type="checkbox"]');

  const start = Date.now();
  while (Date.now() - start < 15_000) {
    if (await empty.isVisible().catch(() => false)) break;
    if ((await orderCheckbox.count()) > 0) break;
    await page.waitForTimeout(400);
  }

  // 리스트도 빈 메시지도 둘 다 안 뜨면 mount 실패.
  const hasEmpty = await empty.isVisible().catch(() => false);
  const orderCheckboxCount = await orderCheckbox.count();
  if (!hasEmpty && orderCheckboxCount === 0) {
    return {
      ok: false as const,
      error_key: 'load_modal_list_not_rendered' as ErrorKey,
      message:
        'LoadProductModal 열림은 확인됐으나 div.checkbox 안 input 도 빈 메시지도 15초 내 안 뜸',
    };
  }

  logger.info(
    `[delivery-agency] LoadProductModal mount 완료 — empty=${hasEmpty}, order checkbox=${orderCheckboxCount}`,
  );
  return { ok: true as const };
};

const selectFirstOrderStep: StepHandler = async (page, _inputs) => {
  // 빈 상태면 즉시 fail.
  const empty = page.getByText(EMPTY_ORDERS_TEXT, { exact: true });
  if (await empty.isVisible().catch(() => false)) {
    return {
      ok: false as const,
      error_key: 'no_orders_to_load' as ErrorKey,
      message: `LoadProductModal 에 빈 메시지 ('${EMPTY_ORDERS_TEXT}') — 주문관리에 status=ACCEPT|INSTRUCT, receiverType=CUSTOMS 인 주문이 없음`,
    };
  }

  // 첫 번째 Item 의 checkbox.
  // 주의: Toggle 컴포넌트도 input[type=checkbox] — 따라서 Item 의 .checkbox wrapper 로 scope.
  // CheckBoxInput 은 display:none → label 또는 row Container 클릭으로 우회.
  // Container.onClick 은 preventDefault 로 label 의 default toggle 을 취소하고 자체 onHandleOrderItem 호출.
  const firstOrderCheckbox = page
    .locator('div.checkbox input[type="checkbox"]')
    .first();
  const checkboxCount = await firstOrderCheckbox.count();
  if (checkboxCount === 0) {
    return {
      ok: false as const,
      error_key: 'order_checkbox_not_in_dom' as ErrorKey,
      message: 'div.checkbox 안 input[type=checkbox] 가 DOM 에 0개 — 리스트 mount 안 됨',
    };
  }

  // input 의 가장 가까운 ancestor label = CheckBoxContainer.
  const firstCheckboxLabel = firstOrderCheckbox.locator('xpath=ancestor::label[1]');
  await firstCheckboxLabel.click();

  // 검증 = input.checked 가 아니라 모달의 "불러오기" 버튼이 enabled 가 되는 것.
  // (Container.onClick 의 preventDefault 가 label 의 default toggle 을 취소해서
  //  input.checked 는 false 일 수 있지만 React 의 currentOrderList 는 갱신되어 button 이 enabled.)
  const loadConfirmBtn = page
    .getByRole('button', { name: '불러오기', exact: true })
    .first();

  const start = Date.now();
  while (Date.now() - start < 5_000) {
    const isDisabled = await loadConfirmBtn.isDisabled().catch(() => true);
    if (!isDisabled) return { ok: true as const };
    await page.waitForTimeout(200);
  }

  return {
    ok: false as const,
    error_key: 'order_not_selected' as ErrorKey,
    message:
      'label click 후 5초 내에도 모달 "불러오기" 버튼이 enabled 되지 않음 — currentOrderList 미갱신 추정',
  };
};

const clickLoadButtonStep: StepHandler = async (page, _inputs) => {
  // exact: true → "주문관리에서 불러오기" / "재고에서 불러오기" 와 충돌 회피.
  const loadConfirmBtn = page
    .getByRole('button', { name: '불러오기', exact: true })
    .first();

  const visible = await loadConfirmBtn
    .waitFor({ state: 'visible', timeout: 10_000 })
    .then(() => true)
    .catch(() => false);

  if (!visible) {
    return {
      ok: false as const,
      error_key: 'load_confirm_button_not_found' as ErrorKey,
      message: '모달의 "불러오기" right primary 버튼이 10초 내 visible 되지 않음',
    };
  }

  // disabled 상태 확인 — rightButtonDisabled={currentOrderList.length <= 0}
  const isDisabled = await loadConfirmBtn.isDisabled().catch(() => false);
  if (isDisabled) {
    return {
      ok: false as const,
      error_key: 'load_confirm_button_disabled' as ErrorKey,
      message: '"불러오기" 버튼이 disabled — 주문 선택 상태 미반영 가능',
    };
  }

  await loadConfirmBtn.click();

  // 모달 닫힘 대기 — 타이틀 hidden.
  const modalTitle = page.getByText(LOAD_MODAL_TITLE, { exact: true }).first();
  const closed = await modalTitle
    .waitFor({ state: 'hidden', timeout: 15_000 })
    .then(() => true)
    .catch(() => false);

  if (!closed) {
    return {
      ok: false as const,
      error_key: 'load_modal_not_closed' as ErrorKey,
      message: `"불러오기" 클릭 후에도 LoadProductModal 타이틀이 15초 내 hidden 되지 않음`,
    };
  }

  logger.info('[delivery-agency] LoadProductModal 닫힘 — 주문 불러오기 완료');
  return { ok: true as const };
};

// ─────────────────────────────────────────────────────────────────────────────
// 상품 카테고리(HS) Dropdown 관련 step handlers
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_LABEL = '상품 카테고리(HS)';
const DROPDOWN_SEARCH_PLACEHOLDER = '검색하기';
const SEARCH_QUERY = '의자';

const openCategoryDropdownStep: StepHandler = async (page, _inputs) => {
  // InputForm.tsx 의 <Dropdown label="상품 카테고리(HS)"> — View/Item.tsx 는 "상품 카테고리"
  // (괄호 없음) 로 read-only 표시이므로 (HS) 까지 매칭하면 정확.
  const labelText = page.getByText(CATEGORY_LABEL).first();
  const visible = await labelText
    .waitFor({ state: 'visible', timeout: 20_000 })
    .then(() => true)
    .catch(() => false);

  if (!visible) {
    return {
      ok: false as const,
      error_key: 'category_dropdown_label_not_found' as ErrorKey,
      message: `"${CATEGORY_LABEL}" 라벨이 20초 내 visible 안 됨 — 신청서 폼이 mount 안 됐거나 InputForm 미렌더`,
    };
  }

  // Dropdown DOM:
  //   <DropdownContainer>      ← div
  //     <LabelBox>{label}+*</LabelBox>     ← div containing label text
  //     <DropdownInnerContainer>           ← div
  //       <SelectedBox = button>...        ← trigger
  //       <OptionBox>...</OptionBox>
  //     </DropdownInnerContainer>
  //   </DropdownContainer>
  // → label 의 closest 조상 div 중 button 을 후손으로 가진 첫 매치 = DropdownContainer.
  const trigger = labelText
    .locator('xpath=ancestor::div[.//button][1]//button')
    .first();
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  return { ok: true as const };
};

const searchChairInCategoryStep: StepHandler = async (page, _inputs) => {
  // OptionGroup 의 <SearhTextField placeholder="검색하기"> (autoFocus). 한 번에 한 개만 visible.
  const searchInput = page.getByPlaceholder(DROPDOWN_SEARCH_PLACEHOLDER).first();
  const visible = await searchInput
    .waitFor({ state: 'visible', timeout: 10_000 })
    .then(() => true)
    .catch(() => false);

  if (!visible) {
    return {
      ok: false as const,
      error_key: 'category_search_input_not_visible' as ErrorKey,
      message: `드롭다운 검색 input (placeholder=${DROPDOWN_SEARCH_PLACEHOLDER}) 이 10초 내 visible 안 됨 — 드롭다운 미오픈 추정`,
    };
  }

  await searchInput.fill(SEARCH_QUERY);

  // useGetFreightForwardingMetaData 는 q=debouncedSearchText (500ms debounce) 로 API 호출.
  // 응답 후 metaDataOptions 갱신 → OptionGroup 이 옵션 렌더 + showSearchResult=true 로 "검색 결과" 타이틀.
  // 결과 옵션 label 텍스트는 [HSCode] 한국어명 형태 — 한국어명에 의자 포함 시 매치.
  //
  // 주의 (race): 입력 직후 ~500ms 동안 metaDataOptions 가 비어 있어 "검색 결과 없음" 이 잠깐 보임.
  //   그 후 SpinLoader → 결과 또는 진짜 검색 결과 없음. → 3초 grace 까지는 noResult 무시.
  const optionWithChair = page
    .locator('label')
    .filter({ hasText: SEARCH_QUERY });
  const noResult = page.getByText('검색 결과 없음', { exact: true });

  const start = Date.now();
  while (Date.now() - start < 10_000) {
    if ((await optionWithChair.count()) > 0) {
      logger.info(
        `[delivery-agency] 카테고리 검색 결과 옵션 ${await optionWithChair.count()}개 mount`,
      );
      return { ok: true as const };
    }
    if (
      Date.now() - start > 3_000 &&
      (await noResult.isVisible().catch(() => false))
    ) {
      return {
        ok: false as const,
        error_key: 'no_category_search_result' as ErrorKey,
        message: `"${SEARCH_QUERY}" 검색 결과 없음 (HS code metadata 에 매칭 안 됨)`,
      };
    }
    await page.waitForTimeout(300);
  }

  return {
    ok: false as const,
    error_key: 'category_search_timeout' as ErrorKey,
    message: `"${SEARCH_QUERY}" 검색 결과 옵션이 10초 내 mount 안 됨`,
  };
};

const selectFirstCategoryResultStep: StepHandler = async (page, _inputs) => {
  // 첫 옵션 label — Option/index.tsx 의 <Label htmlFor=id> (label semantics 로 hidden radio toggle).
  const firstOption = page
    .locator('label')
    .filter({ hasText: SEARCH_QUERY })
    .first();
  const visible = await firstOption
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);

  if (!visible) {
    return {
      ok: false as const,
      error_key: 'first_category_option_not_visible' as ErrorKey,
      message: `"${SEARCH_QUERY}" 검색 결과 첫 옵션 label 이 5초 내 visible 안 됨`,
    };
  }

  await firstOption.click();

  // 드롭다운 자동 닫힘 — OptionGroup.onChange 에서 setShow(false). 검색 input hidden 으로 검증.
  const searchInput = page.getByPlaceholder(DROPDOWN_SEARCH_PLACEHOLDER).first();
  const closed = await searchInput
    .waitFor({ state: 'hidden', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);

  if (!closed) {
    return {
      ok: false as const,
      error_key: 'category_dropdown_not_closed' as ErrorKey,
      message: `옵션 click 후 드롭다운이 5초 내 닫히지 않음 (검색 input visible)`,
    };
  }

  logger.info('[delivery-agency] 카테고리 옵션 선택 + 드롭다운 닫힘');
  return { ok: true as const };
};

// ─────────────────────────────────────────────────────────────────────────────
// 주의사항 동의 → 신청 완료 → 리스트 검증 step handlers
// ─────────────────────────────────────────────────────────────────────────────

const CAUTION_LABEL_TEXT = '주의사항에 동의';
const SUBMIT_BUTTON_NAME = /신청\s*완료/;
// 성공 후 navigate 는 /view3/delivery-agency?deliveryStatus=AWAITING_ARRIVAL 이지만,
// useControlDeliveryAgencyTab 가 즉시 ?deliveryAgency=QUICKSTAR 로 URL 을 덮어씀.
// → /view3/delivery-agency 자체가 매칭되되 /application 은 제외.
const AWAITING_LIST_URL_RE = /\/view3\/delivery-agency(?!\/application)/;

const agreeCautionStep: StepHandler = async (page, _inputs) => {
  // 페이지 맨 밑으로 스크롤 — Caution 섹션은 페이지 하단 (Quickstar/index.tsx:355-357 의 마지막 컴포넌트들 중 하나).
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);

  // 주의사항 동의 체크박스 — Caution.tsx 의 <CheckBox label="모든 내용을 확인했으며, 주의사항에 동의합니다." />.
  // CheckBoxContainer 가 styled.label, 부모 onClick 없음 (Item.tsx 케이스와 다름) → label click 으로 정상 toggle.
  const cautionLabel = page
    .locator('label')
    .filter({ hasText: CAUTION_LABEL_TEXT })
    .first();

  const visible = await cautionLabel
    .waitFor({ state: 'visible', timeout: 10_000 })
    .then(() => true)
    .catch(() => false);

  if (!visible) {
    return {
      ok: false as const,
      error_key: 'caution_checkbox_not_found' as ErrorKey,
      message: `주의사항 동의 체크박스 (label hasText=${CAUTION_LABEL_TEXT}) 가 10초 내 visible 안 됨`,
    };
  }

  await cautionLabel.scrollIntoViewIfNeeded();
  await cautionLabel.click();

  // 검증 = 신청 완료 버튼이 enabled 로 전환. (체크박스 input.checked 는 display:none 으로 검증 어려움.)
  const submitBtn = page.getByRole('button', { name: SUBMIT_BUTTON_NAME }).first();
  const start = Date.now();
  while (Date.now() - start < 5_000) {
    const isDisabled = await submitBtn.isDisabled().catch(() => true);
    if (!isDisabled) {
      logger.info('[delivery-agency] 주의사항 동의 → 신청 완료 버튼 enabled');
      return { ok: true as const };
    }
    await page.waitForTimeout(200);
  }

  return {
    ok: false as const,
    error_key: 'submit_button_still_disabled' as ErrorKey,
    message: '주의사항 동의 클릭 후 5초 내에도 신청 완료 버튼이 enabled 안 됨 — isCautionAgree 미갱신 추정',
  };
};

/**
 * 신청 완료 버튼을 1회 클릭하고 배송대행지 메인 페이지로 랜딩되는지 검증.
 *
 * Note (2026-05-14): 백엔드가 간헐적으로 WS1014 응답으로 "다시 클릭해 주세요" 토스트만
 *   띄우고 신청서가 등록 안 되는 이슈가 ATC 자동화에서 발견됨 (자세한 내용은
 *   bug-report-delivery-agency-WS1014.md). 자동 retry 는 진짜 백엔드 정상화 여부를 가리므로
 *   하지 않고, WS1014 토스트가 뜨면 즉시 fail 로 백엔드 이슈를 신호한다.
 */
const clickSubmitAndLandStep: StepHandler = async (page, _inputs) => {
  const submitBtn = page.getByRole('button', { name: SUBMIT_BUTTON_NAME }).first();
  const visible = await submitBtn
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);

  if (!visible) {
    return {
      ok: false as const,
      error_key: 'submit_button_not_visible' as ErrorKey,
      message: '신청 완료 버튼이 5초 내 visible 안 됨',
    };
  }

  await submitBtn.scrollIntoViewIfNeeded();
  await submitBtn.click();

  // 토스트 selectors (백엔드 응답 시그널). 토스트 duration 기본 3초 — 빨리 캡처.
  const retryToast = page.getByText('신청 완료 버튼을 다시 클릭해주세요', { exact: false }).first();
  const validationToast = page.getByText('신청서를 확인해주세요.', { exact: false }).first();
  const apiFailToast = page.getByText('배대지 그룹 신청에 실패', { exact: false }).first();

  // 30초 polling: URL 전환 (= 성공) OR 알려진 에러 토스트 (= fail with 신호).
  const start = Date.now();
  while (Date.now() - start < 30_000) {
    if (AWAITING_LIST_URL_RE.test(page.url())) {
      await page
        .waitForLoadState('domcontentloaded', { timeout: 15_000 })
        .catch(() => undefined);
      logger.info(`[delivery-agency] 신청 완료 → 배송대행지 메인 랜딩: ${page.url()}`);
      return { ok: true as const };
    }
    if (await retryToast.isVisible().catch(() => false)) {
      logger.error(
        '[delivery-agency] WS1014 — 백엔드가 "신청 완료 버튼을 다시 클릭해주세요" 응답. bug-report-delivery-agency-WS1014.md 참조.',
      );
      return {
        ok: false as const,
        error_key: 'submit_ws1014_retry_required' as ErrorKey,
        message:
          '백엔드 WS1014 — 신청 완료 토스트만 노출되고 신청서가 등록 안 됨. 자세한 분석은 bug-report-delivery-agency-WS1014.md.',
      };
    }
    if (await validationToast.isVisible().catch(() => false)) {
      const fieldErrors = await page
        .getByText(/필수 입력 항목이에요\.|제대로 입력했는지/)
        .allInnerTexts()
        .catch(() => []);
      return {
        ok: false as const,
        error_key: 'submit_validation_failed' as ErrorKey,
        message: `validation 실패 — 필드 에러: ${JSON.stringify(fieldErrors)}`,
      };
    }
    if (await apiFailToast.isVisible().catch(() => false)) {
      return {
        ok: false as const,
        error_key: 'submit_api_failed' as ErrorKey,
        message: '배대지 그룹 신청 API 실패 토스트',
      };
    }
    await page.waitForTimeout(300);
  }

  return {
    ok: false as const,
    error_key: 'submit_navigate_timeout' as ErrorKey,
    message: `30초 내 배송대행지 메인 화면 (/view3/delivery-agency) 으로 랜딩 안 됨. 현재 URL: ${page.url()}`,
  };
};

const handlers: StepHandlers = {
  open_delivery_agency: openDeliveryAgencyStep,
  click_apply_form: clickApplyFormStep,
  wait_application_page: waitApplicationPageStep,
  click_load_from_orders: clickLoadFromOrdersStep,
  wait_load_modal: waitLoadModalStep,
  select_first_order: selectFirstOrderStep,
  click_load_button: clickLoadButtonStep,
  open_category_dropdown: openCategoryDropdownStep,
  search_chair_in_category: searchChairInCategoryStep,
  select_first_category_result: selectFirstCategoryResultStep,
  agree_caution: agreeCautionStep,
  click_submit_and_land: clickSubmitAndLandStep,
};

test('배송대행지 → 신청서 작성 → 카테고리 선택 → 동의 → 신청 완료 + 메인 화면 랜딩', async ({
  page,
}) => {
  test.setTimeout(3 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
