# ATC 수정/개선 가능 항목 리포트

분석 대상: `atcs/**/*.atc.yml` (189 ATCs) + 대응 `tests/**/*.spec.ts` (189 files)

## 요약 — 우선순위별

| # | 카테고리 | 영향 ATC | 개선 효과 |
|---|---|---:|---|
| 🔥 1 | **da-cascade-* 통합** | 27 → 1 | spec.ts ~2,160 라인 → ~100 라인 (95% 감소) |
| 🔥 2 | **import-direct-*-popup 통합** | 21 → 1 | spec.ts ~1,050 라인 → ~80 라인 |
| 🔥 3 | **da-input-* 통합** | 16 → 1 | 같은 핸들러 반복 |
| 🟡 4 | **registered-delete-modal-only-* 통합** | 5 → 1 | 마켓별 5개 ATC를 1개로 |
| 🟡 5 | **bulk-edit-* spec.ts 헬퍼 추출** | 21 ATCs | 같은 setup 21번 반복됨 |
| 🟡 6 | **expected 필드 보강** | 17 ATCs | D3 스키마 권장 필드 누락 |
| 🟢 7 | **import-direct step.id 정규화** | 3 변형 | tmall/taobao 가 다른 step.id 사용 |
| 🟢 8 | **e2e compound step 분해** | 6 ATCs | 가독성/리포트 정밀도 |
| 🟢 9 | **outputs 선언 + 체인 확장** | 9 ATCs | URL/ID input 받지만 다음 TC 로 전달 안 됨 |
| 🟢 10 | **composes 도입** | 0 → ? | 큰 e2e 시나리오를 조각 ATC 조합으로 |

---

## 1. 🔥 `da-cascade-1412..1438` 27개 통합 (최대 효과)

**현황**: 27개 ATC + 27개 spec.ts. 모두 같은 step 시그니처:
`['open_tosstoss_application', 'add_manual_form', 'select_region', 'select_shipping', 'select_customs', 'verify_additional_disabled']`

**차이**: 칭다오/위해/평택/연태 등 region × 운송방법 × 통관방법 의 조합값만 다름.

**제안**:
```yaml
# atcs/settings/da-cascade.atc.yml (단일 파일)
title: 배송대행지 토스토스 신청서 옵션 조건부 검증
inputs:
  region: { type: string, example: '칭다오' }
  shipping: { type: string, example: '허브넷해상|해운' }
  customs: { type: string, example: '목록통관' }
  expect_additional_disabled: { type: boolean, example: true }
steps: [...]  # 그대로
```

**실행**:
```bash
npm run atc -- atcs/settings/da-cascade.atc.yml --region=칭다오 --shipping='허브넷해상|해운' --customs=목록통관
```

**또는 fixture 테이블** (spec.ts 안에서):
```ts
const CASES = [
  { region: '칭다오', shipping: '허브넷해상|해운', customs: '목록통관' },
  { region: '칭다오', shipping: '허브넷해상|해운', customs: '일반통관|사업자통관' },
  // ... 27건
];
for (const c of CASES) test(`${c.region}/${c.shipping}/${c.customs}`, ...)
```

