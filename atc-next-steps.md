# ATC 2차 작업 — 해야할 것 / 결정 필요 / 필요 데이터

> 마라톤 R1-R7 종료 후 (2026-06-01) 다음 단계 정리
> 참조: `atc-marathon-progress.md` (진행 로그), `atc-coverage-report.md` (커버리지)

---

## 📊 현재 상태 (마라톤 종료 시점)

| 검증 수준 | TC 수 | 비율 | 의미 |
|---|---:|---:|---|
| ✅ **strict verified** | 79 | 4.4% | selector / 텍스트 매치 — 진짜 동작 검증 |
| ✅ **loose verified** | 163 | 9.0% | 진입 + body length ≥ 10 — SPA hydration 만 검증 |
| 🟨 **noop skip** | 1521 | 84.3% | destructive / 외부 마켓 / AI / OAuth / 환경 의존 — log only |
| ❌ **미커버** | 41 | 2.3% | sweep ATC 흡수 but Case No 미명시 |
| **합계** | **1804** | **100%** | |

---

## 🎯 2차 작업 To-Do (순서대로)

### A. 빠른 정리 (사용자 결정 X 만 있으면 즉시 진행 가능)

| # | 작업 | 영향 | 추정 시간 |
|---:|---|---|---|
| A1 | 41 미커버 해소 — sweep ATC 에 `Case No X, Y, Z` 코멘트 추가 (`atcs/delivery-agency/da-input.atc.yml` + `da-cascade.atc.yml` 등) | +41 cover (97.7% → 100%) | 30분 |
| A2 | R6+R7 loose verify (157개) 의 정직성 표기 — `verifyEntered` 함수명을 `verifyPageReachable` 로 rename (의미 명확화) | 코드 가독성 | 15분 |
| A3 | R3 generator script 정리 — `/tmp/gen-*.py` 를 `scripts/atc-gen/` 으로 이동 + README | 재사용 가능 | 15분 |

### B. 중간 수공 (사용자 결정 필요 — B.1 참조)

| # | 작업 | 영향 | 추정 시간 |
|---:|---|---|---|
| B1 | windly-shell 영역 strict verify 채우기 (19 영역 — R6 patched, 모두 loose) | +19~38 strict verified | 약 10시간 |
| B2 | base-setting 영역 strict verify 채우기 (6 영역 — R6 patched) | +6~12 strict | 약 3시간 |
| B3 | collected-product 영역 strict verify 채우기 (64 영역 — R7 patched, 가장 큼) | +64~128 strict | 약 30시간 |
| B4 | product-collect 영역 strict verify 채우기 (37 영역 — 외부 마켓 페이지 진입) | +37~74 strict | 약 18시간 |

→ **B1~B4 합계 = 약 60시간 → strict verified 약 +130~250 추가 → 누적 strict 약 210~330 (12~18%)**

### C. 큰 작업 (사용자 결정 필요 — B.2 참조)

| # | 작업 | 영향 | 비고 |
|---:|---|---|---|
| C1 | destructive flow 자동 검증 (실 마켓 업로드 / 삭제 / 동기화) | +약 400 strict 가능 | 테스트 마켓 계정 필요 |
| C2 | AI 응답 mock fixture (대표이미지 / 번역 / 챗봇) | +약 100 strict | mock 정책 결정 + 작성 |
| C3 | 외부 OAuth (네이버 / 카카오 / 구글) | +약 30 strict | storageState 또는 manual fallback |
| C4 | 결제 destructive (윈비 충전 / 플랜 결제) | +약 30 strict | dry-run 모드 또는 테스트 결제 정책 |

---

## ❓ 사용자 결정 필요 항목

### B.1 검증 수준 정책

> **결정 1**: loose verified 163 영역을 strict 로 채울지 (B1~B4 작업)?
- (a) 가장 자주 회귀 발생하는 영역만 (예: 등록상품 / 수집상품 / 배대지)
- (b) 전 영역 다 strict 채우기 (약 60시간)
- (c) 그대로 두고 다음으로 (loose 만으로 sanity OK)

> **결정 2**: 새 ATC 의 default 검증 수준?
- (a) strict 가 default (selector 까지 매핑)
- (b) loose 가 default (페이지 진입만)
- (c) skeleton 그대로 (noop only)

### B.2 destructive 자동화 정책 (가장 큰 영향)

> **결정 3**: 실 마켓 (스스/쿠팡/11번가/ESM/롯데온/인터파크/위메프/톡스토어) 에 자동화가 destructive 동작 가능?
- (a) **테스트 환경 전용 마켓 계정** 보유 → 자동 업로드/삭제 OK
- (b) **dry-run mode** 만 지원 (실 호출 X, UI 흐름만)
- (c) **수동 검증 only** (자동화 안 함, noop 유지)

> **결정 4**: 윈들리 자체 destructive (상품 삭제 / 동기화 / 데이터 변경) 정책?
- (a) 매 ATC 실행 전 fixture 초기화 (테스트 상품 자동 생성)
- (b) shared 환경에 누적 (데이터 정리는 별도 cronjob)
- (c) 수동 검증 only

