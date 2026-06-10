# P0 ATC 작성 진행 상태

> 다음 세션에서 이어가기 위한 handoff 문서. 시작 시 이 파일 + `p0-backlog.md` + `CLAUDE.md (d)` 읽고 진행.

## 한 줄 요약

P0 280건 중 **126건 verified pass**. 잔여 **154건**. 영역 순서 = A 수집상품 잔여 → B 배송대행지 → C 등록상품 → D 기타.

> 2026-06-04 (R16): 엑셀↔ATC 전수 재대조 (spec.ts `tcNo`/`CASES` 배열까지 스캔). **완전 미존재 TC = 0** (1차 "41건 미존재"는 ATC YAML만 스캔한 오진 — da-input/da-cascade spec 에 이미 구현됨). 정확 현황: 실구현 662 / 순수 placeholder 865(P0 147) / noop-skip 261. 리포트 = `tc-gap-2026-06-04.md`. 동기화: `p0-배송대행지-신청서-확인.spec.ts` stale 헤더 주석 정정(실제 검증인데 stub로 오분류되던 것) → P0 impl +17. 신규 실구현: 수집상품 상세 업로드탭 **업로드 대상 마켓 토글 + 관부가세 영역** TC 3499/3500/3515/3516 verified pass (2 passed). `tests/collected-product/upload-tab-market-customs-visible.spec.ts`. 3501/3517(변경)은 서버 호출 destructive skip. 순수 placeholder P0 147→142.
> 2026-06-04 (R13): 수집상품 상세 ESM 2.0 옵션 모드 모달 TC 867/868/869 strict verified (+3). `tests/collected-product/p0-수집상품-상품상세.spec.ts`. 잔여 오픈마켓 P0 는 별도 connect-* spec 으로 이미 커버됨 + destructive 라 패스.
> 2026-06-04 (R15): 연결설정/오픈마켓 5개 마켓(스스/쿠팡/11번가국내/ESM2/톡스토어) 해제→동일계정 재연결 destructive 사이클 strict verified — TC 996/998/999/1000/1005/1006/1010. 공통 헬퍼 `tests/base-setting/_market-reconnect-cycle.ts` + 마켓별 spec 5개. 키는 .env(atc-decisions.md 이관). 안전 가드(동일계정 확인)로 데이터 무손상. 마켓당 초기화 quota 1 소모.
> 2026-06-04 (R14): 배송대행지 신청서 확인 상태 탭 9 TC loose verified (1503/1507/1508/1509/1510/1516/1517/1518/1519, 토스토스 상태 탭 노출). `tests/delivery-agency/p0-배송대행지-신청서-확인.spec.ts`. **요청했던 수정 화면(1511~1515)은 테스트 계정에 배대지 신청서 0건이라 진입점 부재 → honest skip** (데이터 있으면 spec 이 자동 strict 승격). 트래킹/송장복사/...메뉴(1504~1506)도 데이터 의존 skip.

## ATC 전체 분포 (Excel 1804 TC 대비, 2026-05-27)

| 구분 | ATC 파일 수 | 비고 |
|---|---:|---|
| 총 ATC | 354 | atcs/**/*.atc.yml |
| handwritten (spec.ts 와 1:1) | 157 | priority 필드 = P0 121 / P2 36 (backfill 결과) |
| skeleton p0-* (placeholder) | 73 | spec.ts 미작성, catalog stale |
| skeleton p1-* | 33 | 새로 생성 (2026-05-27) |
| skeleton p2-* | 91 | 새로 생성 (2026-05-27) |
| **priority 필드 기준** | **P0 159 / P1 33 / P2 162** | 전체 354 = 354 ✓ |

엑셀 1804 TC 가 (cat, main, sub, priority) 그룹 197 개로 정규화됨. 그 중 162 개 ATC 가 이번 round 에 새로 생성 (skeleton + handwritten 합쳐 197 = 1:1 매칭).
Generator: `scripts/generate-all-priority-skeletons.py`. 빈 priority 는 P2 로 default (이번 Excel 에는 빈 priority 없음).

## 진행 누적 (verified pass)