**대상 파일**:
- atcs/settings/da-cascade-1412.atc.yml  →  `배송대행지 토스토스 칭다오 허브넷해상|해운 목록통관 옵션 검증`
- atcs/settings/da-cascade-1413.atc.yml  →  `배송대행지 토스토스 칭다오 허브넷해상|해운 일반통관|사업자통관 옵션 검증`
- atcs/settings/da-cascade-1414.atc.yml  →  `배송대행지 토스토스 칭다오 허브넷해상|해운 화물사업자통관 옵션 검증`
- atcs/settings/da-cascade-1415.atc.yml  →  `배송대행지 토스토스 칭다오 자이언트해상 목록통관 옵션 검증`
- atcs/settings/da-cascade-1416.atc.yml  →  `배송대행지 토스토스 칭다오 자이언트해상 일반통관|사업자통관 옵션 검증`
- atcs/settings/da-cascade-1417.atc.yml  →  `배송대행지 토스토스 칭다오 항공 목록통관 옵션 검증`
- atcs/settings/da-cascade-1418.atc.yml  →  `배송대행지 토스토스 칭다오 항공 일반통관|사업자통관 옵션 검증`
- atcs/settings/da-cascade-1419.atc.yml  →  `배송대행지 토스토스 광저우 해운 목록통관 옵션 검증`
- atcs/settings/da-cascade-1420.atc.yml  →  `배송대행지 토스토스 광저우 해운 일반통관|사업자통관 옵션 검증`
- atcs/settings/da-cascade-1421.atc.yml  →  `배송대행지 토스토스 광저우 해운 화물사업자통관 옵션 검증`
- atcs/settings/da-cascade-1422.atc.yml  →  `배송대행지 토스토스 광저우 항공 목록통관 옵션 검증`
- atcs/settings/da-cascade-1423.atc.yml  →  `배송대행지 토스토스 광저우 항공 일반통관|사업자통관 옵션 검증`
- atcs/settings/da-cascade-1424.atc.yml  →  `배송대행지 토스토스 광저우 알뜰항공 목록통관 옵션 검증`
- atcs/settings/da-cascade-1425.atc.yml  →  `배송대행지 토스토스 광저우 알뜰항공 일반통관|사업자통관 옵션 검증`
- atcs/settings/da-cascade-1426.atc.yml  →  `배송대행지 토스토스 웨이하이B2B|웨이하이|B2B 해운 목록통관 옵션 검증`
- atcs/settings/da-cascade-1427.atc.yml  →  `배송대행지 토스토스 웨이하이B2B|웨이하이|B2B 해운 일반통관|사업자통관 옵션 검증`
- atcs/settings/da-cascade-1428.atc.yml  →  `배송대행지 토스토스 웨이하이B2B|웨이하이|B2B 해운 화물사업자통관 옵션 검증`
- atcs/settings/da-cascade-1429.atc.yml  →  `배송대행지 토스토스 웨이하이B2B|웨이하이|B2B 평택해운 목록통관 옵션 검증`
- atcs/settings/da-cascade-1430.atc.yml  →  `배송대행지 토스토스 웨이하이B2B|웨이하이|B2B 평택해운 일반통관|사업자통관 옵션 검증`
- atcs/settings/da-cascade-1431.atc.yml  →  `배송대행지 토스토스 웨이하이B2B|웨이하이|B2B 항공 목록통관 옵션 검증`
- atcs/settings/da-cascade-1432.atc.yml  →  `배송대행지 토스토스 웨이하이B2B|웨이하이|B2B 항공 일반통관|사업자통관 옵션 검증`
- atcs/settings/da-cascade-1433.atc.yml  →  `배송대행지 토스토스 오리건 항공 목록통관|일반통관|사업자통관 옵션 검증`
- atcs/settings/da-cascade-1434.atc.yml  →  `배송대행지 토스토스 캘리포니아 항공 목록통관|일반통관|사업자통관 옵션 검증`
- atcs/settings/da-cascade-1435.atc.yml  →  `배송대행지 토스토스 영국 항공 목록통관|일반통관|사업자통관 옵션 검증`
- atcs/settings/da-cascade-1436.atc.yml  →  `배송대행지 토스토스 독일 항공 목록통관|일반통관|사업자통관 옵션 검증`
- atcs/settings/da-cascade-1437.atc.yml  →  `배송대행지 토스토스 도쿄 항공 목록통관|일반통관 옵션 검증`
- atcs/settings/da-cascade-1438.atc.yml  →  `배송대행지 토스토스 도쿄 항공 사업자통관 옵션 검증`

---

## 2. 🔥 `import-direct-*-popup` 21개 통합

**현황**: 21개 ATC. 19개는 `click_mall_verify_popup` step, 1개는 `click_tmall_verify_popup`, 1개는 `click_taobao_verify_popup` 사용 — step.id 불일치도 함께 정리 필요.

**spec.ts 측정**: `import-direct-1688-popup.spec.ts` 45줄 vs `import-direct-taobao-popup.spec.ts` 63줄. 거의 동일.

**제안**:
```yaml
# atcs/collect/import-direct-popup.atc.yml
title: 상품 수집 - <market> 버튼 클릭 시 새 창 열림 검증
inputs:
  market: { type: string, example: 'taobao', description: '1688/aliexpress/amazon-us/.../tmall/taobao/...' }
  expected_hostname_regex: { type: string, example: '.*taobao\.com$' }
steps:
  - { id: open_collect_menu, do: '상품 수집 메뉴 진입' }
  - { id: click_market_popup, do: '<market> 버튼 클릭, 새 탭 열리고 hostname 매칭 확인' }
```

