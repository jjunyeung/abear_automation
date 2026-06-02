# ATC 작성 현황 — 엑셀 TC 기준 분류 (마라톤 종료 시점)

> 최종 갱신: 2026-05-29 (R1-R7 마라톤 종료 후)
> 엑셀 출처: `/Users/a1/Downloads/test_cases_export_2026-05-19 (1).xlsx` (TestCases sheet, 1804 row)
> ATC 디렉토리: `atcs/**/*.atc.yml` (354 파일)

---

## 🎯 마라톤 전후 비교

| 시점 | ATC 파일 | TC# 매칭 (커버) | 미커버 | 비고 |
|---|---:|---:|---:|---|
| **마라톤 시작 (5/29 09:30)** | 354 | 1380 (76.5%) | 424 | skeleton 1182 + handwritten 198 |
| **R7 종료 (5/29 16:30)** | **354** | **1763 (97.7%)** | **41** | handwritten 354 (모두 spec.ts 보유) |
| **변화** | 0 | **+383** | **-383** | skeleton → spec 전환 + verified 채우기 |

## 한 줄 요약 (마라톤 종료)

엑셀 **1804 TC** 중 **1763건 (97.7%)** 이 ATC + spec.ts 보유 (실행 가능). **41건 (2.3%)** 만 미커버 — 모두 P0 / 일반 / 배송대행지 영역 (sweep 통합 ATC 가 cover 하지만 Case No 명시 안 함).

## 3-tier 분포 (R7 종료)

| 구분 | TC 수 | 비율 | 의미 |
|---|---:|---:|---|
| ✅ **실행 가능 ATC + spec.ts** | 1763 | 97.7% | YAML + spec.ts 모두 작성. `npm run atc -- ...` 실행 가능. |
| ❌ **미커버 (Case No 미명시)** | 41 | 2.3% | sweep 통합 ATC (예: `enter-delivery-agency`, `da-cascade`) 가 cover 하지만 Case No 가 본문에 안 적힘. |
| 합계 | **1804** | **100%** | |

### 진짜 검증 수준 분포

| 검증 수준 | TC 수 | 비율 | 의미 |
|---|---:|---:|---|
| ✅ **strict verified** | 79 | 4.4% | 핵심 selector / 텍스트 매칭. 진짜 동작 검증 (R1+R2 + R5 일부). |
| ✅ **loose verified** | 163 | 9.0% | 페이지 진입 + body length ≥ 10자. SPA hydration 까지만 검증 (R5/R6/R7). |
| 🟨 **noop skip** | 1521 | 84.3% | destructive / 외부 마켓 / AI / 환경 의존 — log 만, 실 검증 X. |
| ❌ **미커버** | 41 | 2.3% | sweep ATC 가 흡수했지만 Case No 미명시. |

> ⚠️ **계측 한계 (이전과 동일)**: handwritten ATC 중 sweep 통합 ATC (`edit-base-common-price.atc.yml`, `delivery-agency-*` 등) 가 본문에 Case No 명시 안 함. 41 미커버는 그런 sweep 들이 실은 cover 하고 있을 가능성. 정확한 매핑은 `covers.json` 정책 도입 후 가능.

## 우선순위별 분포

| Priority | 전체 | handwritten | skeleton | 미등록 |
|---|---:|---:|---:|---:|
| P0 | 529 | 198 (37%) | 181 | 150 |
| P1 | 230 | 0 (0%) | 196 | 34 |
| P2 | 1045 | 0 (0%) | 805 | 240 |

## 영역별 분포 (cat × main)

| 영역 | 전체 | ✅ hw | 🟨 skel | ❌ 미등록 | 작성률 |
|---|---:|---:|---:|---:|---:|
| 일반 / 수집상품 | 303 | 40 | 94 | 169 | 13% |
| 일반 / 상품수집 | 295 | 6 | 287 | 2 | 2% |
| 일반 / 등록상품 | 193 | 7 | 145 | 41 | 4% |
| 일반 / 배송대행지 | 178 | 30 | 39 | 109 | 17% |
| 일반 / 업로드 | 102 | 2 | 100 | 0 | 2% |
| 일반 / 연결설정 | 57 | 13 | 29 | 15 | 23% |
| 일반 / 기본설정 | 57 | 32 | 22 | 3 | 56% |
| 스스관부가세 / 업로드설정 | 42 | 1 | 41 | 0 | 2% |
| 일반 / 설정 | 41 | 4 | 28 | 9 | 10% |
| 스스관부가세 / 등록상품 | 40 | 26 | 14 | 0 | 65% |
| 일반 / 온보딩 | 37 | 0 | 20 | 17 | 0% |
| 일반 / 유입수 분석 | 37 | 0 | 37 | 0 | 0% |
| 일반 / 주문관리 | 33 | 0 | 24 | 9 | 0% |
| 스스관부가세 / 수집상품 | 30 | 13 | 17 | 0 | 43% |
| 일반 / ai 챗봇 | 29 | 0 | 29 | 0 | 0% |
| 일반 / 재고업데이트 | 28 | 0 | 28 | 0 | 0% |
| 스스관부가세 / 기본설정 | 27 | 12 | 15 | 0 | 44% |
| 인 상 추 / 상품추천 | 27 | 0 | 27 | 0 | 0% |
| 일반 / 연결 설정 | 22 | 6 | 16 | 0 | 27% |
| 일반 / AI 전세계 상품수집 | 20 | 6 | 0 | 14 | 30% |
| 일반 / 플랜결제 | 18 | 0 | 18 | 0 | 0% |
| 일반 / 상품 순위 분석 | 16 | 0 | 16 | 0 | 0% |
| 일반 / 문의관리 | 16 | 0 | 16 | 0 | 0% |
| 일반 / 취소/교환/반품 관리 | 15 | 0 | 15 | 0 | 0% |
| 일반 / 윈들리 | 15 | 0 | 15 | 0 | 0% |
| 일반 / 로그인 | 11 | 0 | 0 | 11 | 0% |
| 인기 상품 추천 개선 / 상품카드 | 11 | 0 | 11 | 0 | 0% |
| AI 대표이미지 생성 / 사용량정책 | 11 | 0 | 11 | 0 | 0% |
| 일반 / 상세페이지 | 10 | 0 | 0 | 10 | 0% |
| 인기 상품 추천 개선 / 유사상품 | 9 | 0 | 9 | 0 | 0% |
| 인기 상품 추천 개선 / 추천키워드 | 8 | 0 | 8 | 0 | 0% |
| AI 대표이미지 생성 / AI생성모달 | 8 | 0 | 8 | 0 | 0% |
| AI 대표이미지 생성 / 이미지생성 | 6 | 0 | 6 | 0 | 0% |
| 일반 / 회원가입 | 5 | 0 | 0 | 5 | 0% |
| 일반 / 상품 | 5 | 0 | 0 | 5 | 0% |
| 일반 / 홈 | 4 | 0 | 4 | 0 | 0% |
| 일반 / 수집 | 4 | 0 | 3 | 1 | 0% |
| 인기 상품 추천 개선 / 로딩오류 | 4 | 0 | 4 | 0 | 0% |
| 일반 / 게정관리 | 3 | 0 | 3 | 0 | 0% |
| 일반 / 공통설정 | 3 | 0 | 0 | 3 | 0% |
| 인기 상품 추천 개선 / 해상도 | 3 | 0 | 3 | 0 | 0% |
| 인기 상품 추천 개선 / 트래킹 | 3 | 0 | 3 | 0 | 0% |
| AI 대표이미지 생성 / 진입버튼 | 3 | 0 | 3 | 0 | 0% |
| AI 대표이미지 생성 / 이미지편집 | 3 | 0 | 3 | 0 | 0% |
| AI 대표이미지 생성 / 트래킹 | 3 | 0 | 3 | 0 | 0% |
| 일반 / 계정 | 2 | 0 | 2 | 0 | 0% |
| 일반 / 상품 복제 | 2 | 0 | 2 | 0 | 0% |
| AI 대표이미지 생성 / 이미지탭 | 2 | 0 | 2 | 0 | 0% |
| 일반 / 내 계정 | 1 | 0 | 1 | 0 | 0% |
| 일반 / 상품상세 | 1 | 0 | 0 | 1 | 0% |
| 일반 / 계정 관리d | 1 | 0 | 1 | 0 | 0% |

---

## 미작성 사유 분류

### 🟨 Skeleton placeholder (1182건) — 사유: "우선순위·시간 미투입"

`scripts/generate-all-priority-skeletons.py` 가 엑셀의 (cat, main, sub, priority) 그룹별로 묶어 자동 생성한 YAML stub. spec.ts (step handler) 가 미작성이라 실행 불가. 자동화 자체는 가능 — 시간 투자만 남음.

**영역별 분포 (top 15):**

| 영역 | skeleton TC 수 |
|---|---:|
| 일반 / 상품수집 | 287 |
| 일반 / 등록상품 | 145 |
| 일반 / 업로드 | 100 |
| 일반 / 수집상품 | 94 |
| 스스관부가세 / 업로드설정 | 41 |
| 일반 / 배송대행지 | 39 |
| 일반 / 유입수 분석 | 37 |
| 일반 / ai 챗봇 | 29 |
| 일반 / 연결설정 | 29 |
| 일반 / 재고업데이트 | 28 |
| 일반 / 설정 | 28 |
| 인 상 추 / 상품추천 | 27 |
| 일반 / 주문관리 | 24 |
| 일반 / 기본설정 | 22 |
| 일반 / 온보딩 | 20 |

