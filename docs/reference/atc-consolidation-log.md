# ATC 통합 기록 (Consolidation Log)

원본 ATC 들을 통합 ATC + CASES 배열로 합치면서, **각 통합본이 원래 어떤 ATC 들을 묶었는지** 추적하는 문서.
필요 시 원본 복구나 특정 케이스 격리 디버깅에 사용.

모든 통합본은 **Hybrid 모드** 지원:
- `ATC_INPUT_*` env 제공 시 → 그 1건만 실행
- env 미제공 시 → CASES 배열 전체 실행

---

## §1. da-cascade (27 → 1)

**통합본**:
- ATC: `atcs/settings/da-cascade.atc.yml`
- spec: `tests/settings/da-cascade.spec.ts`
- handlerKeys: `tests/settings/da-cascade.handlerKeys.json`

**inputs** (hybrid 단일 실행 시):
- `region` (string, regex source)
- `shipping` (string, regex source)
- `customs` (string, regex source)

**원본 27건 매핑**:

| TC# | 원본 파일 | region | shipping | customs |
|---:|---|---|---|---|
| 1412 | da-cascade-1412.atc.yml | 칭다오 | 허브넷해상\|해운 | 목록통관 |
| 1413 | da-cascade-1413.atc.yml | 칭다오 | 허브넷해상\|해운 | 일반통관\|사업자통관 |
| 1414 | da-cascade-1414.atc.yml | 칭다오 | 허브넷해상\|해운 | 화물사업자통관 |
| 1415 | da-cascade-1415.atc.yml | 칭다오 | 자이언트해상 | 목록통관 |
| 1416 | da-cascade-1416.atc.yml | 칭다오 | 자이언트해상 | 일반통관\|사업자통관 |
| 1417 | da-cascade-1417.atc.yml | 칭다오 | 항공 | 목록통관 |
| 1418 | da-cascade-1418.atc.yml | 칭다오 | 항공 | 일반통관\|사업자통관 |
| 1419 | da-cascade-1419.atc.yml | 광저우 | 해운 | 목록통관 |
| 1420 | da-cascade-1420.atc.yml | 광저우 | 해운 | 일반통관\|사업자통관 |
| 1421 | da-cascade-1421.atc.yml | 광저우 | 해운 | 화물사업자통관 |
| 1422 | da-cascade-1422.atc.yml | 광저우 | 항공 | 목록통관 |
| 1423 | da-cascade-1423.atc.yml | 광저우 | 항공 | 일반통관\|사업자통관 |
| 1424 | da-cascade-1424.atc.yml | 광저우 | 알뜰항공 | 목록통관 |
| 1425 | da-cascade-1425.atc.yml | 광저우 | 알뜰항공 | 일반통관\|사업자통관 |
| 1426 | da-cascade-1426.atc.yml | 웨이하이B2B\|웨이하이\|B2B | 해운 | 목록통관 |
| 1427 | da-cascade-1427.atc.yml | 웨이하이B2B\|웨이하이\|B2B | 해운 | 일반통관\|사업자통관 |
| 1428 | da-cascade-1428.atc.yml | 웨이하이B2B\|웨이하이\|B2B | 해운 | 화물사업자통관 |
| 1429 | da-cascade-1429.atc.yml | 웨이하이B2B\|웨이하이\|B2B | 평택해운 | 목록통관 |
| 1430 | da-cascade-1430.atc.yml | 웨이하이B2B\|웨이하이\|B2B | 평택해운 | 일반통관\|사업자통관 |
| 1431 | da-cascade-1431.atc.yml | 웨이하이B2B\|웨이하이\|B2B | 항공 | 목록통관 |
| 1432 | da-cascade-1432.atc.yml | 웨이하이B2B\|웨이하이\|B2B | 항공 | 일반통관\|사업자통관 |
| 1433 | da-cascade-1433.atc.yml | 오리건 | 항공 | 목록통관\|일반통관\|사업자통관 |
| 1434 | da-cascade-1434.atc.yml | 캘리포니아 | 항공 | 목록통관\|일반통관\|사업자통관 |
| 1435 | da-cascade-1435.atc.yml | 영국 | 항공 | 목록통관\|일반통관\|사업자통관 |
| 1436 | da-cascade-1436.atc.yml | 독일 | 항공 | 목록통관\|일반통관\|사업자통관 |
| 1437 | da-cascade-1437.atc.yml | 도쿄 | 항공 | 목록통관\|일반통관 |
| 1438 | da-cascade-1438.atc.yml | 도쿄 | 항공 | 사업자통관 |