**대상 파일** (21건):
- atcs/collect/import-direct-1688-aibuy-popup.atc.yml
- atcs/collect/import-direct-1688-popup.atc.yml
- atcs/collect/import-direct-aliexpress-popup.atc.yml
- atcs/collect/import-direct-amazon-ca-popup.atc.yml
- atcs/collect/import-direct-amazon-de-popup.atc.yml
- atcs/collect/import-direct-amazon-es-popup.atc.yml
- atcs/collect/import-direct-amazon-fr-popup.atc.yml
- atcs/collect/import-direct-amazon-in-popup.atc.yml
- atcs/collect/import-direct-amazon-it-popup.atc.yml
- atcs/collect/import-direct-amazon-jp-popup.atc.yml
- atcs/collect/import-direct-amazon-mx-popup.atc.yml
- atcs/collect/import-direct-amazon-uk-popup.atc.yml
- atcs/collect/import-direct-amazon-us-popup.atc.yml
- atcs/collect/import-direct-domeggook-popup.atc.yml
- atcs/collect/import-direct-domeme-popup.atc.yml
- atcs/collect/import-direct-ownerclan-popup.atc.yml
- atcs/collect/import-direct-rakuten-popup.atc.yml
- atcs/collect/import-direct-taobao-popup.atc.yml
- atcs/collect/import-direct-temu-popup.atc.yml
- atcs/collect/import-direct-tmall-popup.atc.yml
- atcs/collect/import-direct-vvic-popup.atc.yml

---

## 3. 🔥 `da-input-*` 16개 통합 (15/16 동일 구조)

**현황**: 15개는 `['open_tosstoss_application', 'add_manual_form', 'fill_and_verify']` 사용. 1개 (`da-input-center-request`) 만 다른 step.

**제안**: 입력 필드 ID + value 를 input 으로 받는 단일 ATC.

**대상 파일**:
- atcs/settings/da-input-address-detail.atc.yml  →  `배송대행지 토스토스 신청서 상세주소 입력 검증`
- atcs/settings/da-input-address.atc.yml  →  `배송대행지 토스토스 신청서 주소 입력 검증`
- atcs/settings/da-input-brand-model.atc.yml  →  `배송대행지 토스토스 신청서 브랜드 및 모델명 입력 검증`
- atcs/settings/da-input-center-request.atc.yml  →  `배송대행지 토스토스 물류센터 요청사항 입력 검증`
- atcs/settings/da-input-color.atc.yml  →  `배송대행지 토스토스 신청서 색상 입력 검증`
- atcs/settings/da-input-customs-id.atc.yml  →  `배송대행지 토스토스 신청서 개인통관고유부호 입력 검증`
- atcs/settings/da-input-free-text-request.atc.yml  →  `배송대행지 토스토스 신청서 직접입력 요청사항 입력 검증`
- atcs/settings/da-input-purchase-order-no.atc.yml  →  `배송대행지 토스토스 신청서 구매 주문번호 입력 검증`
- atcs/settings/da-input-purchase-url.atc.yml  →  `배송대행지 토스토스 신청서 구매 사이트 URL 입력 검증`
- atcs/settings/da-input-quantity.atc.yml  →  `배송대행지 토스토스 신청서 수량 입력 검증`
- atcs/settings/da-input-receiver-name.atc.yml  →  `배송대행지 토스토스 신청서 이름 (수령인) 입력 검증`
- atcs/settings/da-input-receiver-phone.atc.yml  →  `배송대행지 토스토스 신청서 연락처 입력 검증`
- atcs/settings/da-input-size.atc.yml  →  `배송대행지 토스토스 신청서 사이즈 입력 검증`
- atcs/settings/da-input-tracking-number.atc.yml  →  `배송대행지 토스토스 신청서 트래킹번호 입력 검증`
- atcs/settings/da-input-unit-price.atc.yml  →  `배송대행지 토스토스 신청서 단가 입력 검증`
- atcs/settings/da-input-zip-code.atc.yml  →  `배송대행지 토스토스 신청서 우편번호 입력 검증`

---

## 4. 🟡 `registered-delete-modal-only-*` 5개 통합

**현황**: coupang/esm/lotte-on/smartstore/street 5개 마켓 단독 체크 시나리오. 동일 step 시그니처.

**제안**: `inputs.market: 'coupang'|'esm'|'lotte_on'|'smartstore'|'street'` 로 통합.

**대상 파일**:
- atcs/upload/registered-delete-modal-only-coupang.atc.yml
- atcs/upload/registered-delete-modal-only-esm.atc.yml
- atcs/upload/registered-delete-modal-only-lotte-on.atc.yml
- atcs/upload/registered-delete-modal-only-smartstore.atc.yml
- atcs/upload/registered-delete-modal-only-street.atc.yml