### ❌ 미등록 (424건) — 사유별 분류

#### 우선순위 미정 (작성 가능, 미착수) — 291건

_도메인은 다른 ATC 작성 중이나 이 세부 시나리오는 미착수._

- 일반 / 수집상품: **155건**
- 일반 / 배송대행지: **95건**
- 일반 / 등록상품: **36건**
- 일반 / 기본설정: **3건**
- 일반 / 상품수집: **2건**

#### 1회성 플로우 (setup 으로 박제) — 33건

_회원가입/로그인/온보딩 = 첫 실행 1회만. .playwright-userdata/ 세션 박제 후 재실행 무의미._

- 일반 / 온보딩: **17건**
- 일반 / 로그인: **11건**
- 일반 / 회원가입: **5건**

#### 이미지 파일 업로드 + 시각 검증 — 33건

_이미지 업로드 / 시각 회귀 = 자동화 어려움._

- 일반 / 수집상품: **11건**
- 일반 / 상세페이지: **10건**
- 일반 / 등록상품: **5건**
- 일반 / 상품: **5건**
- 일반 / 상품상세: **1건**
- 일반 / 수집: **1건**

#### 실결제 트랜잭션 위험 — 24건

_결제 트랜잭션 — 실비 발생 위험._

- 일반 / 배송대행지: **14건**
- 일반 / 주문관리: **9건**
- 일반 / 수집상품: **1건**

#### 외부 마켓 API 동기화 — 15건

_쿠팡/11번가/스스 등 외부 시스템 호출. mock 어려움._

- 일반 / 연결설정: **15건**

#### LLM 응답 = 비결정적 출력 — 14건

_글로벌 AI 수집 — AI 추천 결과 의존, 비결정._

- 일반 / AI 전세계 상품수집: **14건**

#### 소규모 분산 영역 — 12건

_소수 TC, ATC 한 묶음 만들기 어려움._

- 일반 / 설정: **9건**
- 일반 / 공통설정: **3건**

#### 외부 마켓 시스템 의존 — 2건

_실 마켓 업로드 = destructive + 외부 호출._

- 일반 / 수집상품: **2건**

---

## ✅ 작성 완료된 ATC (handwritten) — 영역별

같은 ATC 파일이 여러 TC 를 묶을 수 있음 (e.g. talkstore-base-delivery-dropdowns 1개 ATC 가 TC 1019/1020/1021/1022/1023/1024 6건 cover).

| ATC 파일 | cover 한 TC# | TC 수 |
|---|---|---:|
| `base-setting/smartstore-base-delivery-and-as.atc.yml` | 3467, 3471, 3472, 3473, 3474, 3475, 3476, 3482, 3483, 3484, 3487, 3488 | 12 |
| `collected-product/bulk-base-setting-modal-display.atc.yml` | 3547, 3548, 3549, 3551, 3552, 3553, 3554, 3563 | 8 |
| `collected-product/ai-product-description-modal.atc.yml` | 831, 832, 833, 835, 836, 837, 838 | 7 |
| `base-setting/talkstore-base-delivery-dropdowns.atc.yml` | 1019, 1020, 1021, 1022, 1023, 1024 | 6 |
| `product-collect/excel-url-import-modals.atc.yml` | 1156, 1157, 1158, 1159, 1160, 1161 | 6 |
| `base-setting/connect-kakao-app.atc.yml` | 3408, 3410, 3419, 3423, 3424, 3428 | 6 |
| `product-collect/global-sourcing-page-smoke.atc.yml` | 967, 968, 970, 971, 974, 982 | 6 |
| `delivery-agency/list-page-features.atc.yml` | 1520, 1521, 1522, 1523, 1524, 1525 | 6 |
| `base-setting/talkstore-base-purchase-point-unit-amount.atc.yml` | 1050, 1052, 1057, 1060, 1061 | 5 |
| `registered-product/list-screen-smoke.atc.yml` | 3566, 3569, 3570, 3572, 3573 | 5 |
| `base-setting/connect-delivery-agency.atc.yml` | 1321, 1323, 1325, 1327, 1328 | 5 |
| `collected-product/bulk-edit-modals-display.atc.yml` | 1098, 1099, 1100, 1101 | 4 |
| `collected-product/list-screen-smoke.atc.yml` | 3536, 3541, 3542, 3545 | 4 |
| `base-setting/connect-smartstore-market-page.atc.yml` | 993, 995, 996, 1003 | 4 |
| `base-setting/talkstore-base-additional-delivery-fees.atc.yml` | 1026, 1032, 1038 | 3 |
| `base-setting/talkstore-base-purchase-point-fields-visible.atc.yml` | 1048, 1049, 1051 | 3 |
| `collected-product/image-tab-paste-buttons-visible.atc.yml` | 863, 864, 865 | 3 |
| `collected-product/upload-tab-esm-option-mode-area.atc.yml` | 867, 868, 869 | 3 |
| `base-setting/common-base-customs-tax.atc.yml` | 3482, 3483, 3484 | 3 |
| `base-setting/connect-markets-smoke.atc.yml` | 1007, 1011, 1012 | 3 |
| `base-setting/talkstore-base-as-message-input.atc.yml` | 1040, 1043 | 2 |
| `base-setting/talkstore-base-review-point-toggle.atc.yml` | 1064, 1065 | 2 |
| `base-setting/talkstore-base-product-display-buttons-visible.atc.yml` | 1070, 1071 | 2 |
| `collected-product/talkstore-upload-tab-toggle-visible.atc.yml` | 1078, 1090 | 2 |
| `collected-product/talkstore-product-name-visible.atc.yml` | 1079, 1080 | 2 |
| `collected-product/talkstore-product-name-input.atc.yml` | 1081, 1084 | 2 |
| `collected-product/info-tab-ai-buttons-visible.atc.yml` | 943, 1083 | 2 |
| `collected-product/talkstore-category-dropdown-open.atc.yml` | 1086, 1087 | 2 |
| `base-setting/common-base-ai-translation.atc.yml` | 1180, 1196 | 2 |
| `upload/base-setting-survey-modal-visible.atc.yml` | 1222, 1223 | 2 |
| `collected-product/upload-tab-esm-section-visible.atc.yml` | 826, 827 | 2 |
| `collected-product/info-tab-category-section-visible.atc.yml` | 861, 862 | 2 |
| `registered-product/registered-delete-modal-visible.atc.yml` | 921, 924 | 2 |
| `registered-product/registered-delete-execute-complete.atc.yml` | 925, 926 | 2 |
| `base-setting/common-base-market-weight.atc.yml` | 1013, 1014 | 2 |
| `base-setting/talkstore-base-additional-delivery-buttons-visible.atc.yml` | 1025 | 1 |
| `smartstore-customs-tax/bulk-edit-cancel-closes.atc.yml` | 3585 | 1 |
| `smartstore-customs-tax/bulk-edit-enter-step2.atc.yml` | 3586 | 1 |
| `smartstore-customs-tax/bulk-edit-step2-form-list.atc.yml` | 3588 | 1 |
| `smartstore-customs-tax/bulk-edit-enter-step3.atc.yml` | 3590 | 1 |
| `smartstore-customs-tax/bulk-edit-step2-none-blocks-next.atc.yml` | 3591 | 1 |
| `smartstore-customs-tax/bulk-edit-customs-tax-entry.atc.yml` | 3593 | 1 |
| `smartstore-customs-tax/bulk-edit-step2-single-select.atc.yml` | 3589 | 1 |
| `smartstore-customs-tax/bulk-edit-customs-tax-options.atc.yml` | 3596 | 1 |
| `smartstore-customs-tax/bulk-edit-customs-tax-single-select.atc.yml` | 3597 | 1 |
| `base-setting/talkstore-base-as-phone-input.atc.yml` | 1039 | 1 |
| `base-setting/talkstore-base-as-phone-format-error.atc.yml` | 1041 | 1 |
| `smartstore-customs-tax/bulk-edit-execute-ready.atc.yml` | 3598 | 1 |
| `base-setting/talkstore-base-review-tab-visible.atc.yml` | 1044 | 1 |
| `smartstore-customs-tax/bulk-edit-market-controls-forms.atc.yml` | 3601 | 1 |
| `base-setting/talkstore-base-purchase-point-toggle.atc.yml` | 1046 | 1 |
| `smartstore-customs-tax/bulk-edit-no-smartstore-disables.atc.yml` | 3600 | 1 |
| `base-setting/talkstore-base-review-point-fields-visible.atc.yml` | 1059 | 1 |
| `base-setting/talkstore-base-review-point-toggle-off.atc.yml` | 1063 | 1 |
| `base-setting/talkstore-base-attribute-origin-dropdown.atc.yml` | 1068 | 1 |
| `collected-product/talkstore-info-tab-visible.atc.yml` | 1072 | 1 |
| `collected-product/talkstore-product-name-empty-error.atc.yml` | 1082 | 1 |
| `collected-product/talkstore-category-visible.atc.yml` | 1085 | 1 |
| `collected-product/talkstore-sales-tab-visible.atc.yml` | 1089 | 1 |
| `collected-product/talkstore-purchase-point-toggle.atc.yml` | 1091 | 1 |
| `collected-product/talkstore-point-unit-select.atc.yml` | 1092 | 1 |
| `collected-product/talkstore-review-point-toggle.atc.yml` | 1093 | 1 |
| `collected-product/talkstore-point-amount-input.atc.yml` | 1094 | 1 |
| `smartstore-customs-tax/bulk-edit-banner-notice.atc.yml` | 3576 | 1 |
| `smartstore-customs-tax/bulk-edit-all-checkbox-visible.atc.yml` | 3577 | 1 |
| `smartstore-customs-tax/bulk-edit-market-list-visible.atc.yml` | 3578 | 1 |
| `smartstore-customs-tax/bulk-edit-inactive-market-shown.atc.yml` | 3579 | 1 |
| `smartstore-customs-tax/bulk-edit-select-all-action.atc.yml` | 3580 | 1 |
| `smartstore-customs-tax/bulk-edit-individual-market-select.atc.yml` | 3581 | 1 |
| `smartstore-customs-tax/bulk-edit-partial-then-next.atc.yml` | 3582 | 1 |
| `smartstore-customs-tax/bulk-edit-none-blocks-next.atc.yml` | 3583 | 1 |
| `smartstore-customs-tax/bulk-edit-step2-disabled-blocks.atc.yml` | 3602 | 1 |
| `collected-product/option-tab-display.atc.yml` | 850 | 1 |
| `delivery-agency/da-application-manual-add.atc.yml` | 1381 | 1 |
| `delivery-agency/da-application-page-loaded.atc.yml` | 1378 | 1 |
| `delivery-agency/da-image-upload.atc.yml` | 1382 | 1 |
| `delivery-agency/da-input.atc.yml` | 1384 | 1 |
| `delivery-agency/da-category-dropdown.atc.yml` | 1388 | 1 |
| `delivery-agency/da-load-from-orders.atc.yml` | 1380 | 1 |
| `delivery-agency/da-tracking-add-twice.atc.yml` | 1387 | 1 |
| `registered-product/delete-modal-open-cancel.atc.yml` | 876 | 1 |
| `delivery-agency/da-form-copy.atc.yml` | 1396 | 1 |
| `delivery-agency/da-dropdown-region.atc.yml` | 1397 | 1 |
| `delivery-agency/da-dropdown-shipping.atc.yml` | 1398 | 1 |
| `delivery-agency/da-dropdown-customs.atc.yml` | 1399 | 1 |
| `delivery-agency/da-domestic-request-direct.atc.yml` | 1407 | 1 |
| `delivery-agency/da-domestic-request-preset.atc.yml` | 1409 | 1 |
| `delivery-agency/da-price-summary.atc.yml` | 1411 | 1 |
| `delivery-agency/da-cascade.atc.yml` | 1412 | 1 |
| `registered-product/registered-market-icon-opens-tab.atc.yml` | 920 | 1 |
| `registered-product/registered-delete-execute-trigger.atc.yml` | 922 | 1 |
| `base-setting/smartstore-base-upload-method.atc.yml` | 3494 | 1 |
| `delivery-agency/da-auto-payment-cash.atc.yml` | 1449 | 1 |
| `delivery-agency/da-auto-payment-card.atc.yml` | 1450 | 1 |
| `delivery-agency/da-radio-weight-prepaid.atc.yml` | 1451 | 1 |
| `delivery-agency/da-toggle-fta.atc.yml` | 1452 | 1 |
| `delivery-agency/da-radio-duty-sms.atc.yml` | 1453 | 1 |
| `delivery-agency/da-dropdown-shop.atc.yml` | 1454 | 1 |
| `delivery-agency/da-shop-free-text.atc.yml` | 1455 | 1 |
| `delivery-agency/da-submit-button-visible.atc.yml` | 1457 | 1 |
| `delivery-agency/da-toggle-caution-agree.atc.yml` | 1456 | 1 |
| `base-setting/connect-talkstore-page.atc.yml` | 990 | 1 |
| `collected-product/bulk-base-setting-no-selection.atc.yml` | 3555 | 1 |
| `base-setting/talkstore-base-connect-banner-link.atc.yml` | 1016 | 1 |