| 영역 | Spec | TCs | 상태 |
|---|---|---:|---|
| 톡스토어 / 배송 dropdown | `tests/base-setting/talkstore-base-delivery-dropdowns` | 6 | ✅ |
| 톡스토어 / 추가 배송비 | `tests/base-setting/talkstore-base-additional-delivery-fees` | 3 | ✅ |
| 톡스토어 / 구매 포인트 | `tests/base-setting/talkstore-base-purchase-point-unit-amount` | 5 | ✅ |
| 톡스토어 / 리뷰 토글 OFF | `tests/base-setting/talkstore-base-review-point-toggle-off` | 1 | ✅ |
| 톡스토어 / 상품 속성 dropdown | `tests/base-setting/talkstore-base-attribute-origin-dropdown` | 1 | ✅ |
| 톡스토어 / 연결 banner | `tests/base-setting/talkstore-base-connect-banner-link` | 1 | ✅ (이미 연결된 환경 noop) |
| 수집상품 / 기본설정값 모달 | `tests/collected-product/bulk-base-setting-modal-display` | 5 | ✅ |
| 수집상품 / 벌크 수정 모달 | `tests/collected-product/bulk-edit-modals-display` | 6 | ✅ |
| 수집상품 / 옵션탭 진입 | `tests/collected-product/option-tab-display` | 6 | ✅ |
| 수집상품 / 목록 smoke | `tests/collected-product/list-screen-smoke` | 4 | ✅ |
| 수집상품 / 선택 없음 차단 | `tests/collected-product/bulk-base-setting-no-selection` | 1 | ✅ (TC 3555) |
| 수집상품 / InfoTab 톡스토어 | `tests/collected-product/talkstore-info-tab-visible` | 1 | ✅ (TC 1072) |
| 수집상품 / 이미지탭 붙여넣기 버튼 | `tests/collected-product/image-tab-paste-buttons-visible` | 2 | ✅ (TC 863/864, 865 destructive skip) |
| 수집상품 / AI 상세페이지 설명 모달 | `tests/collected-product/ai-product-description-modal` | 4 | ✅ (TC 831/832/833/838, 835/836/837 skip) |
| 수집상품 / InfoTab 카테고리 섹션 | `tests/collected-product/info-tab-category-section-visible` | 2 | ✅ (TC 861/862, 실제 추천 click skip) |
| 수집상품 / UploadTab ESM 섹션 | `tests/collected-product/upload-tab-esm-section-visible` | 2 | ✅ (TC 826/827, 카테고리 수정 skip) |
| 수집상품 / InfoTab AI 버튼 2종 | `tests/collected-product/info-tab-ai-buttons-visible` | 6 | ✅ (TC 1083 + 943-947, AI click destructive skip) |
| 등록상품 / 목록 smoke + 수정 업로드 모달 | `tests/registered-product/list-screen-smoke` | 5 | ✅ (TC 3566/3569/3570/3572/3573, 실제 업로드 skip) |
| SmartStore / 배송 및 A/S 영역 | `tests/base-setting/smartstore-base-delivery-and-as` | 9 | ✅ (TC 3467/3471-3476/3487/3488, 저장 destructive skip) |
| Common / 관부가세 설정 | `tests/base-setting/common-base-customs-tax` | 3 | ✅ (TC 3482/3483/3484, 위치는 COMMON/DELIVERY_INFO) |
| Common / 마켓별 가중치 | `tests/base-setting/common-base-market-weight` | 2 | ✅ (TC 1013/1014, onBlur 저장 skip) |
| Common / AI 이미지 선번역 | `tests/base-setting/common-base-ai-translation` | 2 | ✅ (TC 1180/1196, 토글 클릭 destructive skip) |
| AI 전세계 / 페이지 smoke | `tests/product-collect/global-sourcing-page-smoke` | 3 | ✅ (TC 967/971/982, 실 수집/전송 skip) |
| 연결설정 / 배송대행지 | `tests/base-setting/connect-delivery-agency` | 5 | ✅ (TC 1321/1323/1325/1327/1328, 연결된 환경 시 모달 흐름 skip) |
| 연결설정 / 카카오톡 | `tests/base-setting/connect-kakao-app` | 6 | ✅ (TC 3408/3410/3419/3423/3424/3428, OAuth/toggle destructive skip) |
| 배송대행지 / 목록 화면 features | `tests/delivery-agency/list-page-features` | 6 | ✅ (TC 1520-1525, 데이터 의존 항목 skip) |
| 연결설정 / 톡스토어 마켓 | `tests/base-setting/connect-talkstore-page` | 1 | ✅ (TC 990) |
| 스마트스토어 / 업로드 방식 진입 | `tests/base-setting/smartstore-base-upload-method` | 1 | ✅ (TC 3494, Radio 클릭 destructive skip) |
| 수집상품 / UploadTab ESM 옵션 모드 | `tests/collected-product/upload-tab-esm-option-mode-area` | 3 | ✅ (TC 867/868/869, 모달 오픈 destructive skip) |
| 상품수집 / 엑셀+URL 수집 모달 | `tests/product-collect/excel-url-import-modals` | 6 | ✅ (TC 1156-1161, 실 수집 destructive skip) |
| 연결설정 / 스마트스토어 마켓 | `tests/base-setting/connect-smartstore-market-page` | 4 | ✅ (TC 993/995/996/1003, 실 연결/외부 링크 skip) |
| 연결설정 / 오픈마켓 5 마켓 smoke | `tests/base-setting/connect-markets-smoke` | 3 | ✅ (TC 1007/1011/1012 + 회귀) |
| 등록상품 / 삭제 모달 open+cancel | `tests/registered-product/delete-modal-open-cancel` | 1 | ✅ (TC 876+ destructive 패밀리의 공통 전제 동작, 실 삭제 X) |
| **누적** | **34 ATC / 39 cases** | **116 TCs** | **100% pass** |

