# ATC 2차 작업 — 결정 + 데이터 입력 폼

> 채우는 법: 각 결정의 빈칸에 `(a) / (b) / (c) / (d)` 중 하나 적기. API 키는 빈 따옴표 안에 채우기. 모르면 비워둬도 OK (그 항목은 noop 유지).

---

## A. 검증 정책

### 결정 1 — loose verified 163 영역을 strict 로 채울지?

```
답: a 하고 b
```

- (a) 가장 자주 회귀 발생하는 영역만 (등록상품 / 수집상품 / 배대지 우선)
- (b) 전 영역 다 strict 채우기 (약 60시간)
- (c) 그대로 두고 다음으로 (loose 만으로 sanity OK)
- 영역 우선순위가 (a) 라면 추가로 직접 적기: `__________________________`

### 결정 2 — 새 ATC 의 default 검증 수준?

```
답: a
```

- (a) strict default (selector 까지 매핑)
- (b) loose default (페이지 진입만)
- (c) skeleton 그대로 (noop only)

---

## B. destructive 자동화 정책

### 결정 3 — 실 마켓에 destructive 자동화 가능?

```
답: a
```

- (a) **테스트 환경 전용 마켓 계정 보유** → 자동 업로드/삭제 OK
- (b) **dry-run mode** 만 (실 호출 X, UI 흐름만)
- (c) **수동 검증 only** (noop 유지)

### 결정 4 — 윈들리 자체 destructive (상품 삭제 / 동기화) 정책?

```
답: a
```

- (a) 매 ATC 실행 전 fixture 초기화 (테스트 상품 자동 생성)
- (b) shared 환경에 누적 (별도 cleanup cronjob)
- (c) 수동 검증 only

### 결정 5 — API key / OAuth 토큰 보관 방법?

```
답: a
```

- (a) `.env` 파일 (현재 패턴)
- (b) 1Password / Vault 연동
- (c) 매번 사용자 prompt

---

## C. AI / 비결정 응답 mock 정책

### 결정 6 — AI 대표이미지 생성 (스튜디오) 검증?

```
답: a
```

- (a) 응답 mock — 고정 이미지 반환
- (b) 결과 무관 — "이미지가 생성됨" 만 확인
- (c) noop 유지

### 결정 7 — AI 번역 (이미지 선번역 / 텍스트) 검증?

```
답: a
```

- (a) 입력 → 출력 길이만 검증
- (b) mock fixture (고정 번역)
- (c) noop 유지

### 결정 8 — AI 챗봇 (view2 / view3) 검증?

```
답: a
```

- (a) 입력 → 응답 받음만 확인
- (b) mock fixture
- (c) noop 유지

### 결정 9 — AI 전세계 상품수집 (글로벌 소싱) 검증?

```
답: c
```

- (a) 추천 결과 1개 이상 받음만 확인
- (b) mock 데이터
- (c) noop 유지

---

## D. OAuth 정책

### 결정 10 — 네이버 / 카카오 / 구글 로그인 검증?

```
답: 그냥 로그인만 되는지 확인
```

- (a) **storageState** — 한 번 수동 로그인 후 세션 박제 → 재사용
- (b) **manual fallback** — 자동화 멈춤 + 사용자 수동 진행
- (c) noop 유지 (setup 으로 박제)

---

## E. sweep ATC 의 Case No 정책

### 결정 11 — 41 미커버 해소 방법?

```
답: a 코멘트를 참고해서 다음작업 이어갈 수 있게
```

- (a) sweep ATC 본문에 `# Case No: X, Y, Z` 코멘트 추가 (간단, 30분)
- (b) handlerKeys.json 옆에 `covers.json` 신설 (구조적)
- (c) sweep 을 작은 ATC 로 쪼개기 (큰 작업)

---

## 🔑 마켓 API 키 입력

> 결정 3이 (a) 일 경우만 필요. `.env` 에 추가될 항목. 모르면 비워두기 (해당 마켓 destructive 는 noop 유지).

### 스마트스토어 (네이버 커머스 API)

```
SMARTSTORE_SELLER_ID="ncp_1ot120_01"
```

### 쿠팡 (쿠팡 윙)

```
COUPANG_ID="junjia430"
COUPANG_CODE="A01147709"
COUPANG_ACCESS_KEY="651d0f9d-ca14-4aab-a70e-04ecdb0f34e9"
COUPANG_SECRET_KEY="60f7164a744d7ddb1bd33c15d9c2c56d40ab3050"
```

### 11번가 글로벌

```
사용 x
```

### 11번가 국내

```
ELEVENSTREET_DOMESTIC_API_KEY="8bee2242dfeb7861d516167f4718e6be"
```