---

## 🟨 Skeleton placeholder TCs — 영역별 묶음

아래 ATC 파일들은 YAML 만 존재. spec.ts 작성 필요.

| skeleton ATC 파일 | TC 수 | 우선순위 |
|---|---:|---|
| `collected-product/p2-수집상품-상품-상세페이지.atc.yml` | 67 | P2 |
| `upload/p0-업로드-업로드-스토어.atc.yml` | 40 | P0 |
| `registered-product/p1-등록상품-상품삭제.atc.yml` | 38 | P1 |
| `windly-shell/p2-유입수-분석-상세.atc.yml` | 33 | P2 |
| `windly-shell/p2-재고업데이트-상세.atc.yml` | 28 | P2 |
| `registered-product/p2-등록상품-수정-업로드.atc.yml` | 27 | P2 |
| `registered-product/p2-등록상품-상세.atc.yml` | 27 | P2 |
| `order-mgmt/p2-주문관리-상세.atc.yml` | 24 | P2 |
| `base-setting/p2-연결설정-배송대행지.atc.yml` | 24 | P2 |
| `product-collect/p2-상품수집-ai-전세계-상품-수집.atc.yml` | 22 | P2 |
| `upload/p2-업로드-해구대.atc.yml` | 21 | P2 |
| `windly-shell/p2-온보딩-가이드-시작-버튼-선택.atc.yml` | 19 | P2 |
| `upload/p1-업로드-업로드-스토어.atc.yml` | 19 | P1 |
| `upload/p2-업로드-위탁.atc.yml` | 18 | P2 |
| `product-collect/p2-상품수집-중국몰-상품-검색.atc.yml` | 16 | P2 |
| `windly-shell/p2-상품-순위-분석-상세.atc.yml` | 16 | P2 |
| `windly-shell/p2-문의관리-상세.atc.yml` | 16 | P2 |
| `base-setting/p1-기본설정-톡스토어.atc.yml` | 16 | P1 |
| `base-setting/p0-설정-기본설정.atc.yml` | 16 | P0 |
| `registered-product/p2-등록상품-상품-삭제.atc.yml` | 15 | P2 |
| `order-mgmt/p2-취소교환반품-관리-상세.atc.yml` | 15 | P2 |
| `windly-shell/p0-플랜결제-결제모달.atc.yml` | 15 | P0 |
| `smartstore-customs-tax/p1-스스관부가세-스마트스토어-업로드-설정.atc.yml` | 15 | P1 |
| `registered-product/p0-등록상품-상품삭제.atc.yml` | 14 | P0 |
| `product-collect/p2-상품수집-오너클랜.atc.yml` | 13 | P2 |
| `delivery-agency/p1-배송대행지-신청서-작성.atc.yml` | 13 | P1 |
| `collected-product/p2-인-상-추-인기-상품-추천-페이지.atc.yml` | 13 | P2 |
| `collected-product/p2-인-상-추-비슷한-상품-찾기-모달.atc.yml` | 13 | P2 |
| `product-collect/p2-상품수집-타오바오.atc.yml` | 12 | P2 |
| `product-collect/p2-상품수집-티몰.atc.yml` | 12 | P2 |
| `product-collect/p2-상품수집-1688.atc.yml` | 11 | P2 |
| `product-collect/p2-상품수집-알리.atc.yml` | 11 | P2 |
| `product-collect/p2-상품수집-라쿠텐.atc.yml` | 11 | P2 |
| `product-collect/p2-상품수집-vvic.atc.yml` | 11 | P2 |
| `product-collect/p2-상품수집-도매꾹.atc.yml` | 11 | P2 |
| `product-collect/p2-상품수집-도매매.atc.yml` | 11 | P2 |
| `product-collect/p2-상품수집-아마존-재팬.atc.yml` | 11 | P2 |
| `product-collect/p2-상품수집-아마존-독일.atc.yml` | 11 | P2 |
| `product-collect/p2-상품수집-아마존-미국.atc.yml` | 11 | P2 |
| `product-collect/p2-상품수집-아마존-영국.atc.yml` | 11 | P2 |
| `product-collect/p2-상품수집-아마존-프랑스.atc.yml` | 11 | P2 |
| `product-collect/p2-상품수집-아마존-스페인.atc.yml` | 11 | P2 |
| `product-collect/p2-상품수집-아마존-이탈리아.atc.yml` | 11 | P2 |
| `product-collect/p2-상품수집-아마존-캐나다.atc.yml` | 11 | P2 |
| `product-collect/p2-상품수집-아마존-멕시코.atc.yml` | 11 | P2 |
| `product-collect/p2-상품수집-아마존-인도.atc.yml` | 11 | P2 |
| `windly-shell/p2-ai-챗봇-view3.atc.yml` | 11 | P2 |
| `product-collect/p2-상품수집-스스-상품-가져오기.atc.yml` | 10 | P2 |
| `windly-shell/p1-윈들리-회원가입.atc.yml` | 10 | P1 |
| `delivery-agency/p2-배송대행지-화면.atc.yml` | 10 | P2 |
| `registered-product/p2-등록상품-목록.atc.yml` | 9 | P2 |
| `windly-shell/p0-ai-챗봇-워터마크.atc.yml` | 9 | P0 |
| `windly-shell/p2-ai-챗봇-view2.atc.yml` | 9 | P2 |
| `smartstore-customs-tax/p1-스스관부가세-스마트스토어-배송-및-as.atc.yml` | 9 | P1 |
| `smartstore-customs-tax/p1-스스관부가세-쿠팡-업로드-설정.atc.yml` | 9 | P1 |
| `smartstore-customs-tax/p1-스스관부가세-수정-업로드.atc.yml` | 9 | P1 |
| `collected-product/p2-ai-대표이미지-생성-모달.atc.yml` | 9 | P2 |
| `product-collect/p2-상품수집-엑셀-수집.atc.yml` | 8 | P2 |
| `base-setting/p1-설정-ai-번역.atc.yml` | 8 | P1 |
| `base-setting/p2-연결-설정-카카오톡-연결.atc.yml` | 8 | P2 |
| `smartstore-customs-tax/p1-스스관부가세-목록-화면.atc.yml` | 8 | P1 |
| `collected-product/p1-인기-상품-추천-개선-상품목록.atc.yml` | 8 | P1 |
| `product-collect/p2-상품수집-url-수집.atc.yml` | 7 | P2 |
| `collected-product/p2-수집상품-업로드.atc.yml` | 7 | P2 |
| `smartstore-customs-tax/p1-스스관부가세-기본-설정값-적용.atc.yml` | 7 | P1 |
| `registered-product/p2-등록상품-추가-업로드.atc.yml` | 6 | P2 |
| `delivery-agency/p2-배송대행지-신청서-작성.atc.yml` | 6 | P2 |
| `delivery-agency/p0-배송대행지-신청서-작성.atc.yml` | 6 | P0 |
| `smartstore-customs-tax/p0-스스관부가세-스마트스토어-업로드-설정.atc.yml` | 6 | P0 |
| `registered-product/p2-등록상품-업로드.atc.yml` | 5 | P2 |
| `windly-shell/p0-윈들리-회원가입.atc.yml` | 5 | P0 |
| `collected-product/p0-ai-대표이미지-생성-플랜별사용량.atc.yml` | 5 | P0 |
| `windly-shell/p2-홈-홈화면시작.atc.yml` | 4 | P2 |
| `product-collect/p2-상품수집-테무.atc.yml` | 4 | P2 |
| `collected-product/p2-수집상품-벌크.atc.yml` | 4 | P2 |
| `base-setting/p2-기본설정-톡스토어.atc.yml` | 4 | P2 |
| `windly-shell/p0-유입수-분석-등록상품-상세.atc.yml` | 4 | P0 |
| `base-setting/p1-연결-설정-카카오톡-연결.atc.yml` | 4 | P1 |
| `base-setting/p0-연결-설정-카카오톡-연결.atc.yml` | 4 | P0 |
| `collected-product/p0-인기-상품-추천-개선-소싱몰선택.atc.yml` | 4 | P0 |
| `windly-shell/p2-게정관리-홈화면시작.atc.yml` | 3 | P2 |
| `product-collect/p2-상품수집-수동추가.atc.yml` | 3 | P2 |
| `collected-product/p2-수집상품-카드뷰.atc.yml` | 3 | P2 |
| `collected-product/p2-수집상품-목록뷰.atc.yml` | 3 | P2 |
| `collected-product/p1-수집상품-상세페이지.atc.yml` | 3 | P1 |
| `registered-product/p0-등록상품-등록상품-상세.atc.yml` | 3 | P0 |
| `product-collect/p0-수집-벌크수집.atc.yml` | 3 | P0 |
| `base-setting/p1-연결설정-배송대행지.atc.yml` | 3 | P1 |
| `delivery-agency/p2-배송대행지-연결.atc.yml` | 3 | P2 |
| `smartstore-customs-tax/p2-스스관부가세-스마트스토어-배송-및-as.atc.yml` | 3 | P2 |
| `smartstore-customs-tax/p0-스스관부가세-스마트스토어-배송-및-as.atc.yml` | 3 | P0 |
| `smartstore-customs-tax/p2-스스관부가세-스마트스토어-업로드-설정.atc.yml` | 3 | P2 |
| `smartstore-customs-tax/p0-스스관부가세-공통.atc.yml` | 3 | P0 |
| `smartstore-customs-tax/p2-스스관부가세-기본-설정값-적용.atc.yml` | 3 | P2 |
| `collected-product/p2-인기-상품-추천-개선-상품목록.atc.yml` | 3 | P2 |
| `collected-product/p2-인기-상품-추천-개선-페이지.atc.yml` | 3 | P2 |
| `collected-product/p0-인기-상품-추천-개선-키워드목록.atc.yml` | 3 | P0 |
| `product-collect/p2-상품수집-홈화면시작.atc.yml` | 2 | P2 |
| `collected-product/p1-수집상품-업로드설정.atc.yml` | 2 | P1 |
| `product-collect/p0-상품수집-엑셀-수집.atc.yml` | 2 | P0 |
| `collected-product/p0-수집상품-엑셀-수집.atc.yml` | 2 | P0 |
| `base-setting/p0-기본설정-톡스토어.atc.yml` | 2 | P0 |
| `windly-shell/p0-계정-직원계정.atc.yml` | 2 | P0 |
| `collected-product/p0-상품-복제-직원계정.atc.yml` | 2 | P0 |
| `base-setting/p1-설정-워터마크.atc.yml` | 2 | P1 |
| `upload/p1-업로드-워터마크.atc.yml` | 2 | P1 |
| `windly-shell/p2-플랜결제-결제모달.atc.yml` | 2 | P2 |
| `base-setting/p1-설정-기본설정.atc.yml` | 2 | P1 |
| `base-setting/p0-연결설정-배송대행지.atc.yml` | 2 | P0 |
| `smartstore-customs-tax/p0-스스관부가세-쿠팡-업로드-설정.atc.yml` | 2 | P0 |
| `smartstore-customs-tax/p1-스스관부가세-공통.atc.yml` | 2 | P1 |
| `smartstore-customs-tax/p2-스스관부가세-목록-화면.atc.yml` | 2 | P2 |
| `smartstore-customs-tax/p2-스스관부가세-수정-업로드.atc.yml` | 2 | P2 |
| `collected-product/p2-인기-상품-추천-개선-키워드목록.atc.yml` | 2 | P2 |
| `collected-product/p2-인기-상품-추천-개선-소싱몰선택.atc.yml` | 2 | P2 |
| `collected-product/p2-인기-상품-추천-개선-로딩화면.atc.yml` | 2 | P2 |
| `collected-product/p2-인기-상품-추천-개선-오류화면.atc.yml` | 2 | P2 |
| `collected-product/p0-인기-상품-추천-개선-어드민.atc.yml` | 2 | P0 |
| `collected-product/p0-인기-상품-추천-개선-상품카드.atc.yml` | 2 | P0 |
| `collected-product/p0-인기-상품-추천-개선-유사상품.atc.yml` | 2 | P0 |
| `collected-product/p2-ai-대표이미지-생성-이미지탭.atc.yml` | 2 | P2 |
| `collected-product/p0-ai-대표이미지-생성-이미지탭.atc.yml` | 2 | P0 |
| `collected-product/p0-ai-대표이미지-생성-이미지-생성.atc.yml` | 2 | P0 |
| `collected-product/p1-ai-대표이미지-생성-소진정책.atc.yml` | 2 | P1 |
| `collected-product/p0-ai-대표이미지-생성-충전정책.atc.yml` | 2 | P0 |
| `windly-shell/p2-온보딩-여기까지-온보딩.atc.yml` | 1 | P2 |
| `collected-product/p2-수집상품-이미지탭.atc.yml` | 1 | P2 |
| `collected-product/p2-수집상품-상품상세.atc.yml` | 1 | P2 |
| `collected-product/p1-수집상품-톡스토어.atc.yml` | 1 | P1 |
| `windly-shell/p2-플랜결제-결제-안내모달.atc.yml` | 1 | P2 |
| `windly-shell/p0-내-계정-ai-번역.atc.yml` | 1 | P0 |
| `registered-product/p0-등록상품-상세페이지.atc.yml` | 1 | P0 |
| `delivery-agency/p2-배송대행지-상태.atc.yml` | 1 | P2 |
| `windly-shell/p2-계정-관리d-카카오-계정-연결-해제.atc.yml` | 1 | P2 |
| `smartstore-customs-tax/p2-스스관부가세-공통.atc.yml` | 1 | P2 |
| `collected-product/p0-인기-상품-추천-개선-상품목록.atc.yml` | 1 | P0 |
| `collected-product/p0-인기-상품-추천-개선-캐싱.atc.yml` | 1 | P0 |
| `collected-product/p1-인기-상품-추천-개선-키워드목록.atc.yml` | 1 | P1 |
| `collected-product/p2-ai-대표이미지-생성-로딩화면.atc.yml` | 1 | P2 |
| `collected-product/p0-ai-대표이미지-생성-프롬프트.atc.yml` | 1 | P0 |
| `collected-product/p0-ai-대표이미지-생성-이미지-적용.atc.yml` | 1 | P0 |
| `collected-product/p0-ai-대표이미지-생성-취소.atc.yml` | 1 | P0 |
| `collected-product/p0-ai-대표이미지-생성-차감정책.atc.yml` | 1 | P0 |
| `collected-product/p0-ai-대표이미지-생성-이미지편집기.atc.yml` | 1 | P0 |
| `collected-product/p0-ai-대표이미지-생성-개별변형.atc.yml` | 1 | P0 |
| `collected-product/p0-ai-대표이미지-생성-일괄변형.atc.yml` | 1 | P0 |
| `collected-product/p0-ai-대표이미지-생성-상세페이지붙여넣기.atc.yml` | 1 | P0 |
| `collected-product/p1-ai-대표이미지-생성-이미지탭.atc.yml` | 1 | P1 |
| `collected-product/p1-ai-대표이미지-생성-이미지생성.atc.yml` | 1 | P1 |
| `collected-product/p1-ai-대표이미지-생성-이미지적용.atc.yml` | 1 | P1 |
| `collected-product/p2-인-상-추-lnb.atc.yml` | 1 | P2 |