---

## 5. 🟡 `bulk-edit-*` (21개) spec.ts 공통 setup 추출

**현황**: 21개 ATC. step 시그니처는 다양하지만 모두 `['open_registered_list', 'select_first_product', 'click_bulk_edit_button', ...]` 의 setup 3 step 을 공유.

**제안 (spec.ts 측 리팩토링)**:
- `tests/upload/_bulk-edit-setup.ts` 추출: setup 3-step 핸들러 export
- 각 spec.ts 는 setup 을 import 하고 자기만의 verify step 만 정의
- ATC YAML 은 그대로 유지 (시나리오 분리가 가독성 더 좋음)

**또는** REFACTOR §3 `composes` 활용:
```yaml
# atcs/upload/bulk-edit-all-checkbox-visible.atc.yml
composes:
  - ./_bulk-edit-modal-open.atc.yml   # 공통 진입
steps:
  - id: verify_all_checkbox_visible
    do: 전체 선택 체크박스 노출 검증
```

---

## 6. 🟡 `expected` 필드 누락 ATC (17개)

D3 스키마는 `expected` 를 권장 (선택이지만 리포트에서 종합 결과 기대 라인으로 사용). 추가 권장.

| Path | Title |
|---|---|
| atcs/collect/ai-recommend-category.atc.yml | 수집상품 첫 카드 → AI 카테고리 추천 → 호출 성공 확인 |
| atcs/collect/ai-recommend-name.atc.yml | 수집상품 첫 카드 → AI 상품명 추천 → input 값 변경 확인 |
| atcs/collect/change-page-size.atc.yml | 수집상품 목록 → 페이지 사이즈 변경 → 카드 갯수 늘어남 확인 |
| atcs/collect/edit-name-only.atc.yml | 수집상품 첫 카드 → 상품명 변경 → 영속성 검증 (재업로드 X) |
| atcs/collect/edit-option-price.atc.yml | 수집상품 첫 카드 → 옵션 가격 단건 변경 → 영속성 검증 |
| atcs/collect/edit-option-stock.atc.yml | 수집상품 첫 카드 → 옵션 재고 단건 변경 → 영속성 검증 |
| atcs/collect/open-url-collect-modal-cancel.atc.yml | 상품 수집 → URL 수집 모달 열기 → 취소 → 모달 닫힘 |
| atcs/collect/options-a-z-normalize.atc.yml | 수집상품 첫 카드 → 옵션 탭 → A-Z 정규화 동작 확인 |
| atcs/collect/search-product-by-code.atc.yml | 수집상품 목록 → 상품 코드 검색 → 결과 1+ 확인 |
| atcs/collect/toggle-list-view.atc.yml | 수집상품 목록 → 카드뷰 ↔ 목록뷰 전환 |
| atcs/collect/toggle-market-active.atc.yml | 수집상품 첫 카드 → 업로드 설정 탭의 마켓 토글 1개 변경 → 영속성 |
| atcs/e2e/edit-base-discount-only.atc.yml | 기본 설정 > 공통설정 > 판매가 → 할인율만 변경 → 영속성 검증 |
| atcs/e2e/edit-base-margin-only.atc.yml | 기본 설정 > 공통설정 > 판매가 → 마진만 변경 → 영속성 검증 |
| atcs/e2e/edit-base-market-weight-single.atc.yml | 기본 설정 > 공통설정 > 마켓별 가중치 → 단일 마켓만 변경 → 영속성 |
| atcs/e2e/enter-base-setting-tabs.atc.yml | 기본 설정 4개 카테고리 탭 순회 진입 smoke |
| atcs/e2e/enter-delivery-agency.atc.yml | 배송대행지 메뉴 진입 smoke — 페이지 헤더 visible 까지 |
| atcs/e2e/open-notification-drawer.atc.yml | 알림 drawer 열기 + 닫기 smoke |

---

## 7. 🟢 `import-direct-*-popup` step.id 정규화

21개 ATC 중:
- 19개: `click_mall_verify_popup`
- `import-direct-tmall-popup`: `click_tmall_verify_popup`
- `import-direct-taobao-popup`: `click_taobao_verify_popup`

**제안**: 통합 시 자동 해결. 통합 안 할 거면 3개 모두 `click_mall_verify_popup` 로 통일.

---

## 8. 🟢 compound step (do > 200자, 6 ATCs)

step 1개가 너무 많은 동작을 묶고 있어서 실패 시 어디서 깨졌는지 알기 어려움. 권장: 2-3 step 으로 분해.