**개별 실행**:
```bash
# CLI: TC#1420 만
npx playwright test tests/settings/da-cascade.spec.ts -g "#1420"

# CLI/GUI: inputs 로 1건만
npm run atc -- atcs/settings/da-cascade.atc.yml --region=광저우 --shipping=해운 --customs=목록통관
```

---

## §2. import-direct-popup (21 → 1)

**통합본**:
- ATC: `atcs/collect/import-direct-popup.atc.yml`
- spec: `tests/collect/import-direct-popup.spec.ts`
- handlerKeys: `tests/collect/import-direct-popup.handlerKeys.json`

**inputs**:
- `mall_label` (string, 버튼 라벨)
- `host_regex` (string, 새 탭 hostname 매칭 regex source)

**step.id 정규화**: 원본은 3가지 변종 (`click_mall_verify_popup` / `click_tmall_verify_popup` / `click_taobao_verify_popup`) → 모두 `click_mall_verify_popup` 로 통일.

**원본 21건 매핑**:

| id | 원본 파일 | mall_label | host_regex |
|---|---|---|---|
| 1688 | import-direct-1688-popup.atc.yml | 1688 | `(^\|\\.)1688\\.com$` |
| 1688-aibuy | import-direct-1688-aibuy-popup.atc.yml | 1688 AiBUY | `(^\|\\.)1688\\.com$` |
| aliexpress | import-direct-aliexpress-popup.atc.yml | 알리 | `(^\|\\.)aliexpress\\.com$` |
| amazon-ca | import-direct-amazon-ca-popup.atc.yml | 캐나다 | `(^\|\\.)amazon\\.ca$` |
| amazon-de | import-direct-amazon-de-popup.atc.yml | 독일 | `(^\|\\.)amazon\\.de$` |
| amazon-es | import-direct-amazon-es-popup.atc.yml | 스페인 | `(^\|\\.)amazon\\.es$` |
| amazon-fr | import-direct-amazon-fr-popup.atc.yml | 프랑스 | `(^\|\\.)amazon\\.fr$` |
| amazon-in | import-direct-amazon-in-popup.atc.yml | 인도 | `(^\|\\.)amazon\\.in$` |
| amazon-it | import-direct-amazon-it-popup.atc.yml | 이탈리아 | `(^\|\\.)amazon\\.it$` |
| amazon-jp | import-direct-amazon-jp-popup.atc.yml | 일본 | `(^\|\\.)amazon\\.co\\.jp$` |
| amazon-mx | import-direct-amazon-mx-popup.atc.yml | 멕시코 | `(^\|\\.)amazon\\.com\\.mx$` |
| amazon-uk | import-direct-amazon-uk-popup.atc.yml | 영국 | `(^\|\\.)amazon\\.co\\.uk$` |
| amazon-us | import-direct-amazon-us-popup.atc.yml | 미국 | `(^\|\\.)amazon\\.com$` |
| domeggook | import-direct-domeggook-popup.atc.yml | 도매꾹 | `(^\|\\.)domeggook\\.com$` |
| domeme | import-direct-domeme-popup.atc.yml | 도매매 | `(^\|\\.)domeggook\\.com$` |
| ownerclan | import-direct-ownerclan-popup.atc.yml | 오너클랜 | `(^\|\\.)ownerclan\\.com$` |
| rakuten | import-direct-rakuten-popup.atc.yml | 라쿠텐 | `(^\|\\.)rakuten\\.co\\.jp$` |
| taobao | import-direct-taobao-popup.atc.yml | 타오바오 | `(^\|\\.)taobao\\.com$` |
| temu | import-direct-temu-popup.atc.yml | 테무 | `(^\|\\.)temu\\.com$` |
| tmall | import-direct-tmall-popup.atc.yml | 티몰 | `(^\|\\.)tmall\\.com$` |
| vvic | import-direct-vvic-popup.atc.yml | VVIC | `(^\|\\.)vvic\\.com$` |