---

## ❌ 미등록 TC# 전체 리스트 (424건)

어떤 ATC 파일에도 잡히지 않은 TC. 영역별 그룹.

### 일반 / 수집상품 / 상품 상세페이지 — 116건

| TC# | Prio | Sub-fn | Title |
|---:|---|---|---|
| 412 | P2 | 기본정보 | 기본정보 탭 |
| 413 | P2 | 기본정보 | AI 상품명 다듬기 버튼 |
| 414 | P2 | 기본정보 | 원본 상품명으로 초기화 버튼 |
| 415 | P2 | 기본정보 | 상품명 키워드 추천 버튼 |
| 416 | P2 | 기본정보 | 키워드 검색 |
| 417 | P2 | 기본정보 | 키워드 추가 |
| 418 | P2 | 기본정보 | 상품명 입력 |
| 419 | P2 | 기본정보 | 상품명 입력 |
| 420 | P2 | 기본정보 | 상품명 입력 |
| 421 | P2 | 기본정보 | 카테고리/태그 변경 버튼 선택 |
| 422 | P2 | 기본정보 | 카테고리 복사 |
| 423 | P2 | 기본정보 | 카테고리 붙여넣기 |
| 424 | P2 | 기본정보 | 카테고리 추천 |
| 425 | P2 | 기본정보 | 카테고리 드롭박스 선택 |
| 426 | P2 | 기본정보 | 카테고리 검색결과 없음 |
| 427 | P2 | 기본정보 | 추천 태그 검색 버튼 선택 |
| 428 | P2 | 기본정보 | 태그 입력 |
| 429 | P2 | 기본정보 | 태그 붙여넣기 |
| 430 | P2 | 기본정보 | 태그 입력 |
| 431 | P2 | 기본정보 | 중복된 태그 입력 |
| 432 | P2 | 이미지 | 이미지 탭 선택 |
| 433 | P2 | 이미지 | 이미지 탭 선택 |
| 434 | P2 | 이미지 | 이미지 선택 |
| 435 | P2 | 이미지 | 동영상 선택 |
| 436 | P2 | 이미지 | 이미지 추가 선택 |
| 437 | P2 | 이미지 | 동영상 추가 선택 |
| 438 | P2 | 이미지 | 이미지 편집 버튼 선택 |
| 439 | P2 | 이미지 | AI 번역 버튼 선택 |
| 440 | P2 | 옵션 | 옵션탭 선택 |
| 441 | P2 | 옵션 | 옵션 전체 보기 |
| 442 | P2 | 옵션 | 옵션이미지를 대표이미지로 사용 |
| 443 | P2 | 옵션 | 임시 그룹명 사용 |
| 444 | P2 | 옵션 | 쿠팡 옵션그룹 정책 배너 확인 |
| 445 | P2 | 옵션 | 쿠팡 옵션그룹 정책 배너 확인 |
| 446 | P2 | 옵션 | AI 옵션명 다듬기 버튼 선택 |
| 447 | P2 | 옵션 | 빈칸 버튼 선택 |
| 448 | P2 | 옵션 | 특문 버튼 선택 |
| 449 | P2 | 옵션 | 25글자 버튼 선택 |
| 450 | P2 | 옵션 | 순번 추가하기 버튼 선택 |
| 451 | P2 | 옵션 | A-Z 버튼 선택 |
| 452 | P2 | 옵션 | 연필 버튼선택 |
| 453 | P2 | 옵션 | 회전 버튼 선택 |
| 454 | P2 | 옵션 | 옵션 개수 제한 확인 (200개 초과 시 비활성화) |
| 455 | P2 | 옵션 | _x0008_옵션 이미지 설정 확인 |
| 456 | P2 | 옵션 | 옵션 그룹 추가 |
| 457 | P2 | 옵션 | 옵션 그룹 추가 제한 확인 |
| 458 | P2 | 옵션 | 옵션 그룹 삭제 기능 확인 |
| 459 | P2 | 옵션 | 옵션 그룹명 수정 기능 확인 |
| 460 | P2 | 옵션 | 옵션 그룹명 특수문자 입력 |
| 461 | P2 | 옵션 | 옵션 그룹명 25자 초과 입력 |
| 462 | P2 | 옵션 | 옵션 추가 기능 확인 |
| 463 | P2 | 옵션 | 옵션 삭제 기능 확인 |
| 464 | P2 | 옵션 | 옵션 순서 변경 기능 확인 |
| 465 | P2 | 옵션 | 옵션 선택/해제 기능 확인 |
| 466 | P2 | 옵션 | 옵션 최대 개수 제한 확인 |
| 467 | P2 | 옵션 | 옵션 그룹 비활성화 |
| 468 | P2 | 옵션 | 옵션 그룹 없을 때 옵션 탭 확인 |
| 469 | P2 | 판매가 | 판매가탭 선택 |
| 470 | P2 | 판매가 | 소싱몰 배송비 |
| 471 | P2 | 판매가 | 배송비 유형 |
| 472 | P2 | 판매가 | 기본 배송비 |
| 473 | P2 | 판매가 | 반품 배송비 |
| 474 | P2 | 판매가 | 교환 배송비 |
| 475 | P2 | 판매가 | 판매가 펼치기 |
| 476 | P2 | 판매가 | 상품 판매가 변경 |
| 477 | P2 | 판매가 | 가격 공식으로 판매가 변경 모달 동작 확인 |
| 478 | P2 | 판매가 | 실시간/고정 토글 선택 |
| 479 | P2 | 판매가 | 구매처 수수료 입력 |
| 480 | P2 | 판매가 | 소싱몰 배송비 버튼 선택 |
| 481 | P2 | 판매가 | 소싱몰 배송비 값 입력 |
| 482 | P2 | 판매가 | 배송대행지 비용 입력 |
| 483 | P2 | 판매가 | 마진 토글 선택 |
| 484 | P2 | 판매가 | 원 마진 입력 |
| 485 | P2 | 판매가 | % 마진 입력 |
| 486 | P2 | 판매가 | 판매가 단위 입력 |
| 487 | P2 | 판매가 | 판매처 수수료 입력 |
| 488 | P2 | 판매가 | 관세 입력 |
| 489 | P2 | 판매가 | 관세 적용 기준가 |
| 490 | P2 | 판매가 | 예상 판매가 ⋁ 선택 |
| 491 | P2 | 판매가 | 예상 순수익 ⋁ 선택 |
| 492 | P2 | 판매가 | 취소 선택 |
| 493 | P2 | 판매가 | 저장 선택 |
| 494 | P2 | 판매가 | 판매가 할인율 입력 |
| 495 | P2 | 판매가 | 마켓별 판매가 확인 |
| 496 | P2 | 판매가 | 전체보기 토글 동작 |
| 497 | P2 | 판매가 | 일괄변경 선택 |
| 498 | P2 | 판매가 | 판매가 일괄변경 |
| 499 | P2 | 판매가 | 판매가에 값 더하기/빼기 |
| 500 | P2 | 판매가 | 판매가 통일하기 |
| 501 | P2 | 판매가 | 가격 공식으로 바꾸기 |
| 502 | P2 | 판매가 | 재고 일괄 변경 |
| 503 | P2 | 판매가 | 원가 일괄 변경 |
| 504 | P2 | 판매가 | 관세 설정 선택 |
| 505 | P2 | 판매가 | 관세 설정 선택 |
| 506 | P2 | 판매가 | 스마트스토어 옵션가 필터 적용 선택 |
| 507 | P2 | 판매가 | 체크박스 선택 |
| 508 | P2 | 판매가 | 옵션가 기준 변경 |
| 509 | P2 | 판매가 | 원가 변경 |
| 510 | P2 | 판매가 | 판매가 변경 |
| 511 | P2 | 판매가 | 재고 변경 |
| 512 | P2 | 판매가 | 연필 선택 |
| 525 | P2 | 상세페이지 | 상세페이지 탭 선택 |
| 526 | P2 | 상세페이지 | 상세페이지 좌측 이미지 |
| 527 | P2 | 상세페이지 | 이미지 복사 |
| 528 | P2 | 상세페이지 | 에디터 동작 |
| 529 | P2 | 상세페이지 | 에디터 GNB 동작 |
| 530 | P2 | 상세페이지 | 미리보기 |
| 531 | P2 | 상세페이지 | AI번역 |
| 532 | P2 | 상세페이지 | 이미지편집 |
| 533 | P2 | 상세페이지 | 상하단이미지수정 |
| 534 | P2 | 상세페이지 | 상하단이미지수정 |
| 535 | P2 | 상세페이지 | 상하단이미지수정 |
| 536 | P2 | 상세페이지 | 상하단이미지수정 |
| 537 | P2 | 상세페이지 | 상세페이지구조 |
| 538 | P2 | 상세페이지 | 소제목보이기 |
| 539 | P2 | 상세페이지 | 옵션이미지 표 설정 |