### ESM 2.0 (옥션 / 지마켓)

```
ESM2.0_AUCTION_ID="junjia430"
ESM2.0_GMARKET_ID="junjia430"
```

### 옥션 1.0

```
사용 X
```

### 롯데온

```
사용 X
```

### 인터파크

```
사용 X
```

### 위메프

```
사용 X
```

### 톡스토어

```
TALKSTORE_OPENAPI_KEY="88c63c37089bcf8bb89f709e098f589c"
TALKSTORE_CHANNEL_ID="clap"
```

---

## 🔐 OAuth 계정 / 토큰

> 결정 10이 (a) `storageState` 일 경우만 필요.

> **마스터 자격증명 (2026-06-01 사용자 갱신)**:
> - 아이디 (네이버 / 구글 / 윈들리 OAuth 테스트 공용): `john_dk`
> - 비밀번호: `asdf1234!`
>
> 기존 폼에 있던 base64 인코딩 문자열은 placeholder 였음. 위 평문 값을 .env 에 그대로 사용.

### 네이버 (회원가입 / 로그인 검증)

```
NAVER_TEST_EMAIL="john_dk"
NAVER_TEST_PASSWORD="asdf1234!"
```

### 카카오 (카카오톡 주문알림 연결)

```
KAKAO_TEST_EMAIL="choijunyoung98@gmail.com"
```

### 구글 (회원가입 / 로그인 검증)

```
GOOGLE_TEST_EMAIL="johnchoi980430@gmail.com"
GOOGLE_TEST_PASSWORD="Jun430819!"
```

---

## 💳 결제 데이터

> 결정 3 또는 결정 4 가 (a) 일 경우 필요.

### 윈비 (윈들리 자체 결제 단위 — AI 대표이미지 / 번역 차감)

```
WINBI_TEST_BALANCE=""              # 예: 100000 (자동 충전 정책 시)
WINBI_AUTO_REFILL=""               # (a) 자동 충전 / (b) 부족 시 fail / (c) noop
```

### 플랜 결제

```
TOSS_PAYMENTS_SANDBOX_KEY=""       # 테스트 결제 안 발생
TOSS_PAYMENTS_SANDBOX_SECRET=""
TEST_CREDIT_CARD_NUMBER=""         # 토스 sandbox 테스트 카드
TEST_CREDIT_CARD_EXPIRY=""
TEST_CREDIT_CARD_CVC=""
```

---

## 📋 환경 데이터 보유 여부

> "있음" / "없음" / "셋업 가능" 중 하나 적기.

### 수집상품 데이터

```
수집된 상품 ≥ 5건 보유: 
영역: collected-product 64 영역
```

### 등록상품 데이터

```
등록된 상품 ≥ 5건 보유: 
- 스마트스토어 등록 상품 ≥ 1건: 
- 쿠팡 등록 상품 ≥ 1건: 
- 11번가 등록 상품 ≥ 1건: 
- ESM 등록 상품 ≥ 1건: 
- 롯데온 등록 상품 ≥ 1건: 
- 톡스토어 등록 상품 ≥ 1건: 
```

### 주문 데이터

```
주문 ≥ 3건 (각 상태별 1건 이상):
- 신규주문 ≥ 1: 
- 배송준비중 ≥ 1: 
- 배송중 ≥ 1: 
- 배송완료 ≥ 1: 
```

### 배송대행지 신청서

```
배대지 신청서 ≥ 3건 (퀵스타 + 토스토스):
퀵스타 계정 보유: 
토스토스 계정 보유: 
```

### AI 분석 (상품 순위 분석)

```
분석 요청 데이터 ≥ 3건: 
```

### 콘텐츠 / 미디어

```
테스트 상품 이미지 (jpg/png) ≥ 5장 경로: 
테스트 상세페이지 HTML 경로: 
테스트 엑셀 (상품수집/등록상품 형식) 경로: 
타오바오 URL pool ≥ 5건: data/url-pool.txt (기존 있음)
티몰 URL pool ≥ 5건: 
라쿠텐 URL pool ≥ 5건: 
```

---

## ✏️ 자유 메모 (추가 결정 / 제약 / 우선순위)

```

비어있는건 테스트에 크게 문제없으니까 비운거임 나중에 필요하면다시 추가할께
```

---

## 🚀 채운 후 진행 방법

1. 이 파일 다 채우고 저장
2. Claude 에게 "atc-decisions-form.md 채웠어. R8 시작" 하면 → 결정 기준으로 R8 실행 (가장 ROI 큰 작업부터)
3. API 키 / OAuth 는 자동으로 `.env` 에 추가 + `.gitignore` 확인