| Path | step.id | do 길이 |
|---|---|---:|
| atcs/e2e/delivery-agency-enter-application.atc.yml | click_submit_and_land | 207 |
| atcs/e2e/edit-base-common-price.atc.yml | open_base_setting_price | 225 |
| atcs/e2e/order-management-sync-banner.atc.yml | wait_sync_banner_visible | 236 |
| atcs/e2e/verify-customs-tax-on-product.atc.yml | bump_and_snapshot_customs_tax | 215 |
| atcs/e2e/verify-delivery-fee-on-product.atc.yml | bump_and_snapshot_delivery | 214 |
| atcs/e2e/verify-product-attribute-on-product.atc.yml | bump_and_snapshot_attribute | 260 |

---

## 9. 🟢 outputs 선언 + 체인 확장 후보 (9 ATCs)

아래 ATC 들은 URL/ID 를 input 으로 받지만 `outputs` 미선언. D13 의 batch chain (앞 TC outputs → 뒤 TC inputs) 활용 못 함.

**제안**: 수집 단계의 ATC 들이 `source_product_id` 를 emit 하도록 outputs 추가 → 업로드/검증 단계 ATC 가 `from: previous` 로 받게.

| Path | 현재 inputs | 권장 outputs |
|---|---|---|
| atcs/collect/bulk-apply-base-setting.atc.yml | ['product_count'] | source_product_id |
| atcs/collect/product-error-check.atc.yml | ['url'] | source_product_id |
| atcs/collect/search-product-by-code.atc.yml | ['source_product_id'] | source_product_id |
| atcs/collect/tmall-single.atc.yml | ['product_url'] | source_product_id |
| atcs/collect/url-collect-verify.atc.yml | ['product_url'] | source_product_id |
| atcs/collect/url-collect.atc.yml | ['product_url'] | source_product_id |
| atcs/error-check/product-error-fix.atc.yml | ['source_product_id'] | source_product_id (전달) |
| atcs/upload/edit-name-reupload.atc.yml | ['source_product_id'] | — |
| atcs/upload/registered-check.atc.yml | ['source_product_id'] | — |
| atcs/upload/single-product.atc.yml | ['source_product_id'] | — |

---

## 10. 🟢 composes 도입 (현재 0건)

CLAUDE.md (l) 에 정의된 `composes` 필드가 한 번도 안 쓰임. e2e 시나리오를 조각 ATC 들의 조합으로 구성하면 회귀 효과 좋음.

**현존 후보**:
- `atcs/e2e/url-collect-and-ai-fix.atc.yml` — 수집+ai-fix 결합. composes 로 풀어쓸 수 있음
- `atcs/e2e/order-management-instruct-to-delivering.atc.yml` — 송장입력+상태변경 다단계. 조각화 가능
- `atcs/upload/single-product.atc.yml` — 검색+업로드. 이미 chain 패턴 사용중이라 composes 적합

**조각 ATC 컨벤션**: `_<name>.atc.yml` (언더스코어 prefix), 같은 도메인 디렉토리 안.

---

## 11. 📝 spec.ts 측면 (참고)

- `da-cascade-*` 27 spec.ts × ~89줄 = **~2,160줄** (거의 100% 동일)
- `import-direct-*-popup` 21 spec.ts × ~50줄 = **~1,050줄**
- `da-input-*` 16 spec.ts × ~? 줄
- `bulk-edit-*` 21 spec.ts

⇒ spec.ts 통합 시 **약 3,000-4,000 줄** 의 보일러플레이트 제거 가능.

---

## 권장 실행 순서

1. **§1 da-cascade-* 27개 → 1개 ATC + 데이터 테이블 spec.ts** (가장 큰 효과, 가장 안전)
2. **§2 import-direct-*-popup 21개 → 1개 ATC** (다음 큰 효과)
3. **§3 da-input-* 16개 → 1개 ATC** (위 둘과 같은 패턴)
4. **§4 registered-delete-modal-only-* 5개 → 1개** (작지만 깔끔)
5. **§7 import-direct step.id 통일** (위 §2 같이 처리 가능)
6. **§6 expected 필드 17개 보강** (작은 작업, 일괄 처리)
7. **§9 outputs 추가** + **§10 composes 도입** — 새 ATC 작성 시 패턴 확립
8. **§5 bulk-edit-* spec.ts 헬퍼 추출** — 작업량 크지만 추후
9. **§8 compound step 분해** — 리포트 개선용, 우선순위 낮음