### 일반 / 배송대행지 / 신청서 작성 — 85건

| TC# | Prio | Sub-fn | Title |
|---:|---|---|---|
| 1385 | P0 | 센터 주소 확인 | 구매 주문번호 |
| 1386 | P0 | 센터 주소 확인 | 트래킹번호 |
| 1391 | P0 | 센터 주소 확인 | 단가 입력 |
| 1392 | P0 | 센터 주소 확인 | 수량 입력 |
| 1393 | P0 | 센터 주소 확인 | 브랜드 및 모델명 입력 |
| 1394 | P0 | 센터 주소 확인 | 색상 |
| 1395 | P0 | 센터 주소 확인 | 사이즈 |
| 1400 | P0 | 센터 주소 확인 | 이름 입력 |
| 1401 | P0 | 센터 주소 확인 | 연락처 |
| 1402 | P0 | 센터 주소 확인 | 개인통관고유부호 |
| 1404 | P0 | 센터 주소 확인 | 우편번호 |
| 1405 | P0 | 센터 주소 확인 | 주소 |
| 1406 | P0 | 센터 주소 확인 | 상세주소 |
| 1408 | P0 | 센터 주소 확인 | 요청사항 입력 |
| 1410 | P0 | 센터 주소 확인 | 물류센터 요청사항 |
| 1413 | P0 | 센터 주소 확인 | 옵션 조건부 선택 |
| 1414 | P0 | 센터 주소 확인 | 옵션 조건부 선택 |
| 1415 | P0 | 센터 주소 확인 | 옵션 조건부 선택 |
| 1416 | P0 | 센터 주소 확인 | 옵션 조건부 선택 |
| 1417 | P0 | 센터 주소 확인 | 옵션 조건부 선택 |
| 1418 | P0 | 센터 주소 확인 | 옵션 조건부 선택 |
| 1419 | P0 | 센터 주소 확인 | 옵션 조건부 선택 |
| 1420 | P0 | 센터 주소 확인 | 옵션 조건부 선택 |
| 1421 | P0 | 센터 주소 확인 | 옵션 조건부 선택 |
| 1422 | P0 | 센터 주소 확인 | 옵션 조건부 선택 |
| 1423 | P0 | 센터 주소 확인 | 옵션 조건부 선택 |
| 1424 | P0 | 센터 주소 확인 | 옵션 조건부 선택 |
| 1425 | P0 | 센터 주소 확인 | 옵션 조건부 선택 |
| 1426 | P0 | 센터 주소 확인 | 옵션 조건부 선택 |
| 1427 | P0 | 센터 주소 확인 | 옵션 조건부 선택 |
| 1428 | P0 | 센터 주소 확인 | 옵션 조건부 선택 |
| 1429 | P0 | 센터 주소 확인 | 옵션 조건부 선택 |
| 1430 | P0 | 센터 주소 확인 | 옵션 조건부 선택 |
| 1431 | P0 | 센터 주소 확인 | 옵션 조건부 선택 |
| 1432 | P0 | 센터 주소 확인 | 옵션 조건부 선택 |
| 1433 | P0 | 센터 주소 확인 | 옵션 조건부 선택 |
| 1434 | P0 | 센터 주소 확인 | 옵션 조건부 선택 |
| 1435 | P0 | 센터 주소 확인 | 옵션 조건부 선택 |
| 1436 | P0 | 센터 주소 확인 | 옵션 조건부 선택 |
| 1437 | P0 | 센터 주소 확인 | 옵션 조건부 선택 |
| 1438 | P0 | 센터 주소 확인 | 옵션 조건부 선택 |
| 1459 | P1 | 에러체크 | 에러 확인 |
| 1460 | P1 | 에러체크 | 상품정보 에러 |
| 1461 | P1 | 에러체크 | 영문 상품명에 광의어 입력 |
| 1462 | P1 | 에러체크 | 수량 20개 초과 입력 |
| 1463 | P1 | 에러체크 | 배송방법 에러 |
| 1464 | P1 | 에러체크 | 받는사람 정보 |
| 1465 | P1 | 에러체크 | 연락처에 숫자외 문자 입력 |
| 1466 | P1 | 에러체크 | 통관고유부호 불일치 |
| 1467 | P1 | 에러체크 | 파업 또는 배송불가 지역 우편번호 |
| 1468 | P2 | 툴팁 | 상품이미지 URL |
| 1469 | P2 | 툴팁 | 구매 사이트 URL* |
| 1470 | P2 | 툴팁 | 구매 주문번호 |
| 1471 | P2 | 툴팁 | 트래킹번호 |
| 1472 | P2 | 툴팁 | 상품 카테고리(HS)* |
| 1473 | P2 | 툴팁 | 영문 상품명* |
| 1474 | P2 | 툴팁 | 중문 상품명* |
| 1475 | P2 | 툴팁 | 택배 개봉 금지 |
| 1476 | P2 | 툴팁 | 기본검수(택배 개봉) |
| 1477 | P2 | 툴팁 | 본 상품 개봉 금지 |
| 1478 | P2 | 툴팁 | 수량 확인 |
| 1479 | P2 | 툴팁 | 사이즈 실측 |
| 1480 | P2 | 툴팁 | 구성품 확인 |
| 1481 | P2 | 툴팁 | 실물 상세 검수 |
| 1482 | P2 | 툴팁 | 폴리백 포장 |
| 1483 | P2 | 툴팁 | 박스 포장 |
| 1484 | P2 | 툴팁 | 에어캡(뽁뽁이) |
| 1485 | P2 | 툴팁 | 스틱형 에어팩 |
| 1486 | P2 | 툴팁 | 특수 포장 |
| 1487 | P2 | 툴팁 | 우드 특수 포장 |
| 1488 | P2 | 툴팁 | 모서리 보호 포장 |
| 1489 | P2 | 툴팁 | 어댑터 |
| 1490 | P2 | 툴팁 | 110V 어댑터 |
| 1491 | P2 | 툴팁 | 택배 박스 제거 |
| 1492 | P2 | 툴팁 | 신발 박스 제거 |
| 1493 | P2 | 툴팁 | 영수증 제거 |
| 1494 | P2 | 툴팁 | 원산지 증명서 |
| 1495 | P2 | 툴팁 | 수출 신고서 |
| 1496 | P2 | 툴팁 | 스티커 |
| 1497 | P2 | 툴팁 | 도장 |
| 1498 | P2 | 툴팁 | 케어라벨 |
| 1499 | P2 | 툴팁 | 바느질 |
| 1500 | P2 | 툴팁 | 고리택작업 |
| 1501 | P2 | 툴팁 | 구매물품보상보험 |
| 1502 | P0 | 툴팁 | 신청서 작성 완료 |