> **결정 5**: 외부 마켓 API key / OAuth 토큰 보관 방법?
- (a) `.env` 파일 (현재 패턴) — 사용자 직접 관리
- (b) 1Password / Vault 연동 fixture
- (c) 매번 사용자 prompt

### B.3 AI / 비결정 응답 mock 정책

> **결정 6**: AI 대표이미지 생성 (스튜디오) 검증 방식?
- (a) **응답 mock** — fixture 로 고정 이미지 반환
- (b) **결과 무관 검증** — "이미지가 생성됨" 만 확인, 콘텐츠 검증 X
- (c) noop 유지

> **결정 7**: AI 번역 (이미지 선번역 / 텍스트 번역) 검증?
- (a) 입력 → 출력 길이만 검증 (콘텐츠 X)
- (b) mock fixture (고정 번역)
- (c) noop 유지

> **결정 8**: AI 챗봇 (view2 / view3) 검증?
- (a) 입력 → 응답 받음만 확인 (콘텐츠 X)
- (b) mock fixture
- (c) noop 유지

> **결정 9**: AI 전세계 상품수집 (글로벌 소싱) 검증?
- (a) 추천 결과 1개 이상 받음만 확인
- (b) mock 데이터
- (c) noop 유지

### B.4 외부 OAuth 정책

> **결정 10**: 네이버 / 카카오 / 구글 로그인 검증?
- (a) **storageState** — 한 번 수동 로그인 후 세션 저장 → 재사용
- (b) **manual fallback** — 자동화 일시 멈춤 + 사용자 수동 진행
- (c) noop 유지 (1회성 setup 으로 박제)

### B.5 sweep ATC 의 Case No 정책 (41 미커버)

> **결정 11**: 41 미커버 해소 방법?
- (a) sweep ATC 본문에 `# Case No: X, Y, Z` 코멘트 추가 (간단)
- (b) handlerKeys.json 옆에 `covers.json` 신설 (구조적)
- (c) sweep 을 작은 ATC 들로 쪼개기 (가장 깔끔하지만 큰 작업)

---

## 📦 필요 데이터 (자동 검증 진행 시)

### D1. 윈들리 본체 환경 (이미 있음 → 확인 only)

| 항목 | 현재 | 비고 |
|---|---|---|
| 윈들리 로그인 이메일 / 비밀번호 | `.env` `WINDLY_LOGIN_EMAIL/PASSWORD` | setup 완료 |
| 윈들리 Chrome 확장 경로 | `.env` `WINDLY_EXTENSION_PATH` | `automation/extension` |
| 해구대 워크스페이스 | 자동 진입 | `.playwright-userdata` 박제 |

### D2. 테스트 데이터 (자동 검증 시 환경 필요)

| 항목 | 영향 영역 | 현재 상태 | 필요 여부 |
|---|---|---|---|
| **수집된 상품** ≥ 5건 | collected-product / 64 영역 | ⚠️ 환경 의존 | 자동 fixture 또는 한번 수동 셋업 |
| **등록된 상품** ≥ 5건 (각 마켓) | registered-product / 14 영역 | ✓ 21건 있음 (R2 확인) | 충분 |
| **주문 데이터** ≥ 3건 (신규주문 / 배송준비중 / 배송중 / 배송완료 각 1건+) | order-mgmt / 24 TC | ⚠️ 환경 의존 | 수동 주문 또는 테스트 마켓 |
| **배송대행지 신청서** ≥ 3건 (퀵스타 / 토스토스 각) | delivery-agency / 17 TC | ⚠️ 환경 의존 | 테스트 배대지 계정 |
| **AI 분석 요청 데이터** ≥ 3건 | windly-shell / 상품 순위 분석 | ⚠️ 환경 의존 | 분석 요청 실행 후 누적 |

### D3. 외부 마켓 테스트 계정 (destructive 자동화 시)

| 마켓 | 데이터 종류 | 필요 시점 |
|---|---|---|
| 스마트스토어 | API key (윈들리 connect 패턴) | 업로드/수정 destructive 자동화 |
| 쿠팡 | Vendor ID / API key | 업로드/수정/삭제 자동화 |
| 11번가 (글로벌) | API key | 업로드 자동화 |
| 11번가 (국내) | API key | 업로드 자동화 |
| ESM 2.0 (옥션/지마켓) | 판매자 계정 + 부 OAuth | 업로드/삭제 자동화 |
| 옥션 1.0 | 판매자 계정 | 업로드 자동화 |
| 롯데온 | Vendor 계정 | 업로드 자동화 |
| 인터파크 | API key | 업로드 자동화 |
| 위메프 | API key + 배송정책 ID | 업로드 자동화 |
| 톡스토어 | OpenAPI 인증키 + 채널 ID | 업로드/연결 자동화 |

→ 위 마켓 각각의 **테스트 환경 전용 계정** 이 있어야 destructive 자동화 가능. 없으면 noop 유지.

### D4. 외부 OAuth 계정 (회원가입 / 로그인 검증 시)