**개별 실행**:
```bash
npx playwright test tests/collect/import-direct-popup.spec.ts -g "타오바오"
npm run atc -- atcs/collect/import-direct-popup.atc.yml \
  --mall_label=타오바오 --host_regex='(^|\.)taobao\.com$'
```

---

## §3. da-input (16 → 1)

**통합본**:
- ATC: `atcs/settings/da-input.atc.yml`
- spec: `tests/settings/da-input.spec.ts`
- handlerKeys: `tests/settings/da-input.handlerKeys.json`

**inputs**:
- `placeholder_regex` (string, regex source)
- `value` (string, 입력값)
- `error_key` (string, 실패 시 reporter 에 기록할 키)

**step.id 정규화**: 원본 `da-input-center-request` 만 `fill_center_request` 사용 → 다른 15개와 동일하게 `fill_and_verify` 로 통일.

**원본 16건 매핑**:

| TC# | id | 원본 파일 | placeholder_regex | value | error_key |
|---:|---|---|---|---|---|
| 1384 | purchase-url | da-input-purchase-url.atc.yml | `원본\\s*상품의\\s*URL` | https://item.taobao.com/item.htm?id=12345 | purchase_url_fill_failed |
| 1385 | purchase-order-no | da-input-purchase-order-no.atc.yml | `구매한\\s*주문번호` | PO-987654 | purchase_order_no_fill_failed |
| 1386 | tracking-number | da-input-tracking-number.atc.yml | `중국\\s*운송사의\\s*운송번호` | CN1234567890 | tracking_number_fill_failed |
| 1391 | unit-price | da-input-unit-price.atc.yml | `단가를\\s*입력해주세요\\.\\s*\\(CNY\\)` | 100 | unit_price_fill_failed |
| 1392 | quantity | da-input-quantity.atc.yml | `수량을\\s*입력해주세요\\.$` | 5 | quantity_fill_failed |
| 1393 | brand-model | da-input-brand-model.atc.yml | `Apple\\s*2023\\s*MacBook` | Apple Test Model 2026 | brand_model_fill_failed |
| 1394 | color | da-input-color.atc.yml | `색상을\\s*입력해\\s*주세요` | Red | color_fill_failed |
| 1395 | size | da-input-size.atc.yml | `사이즈를\\s*입력해\\s*주세요` | M | size_fill_failed |
| 1400 | receiver-name | da-input-receiver-name.atc.yml | `이름을\\s*입력해주세요` | 홍길동 | receiver_name_fill_failed |
| 1401 | receiver-phone | da-input-receiver-phone.atc.yml | `연락처를\\s*입력해주세요` | 01012345678 | receiver_phone_fill_failed |
| 1402 | customs-id | da-input-customs-id.atc.yml | `개인통관고유부호` | P123456789012 | customs_id_fill_failed |
| 1404 | zip-code | da-input-zip-code.atc.yml | `우편번호를\\s*입력해주세요` | 12345 | zip_code_fill_failed |
| 1405 | address | da-input-address.atc.yml | `주소를\\s*입력해주세요` | 서울시 강남구 테헤란로 123 | address_fill_failed |
| 1406 | address-detail | da-input-address-detail.atc.yml | `상세주소를\\s*입력해주세요` | 4층 401호 | address_detail_fill_failed |
| 1408 | free-text-request | da-input-free-text-request.atc.yml | `직접입력\\s*선택\\s*시\\s*입력` | 깨지지 않게 포장 | free_text_request_fill_failed |
| 1410 | center-request | da-input-center-request.atc.yml | `요청\\s*사항이\\s*있다면\\s*입력해\\s*주세요` | 특별 포장 부탁 | center_request_fill_failed |

**개별 실행**:
```bash
npx playwright test tests/settings/da-input.spec.ts -g "#1405"
npm run atc -- atcs/settings/da-input.atc.yml \
  --placeholder_regex='주소를\s*입력해주세요' --value='서울시...' --error_key=address_fill_failed
```