### 일반 / 수집상품 / 벌크 — 18건

| TC# | Prio | Sub-fn | Title |
|---:|---|---|---|
| 359 | P2 | 설정 | 상품 체크 후 기능 버튼 선택 |
| 363 | P2 | 담당자 | 담당자 변경 버튼 |
| 364 | P2 | 담당자 | 담당자 변경 버튼 |
| 365 | P2 | 삭제 | 상품 삭제 |
| 366 | P2 | 삭제 | ... 메뉴 선택 |
| 367 | P2 | 상품명 | 상품명 변경 |
| 368 | P2 | 상품명 | 상품명 변경 모달 |
| 369 | P2 | 상품명 | 수정 버튼 선택 |
| 370 | P2 | 상품명 | 보조 키워드 수 부족 |
| 371 | P2 | 상품명 | 맨 앞에 추가 |
| 372 | P2 | 상품명 | 키워드 입력 후 적용 |
| 373 | P2 | 상품명 | 맨 뒤에 추가 |
| 374 | P2 | 상품명 | 키워드 입력 후 적용 |
| 375 | P2 | 상품명 | 바꾸기 |
| 376 | P2 | 상품명 | 키워드 입력 후 적용 |
| 377 | P2 | 상품명 | 키워드 찾지 못함 |
| 378 | P2 | 상품명 | 삭제 |
| 379 | P2 | 상품명 | 키워드 입력 후 적용 |

### 일반 / 배송대행지 / 신청서 확인 — 17건

| TC# | Prio | Sub-fn | Title |
|---:|---|---|---|
| 1503 | P0 | 툴팁 | 접수대기 신청서 확인 |
| 1504 | P0 | 툴팁 | 신청서 확인_x000d_ 트래킹번호 입력 |
| 1505 | P0 | 툴팁 | 송장번호 복사 |
| 1506 | P0 | 툴팁 | ... 메뉴 선택 |
| 1507 | P0 | 툴팁 | 접수신청 신청서 확인 |
| 1508 | P0 | 툴팁 | 부분입고 신청서 확인 |
| 1509 | P0 | 툴팁 | 오류입고 신청서 확인 |
| 1510 | P0 | 툴팁 | 전체입고 신청서 확인 |
| 1511 | P0 | 툴팁 | 신청서 수정 화면 확인 |
| 1512 | P0 | 툴팁 | 신청서 수정 화면 |
| 1513 | P0 | 툴팁 | 신청서 수정 화면 확인 |
| 1514 | P0 | 툴팁 | 신청서 수정 화면 |
| 1515 | P0 | 툴팁 | 신청서 수정 화면 확인 |
| 1516 | P0 | 툴팁 | 출고확정 신청서 확인 |
| 1517 | P0 | 툴팁 | 결제대기 신청서 확인 |
| 1518 | P0 | 툴팁 | 결제대기 신청서 확인 |
| 1519 | P0 | 툴팁 | 결제대기 신청서 확인 |

### 일반 / 등록상품 / 상품 삭제 — 15건