| OAuth | 필요 항목 | 사용 영역 |
|---|---|---|
| 네이버 | id/password (또는 storageState) | 로그인 / 회원가입 (windly-shell 5 영역) |
| 카카오 | id/password (또는 OAuth token) | 카카오톡 알림 연결 (base-setting 2 영역) |
| 구글 | id/password (또는 OAuth token) | 로그인 / 회원가입 (windly-shell 2 영역) |

### D5. 결제 테스트 (윈비 / 플랜 결제)

| 항목 | 필요 데이터 | 사용 영역 |
|---|---|---|
| 윈비 (윈들리 자체 결제 단위) | 테스트 충전량 ≥ 100,000 | AI 대표이미지 생성 / 번역 차감 |
| 플랜 결제 카드 | 테스트 카드 번호 | 플랜결제 모달 (windly-shell 2 영역) |
| 결제 dry-run 정책 | 토스 페이먼츠 sandbox 키 | 실 결제 안 발생 |

### D6. 콘텐츠 / 미디어 데이터

| 항목 | 필요 데이터 | 사용 영역 |
|---|---|---|
| 테스트 상품 이미지 | jpg/png 파일 ≥ 5장 | 이미지 업로드 (등록상품 / 수집상품 / 워터마크) |
| 테스트 상세페이지 HTML | 1~2 종 | 상세페이지 미리보기 |
| 테스트 상품 URL pool | 타오바오/티몰/라쿠텐 각 5건+ | URL 수집 / 단건 수집 (현재 `data/url-pool.txt` 부분 있음) |
| 테스트 엑셀 파일 | 상품수집/등록상품 형식 | 엑셀 수집 / 엑셀 업로드 |

---

## 🛠 우선순위 추천

### 빠르게 가치 큰 것부터 (시간 vs 영향)

1. **A1** (sweep cover 명시 30분) → 97.7% → **100%** 매칭
2. **A2 + A3** (정리 30분) → 코드 품질 + 재사용성
3. **결정 11** 만 받으면 A1 진행
4. **결정 6/7/8/9** (AI mock 정책) → C2 진행 가능 (+100 strict)
5. **결정 10** (OAuth 정책) → C3 진행 (+30 strict)
6. **결정 3/4/5** (destructive 정책) → C1 진행 (+400 strict, **가장 큼**)
7. **결정 1/2** + B1~B4 → loose → strict 채우기

### 작업량 vs 이득

| 작업 | 시간 | strict +verified | 시간당 이득 |
|---|---:|---:|---|
| A1 (sweep cover) | 30분 | 0 (cover 통계만 +41) | - |
| B1 (windly-shell) | 10시간 | +19~38 | 2~4 / 시간 |
| B2 (base-setting) | 3시간 | +6~12 | 2~4 / 시간 |
| B3 (collected-product) | 30시간 | +64~128 | 2~4 / 시간 |
| B4 (product-collect) | 18시간 | +37~74 | 2~4 / 시간 |
| C1 (destructive) | 40시간 + 결정 | +400 | 10 / 시간 **(최고)** |
| C2 (AI mock) | 15시간 + 결정 | +100 | 7 / 시간 |
| C3 (OAuth) | 5시간 + 결정 | +30 | 6 / 시간 |
| C4 (결제) | 5시간 + 결정 | +30 | 6 / 시간 |

→ **시간 효율로는 C1 (destructive 자동화) 이 압도적**. 단 테스트 마켓 계정 필요.

---

## 📋 한 줄 요약 (다음 라운드 시작 시 trigger)

```
2차 작업 시작. 결정 받기:
1) destructive 정책 (테스트 마켓 계정 있나?) — 결정 3
2) AI mock 정책 — 결정 6/7/8/9
3) OAuth 정책 — 결정 10
4) sweep cover 명시 방식 — 결정 11
5) loose → strict 채우기 우선순위 — 결정 1
받은 답 기준으로 R8 raid (가장 ROI 큰 영역) 시작.
```

## 부록: 도메인별 잔여 작업 영역

### loose verified 163 → strict 채우기 가능 영역

| 도메인 | 영역 (loose) | 큰 영역 |
|---|---:|---|
| collected-product | 64 | p2-수집상품-상품-상세페이지 (183 TC), p2-수집상품-벌크 (22 TC) |
| product-collect | 37 | p2-상품수집-아마존 (11×12 국가), p2-상품수집-타오바오 (12), p2-상품수집-티몰 (12) |
| smartstore-customs-tax | 20 | p0-스스관부가세-수정-업로드 (21 TC), p0-스스관부가세-스마트스토어-배송-및-as (15 TC) |
| upload | 5 | p0-업로드-업로드-스토어 (40), p2-업로드-해구대 (21), p2-업로드-위탁 (18) |
| delivery-agency | 6 | p2-배송대행지-신청서-작성 (40), p1-배송대행지-신청서-작성 (22), p0-배송대행지-신청서-확인 (17) |
| windly-shell | 19 | p2-온보딩-가이드-시작-버튼-선택 (24), p2-온보딩-area (12) |
| base-setting | 6 | p0-기본설정-톡스토어 (36), p2-연결설정-배송대행지 (24) |

### noop only 영역 (verified 0)

→ 모두 destructive / 외부 / AI 영역. 해당 정책 결정 후 자동화 가능.