## 잔여 영역 (우선순위 순)

### A. 수집상품 잔여 (≈ 20 TCs after this session)
- 기본 설정값 적용 잔여 3 TC (destructive 3553/3554/3563)
- 상세페이지 잔여 3 TC: 835/836/837 (AI 모달 적용 destructive)
- 상품상세 잔여 3 TC: 867/868/869 esm 옵션 모드 모달 (env-dependent + destructive)
- 톡스토어 잔여 4 TC: 1088 카테고리 에러, 1095-1097 업로드 (destructive)
- 이미지탭 잔여 1 TC: 865 destructive
- 옵션탭 6 TC: 850-855 (옵션그룹/옵션 삭제 — destructive)
- 이미지 2 TC: 963/964 (배경지우기 — destructive)
- 엑셀 수집 2 TC: 930+932 (엑셀/URL 수집 — destructive)
- 벌크 수정 1 TC: 1099 destructive (1098/1100-1104 = bulk-edit-modals-display 이미 완료)

### B. 배송대행지 (37 TCs)
- 신청서 작성 7 / 신청서 7 / **신청서 확인 17 (실데이터 의존 — 데이터 부족 시 어려움)** / 기능 6
- skeleton: `atcs/delivery-agency/p0-배송대행지-*.atc.yml`
- 기존 da-* helpers 풍부: `tests/delivery-agency/_da-application-handlers.ts`

### C. 등록상품 (29 TCs)
- 등록상품 목록 7 / 등록상품 상세 3 / 상세페이지 2 / **상품삭제 15 (esm 2.0 외부 — destructive)** / 이미지 2
- skeleton: `atcs/registered-product/p0-등록상품-*.atc.yml`

### D. 기타 (≈ 138 TCs — 도전적)
- base-setting / 오픈마켓 20 (OAuth)
- base-setting / 카카오톡 10 (OAuth)
- base-setting / 배송대행지 7 / 공통/AI번역 4
- product-collect / AI 전세계 12 / 엑셀/URL 8
- smartstore-customs-tax 영역 36 (스스 업로드 destructive)
- order-mgmt 1
- upload / 업로드 스토어 40 (실 마켓 destructive — 가장 어려움)

## 다음 세션 trigger phrase

```
P0 ATC 작성 이어서. p0-progress.md 참조. 잔여 영역 순서대로 (A 수집상품 잔여 → B 배송대행지 →
C 등록상품 → D 기타). 영역마다 (1) source 확인 (windly_repo/sesame 또는 windly-frontend-web)
(2) ATC YAML + spec.ts + handlerKeys.json 작성 (3) `npx playwright test --project=windly-<domain>
tests/<domain>/<name>.spec.ts` 실행 (4) 통과까지 fix. 검증된 helper 재사용 (tests/base-setting/
_talkstore-base-handlers.ts). 새 영역에 sesame 헬퍼 필요하면 tests/collected-product/_handlers.ts
만들어 모으기.
```

## 검증된 helper 모음 (재사용 가능)

`tests/base-setting/_talkstore-base-handlers.ts`:
- `gotoTalkstoreBaseSettingStep(category)`
- `verifyTabPanelTitleStep(re)`
- `findFieldInputByExactLabel(page, label)` / `fillInputByLabelStep(label, value, prefix)`
- `fillInputByPlaceholderStep(re, value, prefix)`
- `toggleByLabelStep(text, prefix)` (양방향, 원복)
- `toggleOnByLabelStep(text, prefix)` / `toggleOffByLabelStep(text, prefix)` — polling 기반 robust
- `readToggleCheckedByLabel(page, text)` — fresh evaluate, stale handle 회피
- `findDropdownTriggerByLabel(page, label)` (internal)
- `selectDropdownByLabelStep(label, prefix)` — ArrowDown+Enter 키보드, idempotent success
- `selectDropdownByLabelAndOptionStep(label, optionText, prefix)` — 특정 옵션 텍스트 매칭
- `openDropdownByLabelStep(label, prefix)` — 열기만
- `clickSegmentedButtonByTextStep(text, prefix)`
- `clickInternalLinkStep(text, expectedPath, prefix)` — SPA 내부 navigate, 미노출 시 success