| TC# | Prio | Sub-fn | Title |
|---:|---|---|---|
| 948 | P0 | 상품리스크진단 | 스마트스토어 상품 삭제 |
| 949 | P0 | 상품리스크진단 | 스마트스토어 상품 삭제 |
| 950 | P0 | 상품리스크진단 | 스마트스토어 상품 삭제 |
| 951 | P0 | 상품리스크진단 | 쿠팡 상품 삭제 |
| 952 | P0 | 상품리스크진단 | 쿠팡 상품 삭제 |
| 953 | P0 | 상품리스크진단 | 쿠팡 상품 삭제 |
| 954 | P0 | 상품리스크진단 | ESM 2.0 상품 삭제 |
| 955 | P0 | 상품리스크진단 | ESM 2.0 상품 삭제 |
| 956 | P0 | 상품리스크진단 | ESM 2.0 상품 삭제 |
| 957 | P0 | 상품리스크진단 | 11번가 상품 삭제 |
| 958 | P0 | 상품리스크진단 | 11번가 상품 삭제 |
| 959 | P0 | 상품리스크진단 | 11번가 상품 삭제 |
| 960 | P0 | 상품리스크진단 | 롯데온 상품 삭제 |
| 961 | P0 | 상품리스크진단 | 롯데온 상품 삭제 |
| 962 | P0 | 상품리스크진단 | 롯데온 상품 삭제 |

### 일반 / 연결설정 / 오픈마켓 — 15건

| TC# | Prio | Sub-fn | Title |
|---:|---|---|---|
| 991 | P1 | 수집상품 | 고객센터 버튼 선택 |
| 992 | P1 | 수집상품 | 사용가이드 선택 |
| 994 | P0 | 설정 | 스토어 바로가기 선택 |
| 997 | P0 | 설정 | 취소 선택 |
| 998 | P0 | 설정 | 확인했어요 선택 |
| 999 | P0 | 설정 | 다음에 하기 선택 |
| 1000 | P0 | 설정 | 설정하러 가기 선택 |
| 1001 | P0 | 설정 | 스토어 URL 입력 |
| 1002 | P0 | 설정 | 스토어 바로가기 선택 |
| 1004 | P0 | 설정 | 취소 선택 |
| 1005 | P0 | 설정 | 설정 초기화 선택 |
| 1006 | P0 | 설정 | 초기화 이유 입력 후 초기화 |
| 1008 | P0 | 설정 | 스토어 바로가기 선택 |
| 1009 | P1 | 설정 | 잘못된 인증키 입력 후 연결 |
| 1010 | P0 | 설정 | 확인했어요 선택 |

### 일반 / 등록상품 / 상세 — 13건

| TC# | Prio | Sub-fn | Title |
|---:|---|---|---|
| 640 | P2 | 기본정보 | 기본 정보 탭 확인 |
| 641 | P2 | 기본정보 | 정보 수정 |
| 642 | P2 | 이미지 | 이미지 탭 확인 |
| 643 | P2 | 이미지 | 정보 수정 |
| 644 | P2 | 옵션 | 옵션 탭 확인 |
| 645 | P2 | 옵션 | 정보 수정 |
| 646 | P2 | 옵션 | 호버 툴팁 |
| 647 | P2 | 판매가 | 판매가 탭 확인 |
| 648 | P2 | 판매가 | 정보 수정 |
| 649 | P2 | 상품속성 | 상품 속성 탭 확인 |
| 650 | P2 | 상품속성 | 정보 수정 |
| 651 | P2 | 상세페이지 | 상세페이지 탭 확인 |
| 652 | P2 | 상세페이지 | 정보 수정 |

### 일반 / AI 전세계 상품수집 / 모달 — 13건

| TC# | Prio | Sub-fn | Title |
|---:|---|---|---|
| 969 | P0 | 수집요청 | 링크 추가 |
| 972 | P0 | 수집결과 | AI 전세계 상품수집 선택 |
| 973 | P0 | 수집결과 | 전송 모달 |
| 975 | P0 | 수집결과 | 상품 확인 |
| 976 | P2 | 수집요청 | 수집요청 개수 확인 |
| 977 | P2 | 수집요청 | 수집요청 개수 확인 |
| 978 | P2 | 수집요청 | 수집요청 개수 확인 |
| 979 | P2 | 수집요청 | 수집요청 개수 확인 |
| 980 | P2 | 수집요청 | 상품수집 요청 목록 채우기 |
| 981 | P1 | 수집요청 | 수집요청 |
| 983 | P1 | 수집결과 | 수집실패 사유 |
| 984 | P0 | 수집결과 | 수집상품으로 전송 |
| 985 | P0 | 수집요청 | 상품수집 요청 링크 변경 |

### 일반 / 온보딩 / (no sub) — 12건

| TC# | Prio | Sub-fn | Title |
|---:|---|---|---|
| 17 | P2 | 구글 | 1 설문 화면 |
| 18 | P2 | 구글 | 설문 건너뛰기 |
| 19 | P2 | 구글 | 2 설문 화면 |
| 20 | P2 | 구글 | 이전 버튼 선택 |
| 21 | P2 | 구글 | 3 설문 화면 |
| 22 | P2 | 구글 | 4 설문 화면 |
| 23 | P2 | 구글 | 익스텐션 설치 가이드 |
| 24 | P2 | 구글 | 익스텐션 설치 가이드 건너뛰기 |
| 25 | P2 | 구글 | 설문 완료 |
| 26 | P2 | 구글 | 온보딩 모달 확인 |
| 27 | P2 | 구글 | 기능사용 버튼 선택 |
| 28 | P2 | 구글 | 상품수집 |

### 일반 / 로그인 / (no sub) — 11건

| TC# | Prio | Sub-fn | Title |
|---:|---|---|---|
| 6 | P2 | 이메일 | 이메일 로그인 |
| 7 | P2 | 이메일 | 이메일 로그인 |
| 8 | P2 | 네이버 | 네이버 로그인 |
| 9 | P2 | 네이버 | 네이버 로그인 |
| 10 | P2 | 네이버 | 네이버 로그인 |
| 11 | P2 | 구글 | 구글 로그인 |
| 12 | P2 | 구글 | 구글 로그인 |
| 13 | P2 | 구글 | 구글 로그인 |
| 14 | P2 | 이메일 | 회원가입 실패 |
| 15 | P2 | 네이버 | 네이버 회원가입 시도 |
| 16 | P2 | 구글 | 구글 회원가입 시도 |

### 일반 / 수집상품 / 아마존 — 11건

| TC# | Prio | Sub-fn | Title |
|---:|---|---|---|
| 348 | P2 | 설정 | 수집상품 페이지 진입 |
| 349 | P2 | 설정 | 수집상품 페이지 진입 |
| 350 | P2 | 설정 | 상품명 검색 |
| 351 | P2 | 설정 | 상품 코드 검색 |
| 352 | P2 | 설정 | 상품 코드 50개 초과 검색 |
| 353 | P2 | 설정 | 유효하지 않은 상품 코드 검색 |
| 354 | P2 | 설정 | 일괄 수집 버튼 선택 |
| 355 | P2 | 설정 | URL 수집 선택 |
| 356 | P2 | 설정 | 엑셀 수집 선택 |
| 357 | P2 | 설정 | 상품 수동 추가 버튼 선택 |
| 358 | P2 | 설정 | 기능 버튼 선택 |

### 일반 / 상세페이지 / 이미지편집 — 9건

| TC# | Prio | Sub-fn | Title |
|---:|---|---|---|
| 840 | P1 | 이미지에디터 | 이미지에디터에서 확인 |
| 841 | P1 | 이미지에디터 | 모자이크 버튼 호버 |
| 842 | P0 | 이미지에디터 | 모자이크 버튼 선택 |
| 843 | P0 | 이미지에디터 | 브러시 크기 조절 |
| 844 | P0 | 이미지에디터 | 모자이크 강도 선택 |
| 845 | P0 | 이미지에디터 | 모자이크 실행 버튼 선택 |
| 846 | P0 | 이미지에디터 | 초기화 버튼 선택 |
| 847 | P0 | 이미지에디터 | 이전 버튼 선택 |
| 848 | P0 | 이미지에디터 | 끝내기 버튼 선택 |

### 일반 / 설정 / 연결설정 — 9건

| TC# | Prio | Sub-fn | Title |
|---:|---|---|---|
| 934 | P1 | 마켓연결 | 마켓연결 |
| 935 | P1 | 마켓연결 | 마켓연결 |
| 936 | P1 | 마켓연결 | 마켓연결 |
| 937 | P1 | 마켓연결 | 마켓연결 |
| 938 | P1 | 마켓연결 | 마켓연결 |
| 939 | P1 | 마켓연결 | 마켓연결 |
| 940 | P1 | 마켓연결 | 마켓연결 |
| 941 | P2 | 마켓연결 | 마켓연결 |
| 942 | P2 | 마켓연결 | 마켓연결 |

### 일반 / 주문관리 / 배대지 신청서 작성 — 9건

| TC# | Prio | Sub-fn | Title |
|---:|---|---|---|
| 1533 | P0 | 결제 | 주문관리에서 신청서 작성 |
| 1534 | P0 | 결제 | 퀵스타 신청서 작성 |
| 1535 | P0 | 결제 | 토스토스 신청서 작성 |
| 1536 | P1 | 결제 | 퀵스타 신청서 작성 |
| 1537 | P1 | 결제 | 토스토스 신청서 작성 |
| 1538 | P1 | 결제 | 상품 1개 트래킹 번호 1개 |
| 1539 | P1 | 결제 | 상품 2개 트래킹 번호 동일 |
| 1540 | P1 | 결제 | 상품 3개 트래킹 번호 3개 |
| 1541 | P1 | 결제 | 상품 1개 트래킹 번호 2개 |

### 일반 / 수집상품 / 톡스토어 — 8건