---

## §4. registered-delete-modal-only (5 → 1, 15 TC 묶음)

**통합본**:
- ATC: `atcs/upload/registered-delete-modal-only.atc.yml`
- spec: `tests/upload/registered-delete-modal-only.spec.ts`
- handlerKeys: `tests/upload/registered-delete-modal-only.handlerKeys.json`

**inputs**:
- `market_key` (string, `MARKET_LABEL` 의 키 — `smartstore`/`coupang`/`esm`/`street`/`lotteOn`)

**원본 5건 매핑** (각 spec 이 사전조건만 다른 P0 3건씩 cover, 총 15 TC):

| id | 원본 파일 | market_key | cover하는 TC# |
|---|---|---|---|
| smartstore | registered-delete-modal-only-smartstore.atc.yml | smartstore | 948, 949, 950 |
| coupang | registered-delete-modal-only-coupang.atc.yml | coupang | 951, 952, 953 |
| esm | registered-delete-modal-only-esm.atc.yml | esm | 954, 955, 956 |
| street | registered-delete-modal-only-street.atc.yml | street | 957, 958, 959 |
| lotte-on | registered-delete-modal-only-lotte-on.atc.yml | lotteOn | 960, 961, 962 |

**개별 실행**:
```bash
npx playwright test tests/upload/registered-delete-modal-only.spec.ts -g "coupang"
npm run atc -- atcs/upload/registered-delete-modal-only.atc.yml --market_key=coupang
```

---

## §5. bulk-edit-* (21) spec.ts 헬퍼 추출 — **이미 처리됨**

**상태**: 작업 불필요. `tests/upload/_bulk-edit-handlers.ts` 에 setup 3 핸들러
(`openRegisteredListStep`, `selectFirstProductStep`, `clickBulkEditButtonStep`) 이
이미 추출되어 있고 21 spec 모두 이를 import. 추가 압축은 §10 의 composes 패턴 활용.

---

## §6. expected 필드 보강 (17 ATC)

D3 권장 필드 누락된 17 ATC 에 `expected:` 추가. step 동작 변경 없음, YAML 끝에 한 줄 추가.

**대상 파일**:

| Path | 추가된 expected |
|---|---|
| atcs/collect/ai-recommend-category.atc.yml | AI 카테고리 추천 API 호출 성공. unhandled 0건. |
| atcs/collect/ai-recommend-name.atc.yml | AI 상품명 추천 → input 값 변경 확인. unhandled 0건. |
| atcs/collect/change-page-size.atc.yml | 페이지 사이즈 변경 후 카드 갯수 증가 확인. unhandled 0건. |
| atcs/collect/edit-name-only.atc.yml | 상품명 변경 + 영속성 검증 (재업로드 없음). unhandled 0건. |
| atcs/collect/edit-option-price.atc.yml | 옵션 가격 단건 변경 + 영속성 검증. unhandled 0건. |
| atcs/collect/edit-option-stock.atc.yml | 옵션 재고 단건 변경 + 영속성 검증. unhandled 0건. |
| atcs/collect/open-url-collect-modal-cancel.atc.yml | URL 수집 모달 열기 → 취소 → 모달 닫힘 확인. unhandled 0건. |
| atcs/collect/options-a-z-normalize.atc.yml | 옵션 탭 A-Z 정규화 동작 확인. unhandled 0건. |
| atcs/collect/search-product-by-code.atc.yml | 상품 코드 검색 → 결과 1건 이상 노출 확인. unhandled 0건. |
| atcs/collect/toggle-list-view.atc.yml | 카드뷰 ↔ 목록뷰 전환 동작 확인. unhandled 0건. |
| atcs/collect/toggle-market-active.atc.yml | 업로드 설정 탭 마켓 토글 1개 변경 + 영속성 검증. unhandled 0건. |
| atcs/e2e/edit-base-discount-only.atc.yml | 기본 설정 판매가 할인율 변경 + 영속성 검증. unhandled 0건. |
| atcs/e2e/edit-base-margin-only.atc.yml | 기본 설정 판매가 마진 변경 + 영속성 검증. unhandled 0건. |
| atcs/e2e/edit-base-market-weight-single.atc.yml | 기본 설정 마켓별 가중치 단일 마켓 변경 + 영속성 검증. unhandled 0건. |
| atcs/e2e/enter-base-setting-tabs.atc.yml | 기본 설정 4개 카테고리 탭 순회 진입 성공. unhandled 0건. |
| atcs/e2e/enter-delivery-agency.atc.yml | 배송대행지 메뉴 진입 + 페이지 헤더 visible 확인. unhandled 0건. |
| atcs/e2e/open-notification-drawer.atc.yml | 알림 drawer 열기 + 닫기 동작 확인. unhandled 0건. |

