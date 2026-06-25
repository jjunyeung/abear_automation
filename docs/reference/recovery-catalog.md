# 복구(Recovery) 카탈로그

> `recoveries/<error_key>.ts` 전수 목록 + 복구 없는 실패 케이스 정리.
> 갱신: 2026-06-25.

## 동작 원리 (전역 자동복구)

`lib/runner.ts` 는 step 이 `{ ok:false, error_key }` 를 반환하면:

1. `step.on_error` 에 그 key 가 있으면 → 그 복구 호출.
2. `on_error` 에 없어도 `recoveries/<error_key>.ts` 파일이 **존재하면** → 자동 복구 호출.
   (즉 `recoveries/` 디렉토리 = 자동복구 허용목록. 파일만 만들면 어느 TC 에서든 자동 연결.)
3. 같은 `(step_id, error_key)` 는 **1회만** 복구 (D12). 복구 후 재개해서 같은 에러 재발 → unhandled("복구 후 재발").
4. 복구 파일이 **없으면** unhandled = 즉시 실패 (복구 불가 케이스는 일부러 파일을 안 만든다).

상세: CLAUDE.md (c) D5/D11, [[project_runner_global_auto_recovery]].

---

## 복구 있는 것 (10개)

### 탭 에러 자동수정 (7개) — 공통 `openTabAndFixErrors(탭명)`

`lib/tab-error-fix.ts` 의 `openTabAndFixErrors` 를 공유한다. 빨간 탭 클릭 → (1) over-limit 카운터(X/Y자) trim, (2) 빨간 에러 배너 메시지("…이하로 입력해주세요" 등) 라벨 매칭 + 값 set/토글. **둘 다 없으면 throw**.

| error_key | 대상 탭 |
|---|---|
| `tab_basic_error` | 기본 정보 |
| `tab_image_error` | 이미지 |
| `tab_option_error` | 옵션 |
| `tab_price_error` | 판매가 |
| `tab_attribute_error` | 상품 속성 |
| `tab_detail_error` | 상세페이지 |
| `tab_upload_settings_error` | 업로드 설정 |

> ⚠️ **공통 한계**: "에러 배너 / over-limit 카운터"가 없는 빨강(예: 옵션그룹·옵션값 구조 에러)은 7개 모두 못 고치고 throw → 복구 실패. 06-22 #10, 06-25 검증의 `tab_option_error` 실패 원인.

### 개별 복구 (3개)

| error_key | 고치는 것 | 메커니즘 | 상태 |
|---|---|---|---|
| `name_too_long` | 상품명 byte 초과 | over-limit 필드 검출 + trim | 동작 |
| `esm_recommend_option_unmatched` | ESM 추천옵션 미설정(업로드 설정 빨강) | `fixEsmRecommendOption` (옵션설정 모달 → 칩 전부 선택 → 생성 → 저장) | ✅ 검증됨 (235778156) |
| `missing_image` | 이미지 누락 | — | ❌ **미구현 스텁** (호출 시 throw) |

---

## 복구 **없는** 실패 케이스 (스케줄에서 관측)

복구 파일이 없어 unhandled 로 실패. 복구 가치 판단:

| error_key | 발생 위치 | 복구 가치 |
|---|---|---|
| `upload_quota_exceeded` | 업로드 trigger (플랜 등록상품수 소진) | ❌ 코드로 불가 — 플랜/슬롯 정리(사람). [[project_upload_quota_exceeded_classification]] |
| `upload_confirm_btn_not_found` | 업로드 "업로드 하기"/재업로드 진행 버튼 미발견 | △ 진짜 셀렉터 문제일 때만 (사용량 초과는 위로 분류됨) |
| `collect_failed` | URL 수집 (타오바오 수집 0건 성공) | ⚠️ 외부 요인 — 재시도 정도 |
| `esm_option_modal_not_opened` | ESM 옵션 모달 안 열림 | △ ESM 미대상/옵션 에러 케이스 — 상품 따라 다름 |
| `error_check_failed` | 쿠팡 에러체크 (옵션/판매가 빨강) | 쿠팡 TC 가 자체 처리(A-Z+보정) 중 |

---

## 정리 후보 (TODO)

- [ ] `missing_image` 스텁 — 실제 구현하거나 파일 삭제(가짜 복구 시도 제거).
- [ ] `tab_option_error` — "배너 없는 옵션 빨강"(옵션그룹/옵션값 구조 에러) 대응으로 `openTabAndFixErrors` 확장.