| TC# | Prio | Sub-fn | Title |
|---:|---|---|---|
| 1073 | P1 | 이미지 | 이미지 탭 확인 |
| 1074 | P1 | 옵션 | 옵션 탭 확인 |
| 1075 | P1 | 판매가 | 판매가 탭 확인 |
| 1077 | P1 | 상세페이지 | 상세페이지 탭 확인 |
| 1088 | P0 | 기본정보 | 카테고리 에러 |
| 1095 | P0 | 업로드 | 업로드 |
| 1096 | P0 | 업로드 | 업로드 성공 |
| 1097 | P0 | 업로드 | 업로드 실패 |

### 일반 / 등록상품 / 등록상품 목록 — 7건

| TC# | Prio | Sub-fn | Title |
|---:|---|---|---|
| 1105 | P0 | 상품명 | 등록상품에서 확인 |
| 1106 | P0 | 상품명 | 등록상품에서 확인 |
| 1107 | P0 | 상품명 | 톡스토어 이동 |
| 1108 | P0 | 상품명 | 등록상품 기본 정보 |
| 1109 | P0 | 상품명 | 등록상품 상세에서 오픈마켓 링크 선택 |
| 1110 | P0 | 수정업로드 | 수정업로드 |
| 1112 | P0 | 추가업로드 | 톡스토어 추가 업로드 |

### 일반 / 배송대행지 / 신청서 — 7건

| TC# | Prio | Sub-fn | Title |
|---:|---|---|---|
| 1526 | P0 | 결제 | 결제진행 선택 |
| 1527 | P0 | 결제 | 결제 페이지 |
| 1528 | P0 | 결제 | 결제 진행 |
| 1529 | P0 | 결제 | 벌크 결제 |
| 1530 | P0 | 결제 | 결제 페이지 |
| 1531 | P0 | 결제 | 결제 진행 |
| 1532 | P0 | 결제 | 결제 완료 신청서 |

### 일반 / 회원가입 / (no sub) — 5건

| TC# | Prio | Sub-fn | Title |
|---:|---|---|---|
| 1 | P2 | 이메일 | 윈들리 이메일 회원가입 |
| 2 | P2 | 네이버 | 윈들리 소셜(네이버) 회원가입 |
| 3 | P2 | 네이버 | 윈들리 소셜(네이버) 회원가입 |
| 4 | P2 | 구글 | 윈들리 소셜(구글) 회원가입 |
| 5 | P2 | 구글 | 윈들리 소셜(구글) 회원가입 |

### 일반 / 온보딩 / 가이드 시작 버튼 선택 — 5건

| TC# | Prio | Sub-fn | Title |
|---:|---|---|---|
| 29 | P2 | 구글 | 가이드 진행 |
| 30 | P2 | 구글 | 가이드 1단계 버튼 동작 |
| 31 | P2 | 구글 | 알림 허용 |
| 32 | P2 | 구글 | 마켓 입점 가이드 확인 |
| 33 | P2 | 구글 | 마켓 입점 가이드 버튼 동작 |

### 일반 / 수집상품 / 옵션탭 — 5건

| TC# | Prio | Sub-fn | Title |
|---:|---|---|---|
| 851 | P0 | 옵션그룹 | 체크박스 선택 후 삭제 |
| 852 | P0 | 옵션그룹 | 삭제 재시도 |
| 853 | P0 | 옵션 | 옵션 삭제 |
| 854 | P0 | 옵션 | 체크박스 선택 후 삭제 |
| 855 | P0 | 옵션 | 삭제 재시도 |

### 일반 / 상품 / 상품상세 — 5건

| TC# | Prio | Sub-fn | Title |
|---:|---|---|---|
| 1193 | P0 | 이미지 | 이미지 선번역 설정 |
| 1194 | P0 | 이미지 | 이미지 선번역 설정 |
| 1195 | P0 | 이미지 | 이미지 선번역 설정 |
| 1197 | P0 | 이미지 | 사용 가능한 번역 횟수 소진 후 수집 |
| 1198 | P0 | 이미지 | 사용 가능한 번역 횟수 소진 후 수집 |

### 일반 / 수집상품 / 상품상세 — 4건

| TC# | Prio | Sub-fn | Title |
|---:|---|---|---|
| 944 | P0 | 상품리스크진단 | 리스크가 없을 때 답변 확인 |
| 945 | P0 | 상품리스크진단 | 리스크가 없을 때 답변 확인 |
| 946 | P0 | 상품리스크진단 | 리스크가 없을 때 답변 확인 |
| 947 | P0 | 상품리스크진단 | 리스크가 없을 때 답변 확인 |

### 일반 / 공통설정 / 상세페이지 — 3건

| TC# | Prio | Sub-fn | Title |
|---:|---|---|---|
| 856 | P0 | 워터마크 | 기본설정에서 워터마크 설정 확인 |
| 857 | P2 | 워터마크 | 사이즈 미리보기 |
| 858 | P2 | 워터마크 | 사이즈 미리보기 |

### 일반 / 등록상품 / 삭제모달 — 3건

| TC# | Prio | Sub-fn | Title |
|---:|---|---|---|
| 987 | P2 | 수집상품 | 등록상품 삭제 모달 노출 |
| 988 | P2 | 수집상품 | 삭제 모달 확인 |
| 989 | P2 | 수집상품 | 상품 삭제 |

### 일반 / 기본설정 / 톡스토어 — 3건

| TC# | Prio | Sub-fn | Title |
|---:|---|---|---|
| 1015 | P0 | 배송정보 | 기본설정 톡스토어 확인 |
| 1017 | P0 | 배송정보 | 기본설정 톡스토어 확인 |
| 1018 | P2 | 배송정보 | ? 호버 |

### 일반 / 수집상품 / 벌크 수정 — 3건

| TC# | Prio | Sub-fn | Title |
|---:|---|---|---|
| 1102 | P0 | 상품명 | 상품명 일괄 수정 |
| 1103 | P0 | 상품명 | 상품명 일괄 수정 |
| 1104 | P0 | 상품명 | 상품명 일괄 수정 |

### 일반 / 상품수집 / 아마존 — 2건

| TC# | Prio | Sub-fn | Title |
|---:|---|---|---|
| 346 | P2 | 설정 | 아마존 언어 설정 |
| 347 | P2 | 설정 | 아마존 국가 설정 |

### 일반 / 수집상품 / 업로드 — 2건

| TC# | Prio | Sub-fn | Title |
|---:|---|---|---|
| 859 | P0 | 마켓상품 | 상품 업로드 후 확인 |
| 860 | P0 | 마켓상품 | 상품 업로드 후 확인 |

### 일반 / 수집상품 / 이미지 — 2건

| TC# | Prio | Sub-fn | Title |
|---:|---|---|---|
| 963 | P0 | 배경지우기 | 벌크 이미지 배경지우기 |
| 964 | P0 | 배경지우기 | 단건 이미지 배경지우기 |

### 일반 / 등록상품 / 이미지 — 2건

| TC# | Prio | Sub-fn | Title |
|---:|---|---|---|
| 965 | P0 | 배경지우기 | 벌크 이미지 배경지우기 |
| 966 | P0 | 배경지우기 | 단건 이미지 배경지우기 |

### 일반 / 상세페이지 / 이미지 — 1건

| TC# | Prio | Sub-fn | Title |
|---:|---|---|---|
| 849 | P0 | 이미지에디터 | 상세페이지 확인 |

### 일반 / AI 전세계 상품수집 / 상품 전송 — 1건

| TC# | Prio | Sub-fn | Title |
|---:|---|---|---|
| 986 | P0 | 수집상품 | 수집된 상품 확인 |

### 일반 / 상품상세 / 상세페이지 — 1건

| TC# | Prio | Sub-fn | Title |
|---:|---|---|---|
| 1203 | P1 | 상하단이미지 | 상품 상세에서 확인 |

### 일반 / 수집 / 상품상세 — 1건

| TC# | Prio | Sub-fn | Title |
|---:|---|---|---|
| 1212 | P0 | 상하단이미지 | 상품 상세에서 확인 |

### 일반 / 등록상품 / 상세페이지 — 1건

| TC# | Prio | Sub-fn | Title |
|---:|---|---|---|
| 1213 | P0 | 상하단이미지 | 업로드 후 상세페이지 확인 |

---

## 부록 — 분석 방법

- 엑셀 → `Case No` 컬럼을 unique key 로 1804건 추출 (P0 529 / P1 230 / P2 1045).
- ATC YAML 354 파일 스캔:
  - **handwritten**: `Case No <num>` 또는 `TC <num>` 패턴이 description/comment 에 명시된 파일. 157 파일이 198 TC 를 cover.
  - **skeleton**: 파일 첫 줄에 `auto-generated skeleton` / `자동 생성된 영역 단위 skeleton` 마커 있는 파일. step.id = `tc<num>_...` 패턴. 197 파일이 1182 TC 를 cover (handwritten 과 겹치는 TC 는 handwritten 우선).
- 1804 - (198 + 1182) = **424건이 미등록**.
- 미등록 사유는 (cat/main/sub) 휴리스틱으로 분류 (회원가입/로그인/온보딩 = setup 박제, 외부 OAuth, LLM 비결정, 외부 마켓 의존, 실데이터 의존, 소규모 분산).

## 참고 문서

- `p0-backlog.md` — P0 미작성 280건 영역별 백로그 (2026-05-22 기준)
- `p0-progress.md` — P0 작성 진행 상태 + 다음 세션 trigger (2026-05-27 기준)
- `tc-uncovered-with-reasons.md` — 이전 분석 보고서 (2026-05-22 기준, 1661건 미작성)
- `atc-consolidation-log.md` — ATC 묶기 결정 로그
- `CLAUDE.md (d)` — 새 ATC 추가 절차