**롤백**: 각 YAML 의 끝에 추가된 `expected:` 줄만 제거.

---

## §7. import-direct step.id 정규화 — **§2 와 함께 처리됨**

§2 통합 시 `click_tmall_verify_popup` / `click_taobao_verify_popup` → `click_mall_verify_popup` 로 자동 통일.

---

## §8. compound step do 압축 (6 e2e ATC)

step.do 가 200자 이상이던 6 step 을 YAML 멀티라인 (`|`) + 짧은 표현으로 압축.
**step.id 보존** (spec.ts 핸들러 영향 없음, 동작 변경 없음).

| Path | step.id | 변경 |
|---|---|---|
| atcs/e2e/delivery-agency-enter-application.atc.yml | click_submit_and_land | 207자 → 멀티라인 압축 |
| atcs/e2e/edit-base-common-price.atc.yml | open_base_setting_price | 225자 → 멀티라인 압축 |
| atcs/e2e/order-management-sync-banner.atc.yml | wait_sync_banner_visible | 236자 → 멀티라인 압축 |
| atcs/e2e/verify-customs-tax-on-product.atc.yml | bump_and_snapshot_customs_tax | 215자 → 멀티라인 압축 |
| atcs/e2e/verify-delivery-fee-on-product.atc.yml | bump_and_snapshot_delivery | 214자 → 멀티라인 압축 |
| atcs/e2e/verify-product-attribute-on-product.atc.yml | bump_and_snapshot_attribute | 260자 → 멀티라인 압축 |

**롤백**: `git diff` 에서 do 필드의 줄 단위 차이만 revert.

---

## §9. outputs 선언 추가 (2 ATC)

**완료 (2건, 안전)**:
- `atcs/collect/url-collect.atc.yml` — `outputs.source_product_id` 추가
- `atcs/collect/url-collect-verify.atc.yml` — `outputs.source_product_id` 추가

두 ATC 의 spec.ts (= `_url-collect-handlers.ts`) 가 이미 `emitOutput('source_product_id', ...)` 호출 중이라
YAML 만 선언 추가했다. D13 batch chain (앞 TC outputs → 뒤 TC inputs.from=previous) 활용 가능.

**미완료 (spec.ts 핸들러 작업 필요 — 추후)**:
- `atcs/collect/tmall-single.atc.yml`
- `atcs/collect/product-error-check.atc.yml`
- `atcs/error-check/product-error-fix.atc.yml`
- `atcs/upload/edit-name-reupload.atc.yml`

이들은 inputs 로 URL/source_product_id 받지만 spec.ts 가 emitOutput 호출 안 함.
YAML 만 선언 추가하면 거짓말 → spec.ts handler 에 emitOutput 호출 추가하는 작업 필요.

**롤백**: 각 YAML 의 `outputs:` 블록만 제거.

---

## §10. composes 도입 (1 ATC)

**완료**: `atcs/e2e/url-collect-and-ai-fix.atc.yml` 을 composes 패턴으로 리팩터.

**before**: 13 step 모두 inline 정의
**after**: 처음 7 step 은 `composes: [../collect/url-collect-verify.atc.yml]` 로 재사용,
나머지 6 step (ai_recommend_product_name ~ wait_upload_complete) 만 본 ATC 의 steps 로 유지.