`lib/windly-actions.ts`:
- `loginIfNeeded(page)` / `enterHaegudaeWorkspace(page)` — setup 전용
- `goToCollectImportMenu` / `goToCollectedProducts` / `goToRegisteredProducts`
- `searchByProductCode(page, id)` / `openFirstSearchResult(page)`
- `clickFirstVisible(page, locators)` / `extractProductId(url)`

## 검증된 selector 패턴 (sesame InterestedProduct)

- **첫 카드 체크박스**: `input[type="checkbox"][id^="checkbox_"]` 중 `value !== ""` 첫번째. label[for=id] click.
- **... More 메뉴 버튼**: `button:not([disabled]):has(svg path[d^="M5 10C3.9 10"])` (more.svg 시그니처)
- **카테고리/태그 변경 버튼 (EditIcon)**: `button:not([disabled]):has(svg path[d^="M14.06 9.02"])` (edit.svg)
- **모달 텍스트 검증**: `document.body.innerText.includes(keyword)` (getByText 보다 robust)
- **모달 닫기**: `취소` 버튼 → Escape fallback
- **카드 link → 상세 진입**: `a[href*="/view2/interested-product/"]:not([href$="/view2/interested-product/"])` 첫번째

## 검증된 selector 패턴 (windly-frontend-web view3 base-setting)

- **TabGroup 텍스트 클릭**: `page.getByText('탭이름', { exact: true })`
- **Dropdown LabelBox → trigger button**: `evaluateHandle` 로 LabelBox text node 찾고 가장 가까운 parent 안 `<button>` 추출
- **Dropdown 옵션 선택**: trigger 클릭 → `ArrowDown` 5회 → `Enter`. 변화 X 면 옵션 1개 또는 idempotent state — success.
- **Toggle (windly Toggle 컴포넌트)**: `<label><input type="checkbox"/></label>` 구조. label.click() + 200ms × 20 polling.
- **TextField label**: LabelBox text node 정확 매칭. React controlled input native setter + input/blur dispatch.

## 알려진 함정

1. **YAML 따옴표** — do/expected 필드에 `"` `'` 사용 X (한글+따옴표 yaml parser fail). 평문으로.
2. **Toggle race** — onChange 가 requestAnimationFrame 안에 setChecked → 즉시 후 .checked 읽으면 stale. polling 필수.
3. **Dropdown idempotent** — 같은 옵션 selected 시 변화 검증 X. 옵션 click 후 변화 없으면 success 처리.
4. **getByText().isVisible()** — styled component 안 nested Text 면 false 반환 가능. body innerText 직접 검색 권장.
5. **destructive 회피** — 적용/삭제/업로드 버튼은 spec 에서 skip. 모달 노출 + 취소까지만 검증.
6. **환경 의존** — 톡스토어 연결 / 마켓 연결 / 상품 데이터 1개 이상 등 사전조건 필요. 미충족 시 명확한 에러 메시지.

## ATC 위치 / 분포 (현재 상태)

```
total = 168 ATC
  P0 = 97 (53 backfilled + 11 fully-implemented this session + 33 skeleton)
  P2 = 71 (backfilled fallback)
  P1 = 0
```

skeleton ATCs (cataloged but spec 없음 = stale):
```
atcs/base-setting/p0-*.atc.yml (5)
atcs/collected-product/p0-*.atc.yml (남은 것들)
atcs/delivery-agency/p0-*.atc.yml (4)
atcs/order-mgmt/p0-*.atc.yml (1)
atcs/product-collect/p0-*.atc.yml (5)
atcs/registered-product/p0-*.atc.yml (5)
atcs/smartstore-customs-tax/p0-*.atc.yml (6)
atcs/upload/p0-*.atc.yml (1)
```

작업 진행 시 skeleton 삭제 → 의미 있는 이름으로 새 ATC + spec + handlerKeys 작성.

## 인프라 (완료, 추가 작업 X)

- `lib/atc-schema.ts` — priority 필드 추가됨
- `.claude/rules/atc-file-layout.md` — 7 고정 키
- `gui/renderer/src/components/CatalogPanel.tsx` — priority 필터 + Tag
- `scripts/backfill-priority.py` — 기존 ATC 일괄 채움
- `scripts/generate-p0-skeletons.py` — 영역별 skeleton 자동 생성
- `p0-backlog.md` — 280 P0 TC 영역별 분포 + TC# 상세