**검증**: atc-loader 가 펼친 후 13 step 모두 보존 확인 (원본과 step.id 시퀀스 100% 동일).
spec.ts 는 변경 없음 (CLAUDE.md (l) 의 "부모 spec.ts 는 펼쳐진 모든 step.id 의 handler 보유" 원칙).

**효과**: url-collect-verify 의 수집 흐름이 1곳에서 정의되어 변경 시 양쪽 같이 반영됨.

**롤백**: composes 블록 제거 후 처음 7 step (open_collect_menu ~ enter_product_detail) 을 다시 inline 으로 복원.

---

## §11. 디렉토리 재정렬 (Excel Category 기준)

**규칙** (사용자 지정 2026-05-21):
- Excel Category = `일반` → **Main Category** 별로 디렉토리 분리
- Excel Category != `일반` → **Category** 자체를 디렉토리로

**기존 → 신규 매핑**:

| 기존 (기능 분류) | 신규 (Excel 분류) | TC 매핑 |
|---|---|---|
| atcs/collect/* (수집 기능) | atcs/collected-product/ | 일반/수집상품 |
| atcs/collect/import-direct-* (수집 트리거) | atcs/product-collect/ | 일반/상품수집 |
| atcs/collect/url-collect* + tmall-single | atcs/product-collect/ | 일반/상품수집 |
| atcs/error-check/* | atcs/collected-product/ | 일반/수집상품 (에러체크) |
| atcs/upload/bulk-edit-* (관부가세) | atcs/smartstore-customs-tax/ | 스스관부가세/등록상품 |
| atcs/upload/registered-delete-* | atcs/registered-product/ | 일반/등록상품 |
| atcs/upload/single-product | atcs/upload/ | 일반/업로드 |
| atcs/upload/edit-name-reupload 등 | atcs/registered-product/ | 일반/등록상품 |
| atcs/settings/da-* | atcs/delivery-agency/ | 일반/배송대행지 |
| atcs/settings/talkstore-base-* | atcs/base-setting/ | 일반/기본설정 |
| atcs/settings/base-setting-survey-modal-visible | atcs/upload/ | 일반/업로드 |
| atcs/e2e/order-management-* | atcs/order-mgmt/ | 일반/주문관리 |
| atcs/e2e/edit-base-* | atcs/base-setting/ | 일반/기본설정 |
| atcs/e2e/delivery-agency-* | atcs/delivery-agency/ | 일반/배송대행지 |
| atcs/e2e/open-notification-drawer | atcs/windly-shell/ | 일반/윈들리 |
| atcs/e2e/verify-*-on-product (cross-cutting) | atcs/e2e/ | 다중 영역 |
| atcs/e2e/url-collect-and-ai-fix (cross-cutting) | atcs/e2e/ | 다중 영역 |

**최종 디렉토리 분포**:

| 디렉토리 | ATC 수 |
|---|---:|
| atcs/collected-product/ | 28 |
| atcs/delivery-agency/ | 26 |
| atcs/smartstore-customs-tax/ | 21 |
| atcs/base-setting/ | 18 |
| atcs/registered-product/ | 10 |
| atcs/e2e/ | 7 |
| atcs/order-mgmt/ | 6 |
| atcs/product-collect/ | 5 |
| atcs/upload/ | 2 |
| atcs/windly-shell/ | 1 |

**변경 사항** (총 12 카테고리):
- ATC 파일 + 대응 spec.ts + handlerKeys.json 사이드카 모두 함께 이동
- spec.ts 의 `ATC_PATH` 상수 자동 갱신 (116 파일)
- 공유 핸들러 7개 (`_url-collect-handlers`, `_talkstore-handlers`, `_da-application-handlers`,
  `_talkstore-base-handlers`, `_bulk-edit-handlers`, `_delete-modal-handlers`, `_handlers`) 주 소비자 dir 로 이동
- cross-dir 핸들러 import 6 spec 갱신:
  - tests/e2e/url-collect-and-ai-fix → `../product-collect/_url-collect-handlers`
  - tests/registered-product/* (5건) → `../smartstore-customs-tax/_bulk-edit-handlers`
- composes 경로 갱신: `atcs/e2e/url-collect-and-ai-fix.atc.yml` 의 composes
  `../collect/url-collect-verify.atc.yml` → `../product-collect/url-collect-verify.atc.yml`
- playwright.config.ts: 5 project → 10 project + 1 fresh project 로 재정의
  - 신규: windly-collected-product / product-collect / registered-product / delivery-agency /
    base-setting / order-mgmt / windly-shell / smartstore-customs-tax
  - 유지: windly-upload / windly-e2e
  - 제거: windly-collect / windly-error-check / windly-fix / windly-settings
  - rename: windly-e2e-fresh → windly-order-mgmt-fresh (대상 spec 이 order-mgmt/ 로 이동했으므로)
- CLAUDE.md (d)/(j) 도메인 후보 리스트 갱신
- `.url-collect-history.log` 도 tests/collect/ → tests/product-collect/ 이동
- **GUI 카탈로그**:
  - `gui/shared/ipc.ts` 의 `Domain` 유니온 타입 갱신 (5종 → 10종)
  - `gui/main/catalog.ts` 의 `KNOWN_DOMAINS` 화이트리스트 갱신
  - `gui/renderer/src/components/CatalogPanel.tsx` 의 `DOMAIN_ORDER` 갱신
  - `npm run gui:build:main` 으로 dist 재빌드 완료 (renderer 는 vite dev/build 시 자동 반영)

**검증**:
- `npx tsc --noEmit` exit=0 ✅
- `npx playwright test --list` → 190 tests in 125 files 정상 디스커버리 ✅
- composes 펼침 확인: url-collect-and-ai-fix → 13 step (원본과 동일) ✅

**롤백 방법**:

```bash
# 모든 ATC + spec.ts 를 git mv 로 되돌리기 — 가장 간단
git log --grep="reorg\|category" --oneline
git revert <commit-hash>

# 또는 디렉토리 단위 되돌리기 (수동)
git mv atcs/collected-product atcs/collect
git mv atcs/product-collect/import-direct-* atcs/collect/
# ... (반대 매핑 적용)
```

---

## 누적 효과

| 단계 | 통합 전 | 통합 후 | 제거된 파일 | ATC 총수 |
|---|---:|---:|---:|---:|
| 시작 | — | — | — | 189 |
| §1 da-cascade | 27 ATC | 1 ATC | 81 (atc + spec + handlerKeys) | 163 |
| §2 import-direct-popup | 21 ATC | 1 ATC | 63 | 143 |
| §3 da-input | 16 ATC | 1 ATC | 48 | 128 |
| §4 registered-delete-modal-only | 5 ATC | 1 ATC | 10 | 124 |
| §5 bulk-edit-* helpers | — | — | — | 124 (이미 처리됨) |
| §6 expected 필드 보강 | 17 ATC 수정 | — | — | 124 |
| §7 step.id 정규화 | (§2 포함) | — | — | 124 |
| §8 compound step 압축 | 6 ATC 수정 | — | — | 124 |
| §9 outputs 선언 추가 | 2 ATC 수정 | — | — | 124 |
| §10 composes 도입 | 1 ATC 리팩터 | — | — | 124 |
| §11 디렉토리 재정렬 | 124 파일 이동 | — | — | 124 (10 카테고리 디렉토리) |

**최종**: 69 통합 + 26 보강/리팩터 + 디렉토리 재정렬 = **95+ ATC 변경**, 약 ~3,400 줄 spec.ts 보일러플레이트 제거,
디렉토리 구조 = Excel 분류 1:1 매칭.

## 원본 복구가 필요할 때

각 통합본 표의 "원본 파일" 컬럼을 참고. git log 에서:

```bash
# 원본 파일 1개 복구 (예: da-cascade-1420)
git checkout <consolidation-commit>^ -- atcs/settings/da-cascade-1420.atc.yml tests/settings/da-cascade-1420.spec.ts

# 통합 commit 전체 revert
git log --grep="consolidat" --oneline   # 통합 commit 찾기
git revert <commit-hash>
```

또는 통합본의 CASES 배열에서 해당 행만 복사해서 새 ATC 작성.
