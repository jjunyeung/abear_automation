# Windly 웹 코드 맵 — ATC 작성 참고용

> **목적**: `/Users/a1/windly 자동화/windly_repo/` 안 4개 frontend 레포의 코드 위치를 정리.
> ATC(Playwright 자동화 테스트) 짤 때 "이 시나리오는 어느 앱·어디 코드 보면 되지?"를 빠르게 찾기 위한 인덱스.
>
> **조사일**: 2026-04-28
> **레포 위치**: `/Users/a1/windly 자동화/windly_repo/{windly-frontend-web,hub-frontend-web,sesame,koco-frontend-web}/`
> **총 124MB, 4개 React + Vite + TypeScript 앱**

---

## 🗺️ 0. 한눈에 보는 Windly 생태계

### 4개 앱과 도메인

| 앱 | 한 줄 정의 | 도메인 (prod) | 로컬 dev | 경로 prefix |
|---|---|---|---|---|
| **hub-frontend-web** | 인증·계정·홈 대시보드 허브 | `hub.windly.cc` | `:3002` | `/accounts/...`, `/home`, `/settings/...` |
| **windly-frontend-web** | 메인 앱 (수집·검색·상품 관리 신버전) | `app.windly.cc` | `:3001` | `/view3/...` |
| **sesame** | 상품 관리 (수집상품·등록상품 구버전 UI) | `app.windly.cc` | (totoro 포트) | `/view2/...` |
| **koco-frontend-web** | 국내 마켓 통합 관리 (쿠팡/스스/11번가 등) | `alpha-domestic.windly.cc` | `:3000` | `/products/...`, `/settings/...` |

### 핵심 통찰 — 인증·세션이 도메인 가로지름

```
┌─────────────────────────────────────────────────────────────┐
│  *.windly.cc 도메인 전체에 쿠키 공유 (domain: .windly.cc)    │
│                                                               │
│   hub.windly.cc        ← 로그인 폼 여기에만 있음              │
│      ↓ (로그인 후 쿠키 set, redirect)                         │
│   app.windly.cc/view3  ← windly-frontend-web                  │
│   app.windly.cc/view2  ← sesame (같은 도메인, 다른 경로)      │
│   alpha-domestic.windly.cc ← koco (도메인 다르지만 동일 쿠키 OK) │
│                                                               │
│  401 발생 시 어느 앱에서든 hub.windly.cc/accounts/login?      │
│  redirect=<원래 URL>로 자동 리다이렉트                        │
└─────────────────────────────────────────────────────────────┘
```

**ATC 의미**:
- **로그인 자동화는 hub-frontend-web 한 곳만 다루면 됨**
- **storageState로 쿠키 한 번 저장해 두면 4개 앱 전부 공유**
- 다른 앱들에는 로그인 폼 자체가 없음 — 인증 안 되면 hub로 튕겨나감

---

## 🎯 1. 시나리오 → 코드 위치 (Cross-reference)

기존 ATC들이 다루는 시나리오를 어느 앱·디렉토리에서 구현하는지:

| 시나리오 (ATC 관점) | 어느 앱? | 핵심 코드 경로 |
|---|---|---|
| **로그인 / 회원가입** | hub | `hub-frontend-web/src/features/Account/Login/` |
| **워크스페이스(해구대) 진입** | hub | `hub-frontend-web/src/features/Home/` |
| **헤더·사이드바 네비게이션** | hub + windly | `hub/src/features/MainHeader/`, `windly-frontend-web/src/features/Layout/` |
| **상품 수집 (Chrome 확장 연동)** | windly | `windly-frontend-web/src/features/ProductImport/` |
| **1688/타오바오 상품 검색** | windly | `windly-frontend-web/src/features/SearchProduct/` |
| **수집상품 목록** | sesame **and** windly | `sesame/src/features/InterestedProduct/` (구), `windly/src/features/Products/` (신) |
| **상품 상세 (탭 점검)** | sesame **and** windly | `sesame/src/features/ProductDetail/`, `windly/src/features/Products/Detail/` |
| **에러체크** | sesame / windly | `features/ProductDetail/` 내 에러 표시 + API `POST /v1/products/{id}/validate` |
| **이미지 탭 가공** | windly / koco | `windly/src/features/Products/Detail/Tabs/`, `koco/src/features/Product/Image/` |
| **카테고리/배송/속성/이름 등 탭** | windly / koco | 동상. koco는 마켓별로 분리된 form |
| **마켓 업로드 (전체)** | windly | `windly-frontend-web/src/features/Products/Upload/` |
| **마켓 업로드 (국내 단건)** | koco | `koco-frontend-web/src/features/Product/Upload/` |
| **등록상품 목록** | sesame **and** windly | `sesame/src/features/RegisteredProduct/`, `windly/src/features/Products/RegisteredProducts/` |
| **마켓별 base 설정 (쿠팡/스스/11번가/...)** | koco | `koco-frontend-web/src/features/Settings/Base/{Coupang,SmartStore,...}/` |
| **결제·구독** | hub + koco | `hub/src/apis/domestic/`, `koco/src/features/Payment/` |
| **판매·주문·클레임** | koco | `koco-frontend-web/src/features/Sales/` |

> **ATC 짤 때 의사결정 흐름**:
> 1. 시나리오가 위 표 어디에 매칭되는지 본다
> 2. 신/구 둘 다 있으면 → 사용자에게 확인 ("/view3 신버전 / /view2 구버전 어느 거?")
> 3. 매칭된 코드 경로를 grep해서 selector·라우트·폼 필드 추출

---

## 🎨 2. 통일된 Selector 전략

### 데이터 속성 현황 (조사 결과)
- **모든 4개 앱에서 `data-testid` 거의 안 씀** (grep 결과 0건 또는 극소수)
- **MUI / Bear Design / Emotion 조합** → 클래스명은 동적 hash (`css-xxxxxx`) — selector로 쓰기 부적합

### 권장 selector 우선순위 (ATC 코드에서)

```typescript
// 1) Role + 한국어 이름 (가장 안정적)
page.getByRole('button', { name: '수집하기' });
page.getByRole('button', { name: /업로드/i });
page.getByRole('checkbox', { name: '스마트스토어' });

// 2) Label / Placeholder (form input)
page.getByLabel('상품명');
page.getByPlaceholder('이메일을 입력하세요');

// 3) 텍스트 (info/banner/탭 라벨)
page.getByText('에러체크');
page.getByText(/등록상품/);

// 4) 마지막 보루 — CSS (Emotion 클래스는 피하고 구조 selector)
page.locator('aside nav a:has-text("수집상품")');
page.locator('table tbody tr:first-child');

// ❌ 피하기
page.locator('.css-1abc234'); // Emotion 동적 클래스 — 빌드마다 바뀜
page.locator('[data-testid=...]'); // 거의 없음
```

### 한국어 버튼 텍스트 표준 어휘 (자주 등장)
- **수집·관리**: 수집하기, 검색하기, 저장, 저장 및 다음, 삭제, 닫기
- **업로드**: 업로드, 전 마켓 업로드, 업로드 확인, 다시 시도
- **에러**: 에러체크, 자동 수정, 무시
- **인증**: 로그인, 회원가입, 비밀번호 재설정

### 마켓 선택 (체크박스/토글)
- "스마트스토어", "쿠팡", "톡스토어", "11번가", "인터파크"(=ESM2), "롯데온"
- `getByRole('checkbox', { name: '스마트스토어' })` 패턴

---

## 🔐 3. 인증·세션 (storageState 작성에 핵심)

### 토큰 저장 방식
- 모든 앱이 **쿠키 기반**:
  - 이름: `windly_access_token`, `windly_refresh_token`
  - 도메인: `.windly.cc`
  - sameSite: `none`, secure: `true`, **HttpOnly 아님** (JS에서 읽음)
  - 7일 유효
- 모든 앱이 **`hub.windly.cc/accounts/login?redirect=<원래 URL>`로 리다이렉트**해서 미인증 처리

### 401 처리 위치 (각 앱 axios interceptor)
- `windly-frontend-web/src/axios/config.ts`
- `hub-frontend-web/src/axios/utils.ts`
- `sesame/src/axios/config.ts:60` (line 60에 redirect 코드)
- `koco-frontend-web/src/axios/config.ts`

### Playwright `auth.setup.ts` 작성 가이드 (REFACTOR-PLAN §1과 직접 연관)

```typescript
import { test as setup, expect } from '@playwright/test';

setup('login + workspace', async ({ page }) => {
  // 1. hub의 로그인 페이지 직접 진입
  await page.goto('https://hub.windly.cc/accounts/login');

  // 2. hub-frontend-web/src/features/Account/Login/index.tsx 참고
  //    → src/features/Account/Form/Email.tsx의 react-hook-form register
  //    필드명: 'email', 'password' (react-hook-form name)
  //    실제 selector는 input[name=email] 또는 getByLabel('이메일')
  await page.getByPlaceholder('이메일').fill(process.env.WINDLY_LOGIN_EMAIL!);
  await page.getByPlaceholder('비밀번호').fill(process.env.WINDLY_LOGIN_PASSWORD!);
  await page.getByRole('button', { name: '로그인' }).click();

  // 3. 로그인 성공 = /home으로 자동 리다이렉트
  await expect(page).toHaveURL(/hub\.windly\.cc\/home/);

  // 4. 쿠키 저장 — 이걸로 windly/sesame/koco 모두 인증됨
  await page.context().storageState({ path: '.auth/user.json' });
});
```

> **selector 정확화 팁**: `npx playwright codegen https://hub.windly.cc/accounts/login`을 한 번 돌려 사용자가 클릭 + 입력하면 정확한 selector가 기록됨. 그걸 위 코드의 placeholder/role 부분에 반영.

### 워크스페이스(해구대) 진입
hub의 `/home` 진입 후 워크스페이스 선택이 추가로 필요할 수 있음. `hub-frontend-web/src/features/Home/`의 라우팅·컴포넌트 확인. 보통 자동 진입 또는 첫 워크스페이스 클릭 1회.

---

## 📦 4. 각 앱 상세

### 4.1 windly-frontend-web

**한 줄**: 메인 React 앱 (수집·검색·상품 관리 신버전 UI). `app.windly.cc/view3/...`.

**스택**: Vite 5.4 + React 18.3 + TypeScript 5.8 + Redux Toolkit 2.8 + React Query + Material-UI 5.17 + Emotion. React Router v6 (client routing).

**dev**: `npm run dev` → `https://localhost:3001/view3` (vite 자동 redirect `/` → `/view3`)

**주요 디렉토리**:
| 경로 | 용도 |
|---|---|
| `src/features/ProductImport/` | 상품 수집 UI (Chrome 확장 연동) |
| `src/features/SearchProduct/` | 1688/타오바오 검색 |
| `src/features/Products/` | 수집·등록 상품 목록 + 상세 |
| `src/features/Products/Detail/Tabs/` | 이미지·카테고리·배송·속성·이름 가공 탭 |
| `src/features/Products/Upload/` | 마켓 업로드 |
| `src/features/Products/RegisteredProducts/` | 등록상품 목록 |
| `src/features/GlobalSourcing/` | 해외구매대행 |
| `src/features/Layout/` | 헤더·사이드바 공통 레이아웃 |
| `src/components/` | Button, TextField, Modal, Dialog 등 |
| `src/apis/<domain>/apis.ts` | API 호출 모듈 (products, auth, analysis, delivery, ...) |
| `src/axios/config.ts` | Axios 인스턴스 + 401 인터셉터 |
| `src/slices/` | Redux slices |
| `src/providers/ConfirmModalProvider.tsx` | 확인 모달 Provider |

**API base URL**:
- `VITE_GLOBAL_API_URL` (해외 API 기본)
- `VITE_DOMESTIC_API_URL` (국내 API)
- `VITE_AUTH_API_URL`
- prod: `https://app-api.windly.cc/api`

**대표 endpoint**:
- 상품 목록: `GET /api/products?limit=20&offset=0`
- 상품 상세: `GET /api/products/{id}`
- 에러체크: `POST /api/products/{id}/validate`
- 마켓 업로드: `POST /api/products/{id}/upload` body `{ market_ids: [...] }`

**ATC 주의**:
- ProductImport는 **Chrome 확장 필수** (`WINDLY_EXTENSION_PATH` env)
- 모든 페이지가 `/view3` prefix 시작
- 모달은 MUI Dialog (Portal 자동) — 텍스트로 잡기
- 로딩은 컴포넌트별 `isLoading` 조건부 렌더링 (전역 spinner 없음) → `waitFor` 명시 필수
- Redux + React Query 혼용 → API 호출 후 양쪽 동기화

---

### 4.2 hub-frontend-web

**한 줄**: 인증·계정·온보딩·홈 대시보드. **로그인 폼이 있는 유일한 앱**. `hub.windly.cc`.

**스택**: Vite 5.4 + React 18.3 + TypeScript 5.8 + Redux Toolkit + React Query 5.80 + Bear Design (`@sellermate/bear-design`) + Emotion + react-hook-form.

**dev**: `npm run dev` → `localhost:3002/` → `/home` 자동 redirect

**주요 디렉토리**:
| 경로 | 용도 |
|---|---|
| `src/features/Account/Login/` | **로그인 페이지** (이메일/비번 입력) |
| `src/features/Account/Form/Email.tsx` | 이메일 폼 (react-hook-form `register('email')`) |
| `src/features/Account/{SignUp,SocialLogin,PasswordReset,Activate}/` | 회원가입·소셜·비번재설정·계정활성화 |
| `src/features/Home/` | 홈 대시보드 (상품 링크 그룹) |
| `src/features/MainHeader/` | 로고 + 사용자 프로필 메뉴 |
| `src/features/Settings/` | 계정 설정, 비밀번호 변경 |
| `src/features/WelcomeSurvey/` | 온보딩 서베이 |
| `src/apis/auth/apis.ts` | `postEmailLogin`, `postSocialLogin`, `postEmailSignUp`, `getUsersMe`, `patchUsersMe`, `postPasswordChange` |
| `src/axios/utils.ts` | `setAuthorizationToken()` (쿠키 set, domain `.windly.cc`) |
| `src/extension/utils.ts` | Chrome 확장과 토큰 동기화 (`sendMessage()`) |
| `src/Root.tsx` | `useGetUsersMe()` 호출 — 미인증이면 401 |

**API base URL**: `VITE_AUTH_API_URL`

**ATC 주의**:
- **로그인 폼**: `hub.windly.cc/accounts/login` — 이 페이지가 인증 자동화의 단일 진입점
- react-hook-form 사용 → 검증은 `EMAIL_REGEX`, `PASSWORD_REGEX`, 에러 표시는 `formState.errors.<field>.message`
- 로그인 성공 → 쿠키 set + Chrome 확장으로 토큰 전송 + `/home`으로 리다이렉트
- Bear Design 컴포넌트는 자체 클래스 — selector는 placeholder/role/label 기반 권장
- A/B 테스트 활성 (ABTestService) — UI가 변동될 가능성 있음

---

### 4.3 sesame

**한 줄**: 상품 관리 구버전 UI (수집상품·등록상품·상품 상세). **로그인 폼 없음** — hub로 튕겨나감. `app.windly.cc/view2/...`.

**스택**: Vite 5.4 + React 18.2 + TypeScript 5.8 + Redux Toolkit 1.9 + React Query 5.40 + **Material-UI 4.12** + **Tailwind 2.2** + Emotion + Axios 1.6.

**dev**: totoro Django 백엔드 서빙 + Vite watch (특이 환경)

**라우팅** (basename `/view2`):
- `/view2/` → `/view2/interested-product` 자동
- `/view2/interested-product` (목록), `/view2/interested-product/:productId` (상세)
- `/view2/registered-product`, `/view2/registered-product/:productId`
- `/view2/inflow-analysis`, `/view2/mypage`, `/view2/mypage/subscription`
- `/view2/require-extension` → `/view3/chrome-extension-guide` 리다이렉트

**주요 디렉토리**:
| 경로 | 용도 |
|---|---|
| `src/features/InterestedProduct/` | 수집상품 목록 |
| `src/features/RegisteredProduct/` | 등록상품 목록 |
| `src/features/ProductDetail/ProductDetailWithOwnership.tsx` | 상품 상세 |
| `src/features/ProductDetailRow/` | 행 단위 상세 |
| `src/features/Mypage/` | 마이페이지 |
| `src/apis/auth/apis.ts` | `getMe()` (`/v1/auth/me`) |
| `src/apis/<45+>/` | products, markets, subscriptions 등 도메인별 |
| `src/axios/config.ts:60` | 401 → hub redirect |
| `src/axios/utils.ts` | 토큰 헬퍼 |
| `src/utils/messaging.ts` | Chrome 확장 통신 (`send()`, `checkExtensionAvailable()`) |
| `src/components/` | Atomic Design (atoms/molecules/organisms/modals) |
| `src/slices/` | accountSlice, marketSettingSlice, uploadingProductsSlice 등 |

**API base**: `VITE_GLOBAL_API_URL` (alpha: `alpha-api.windly.cc`, prod: `app-api.windly.cc`)

**대표 endpoint**:
- `/v1/auth/me`
- `/v1/products/...`
- `/v1/markets/settings/...`
- `/v1/subscriptions/...`

**ATC 주의**:
- **로그인 폼이 없음** — hub에서 먼저 로그인 후 쿠키 공유로 진입
- MUI v4 (구버전) — selector 패턴 다를 수 있음
- 401 자동 처리: `removeAuthTokenAndMoveLoginPage()` 호출 → hub로
- Chrome 확장 통신: 수집/에러체크 시 `postMessage` 의존
- 토큰 갱신 자동 X — 만료되면 사용자가 hub에서 재로그인

---

### 4.4 koco-frontend-web

**한 줄**: 국내 마켓(쿠팡/스마트스토어/11번가/롯데온/ESM/톡스토어) 통합 관리. `alpha-domestic.windly.cc` (alpha) / `localhost:3000` (dev).

**스택**: Vite 5.4 + React 18.3 + TypeScript 5.8 + Redux Toolkit 2.8 + **TanStack Query 5.80** + **Zustand 5.0** + **Bear Design** + Emotion + React Hook Form 7.57.

**dev**: `npm run dev` → `https://localhost:3000` (alpha env)

**라우팅**:
- `/` → `/home`
- `/products/imported` (수집상품 목록)
- `/products/uploaded` (등록상품 목록)
- `/products/:productType/:productNumber/{base|image|option|stock|attribute|detail|upload}` (상품 상세 탭별)
- `/settings/base/{smartstore|coupang|elevenstreet|esm|lotteon|talkstore}` (마켓별 설정)
- `/sales/orders`, `/sales/claims`
- `/payment/...`

**주요 디렉토리**:
| 경로 | 용도 |
|---|---|
| `src/features/Product/` | 상품 상세 — `Base/Image/Option/Stock/Attribute/Upload/Detail` 7개 sub-feature |
| `src/features/Products/{ImportedProducts,UploadedProducts}/` | 상품 목록 |
| `src/features/ProductImport/ImportByAi/` | AI 기반 수집 |
| `src/features/Settings/Base/{Coupang,SmartStore,ElevenStreet,ESM,LotteOn,Talkstore}/` | 마켓별 설정 폼 |
| `src/features/Payment/` | 결제 |
| `src/features/Sales/{ProductOrders,ProductOrderClaims}/` | 주문·클레임 |
| `src/apis/products/hooks.ts` | TanStack Query hooks (`@lukemorales/query-key-factory`) |
| `src/apis/{importProduct,image,ocr}/` | 도메인별 API |
| `src/axios/config.ts` | 토큰 갱신 인터셉터 |
| `src/axios/methods.ts` | get/post/patch 래퍼 |
| `src/slices/` | Redux 슬라이스 |

**API base**: `VITE_DOMESTIC_API_URL` (alpha: `alpha-koco-api.windly.cc`)

**대표 endpoint**:
- `GET /v1/products/imported?pageNumber=1&pageSize=20`
- `GET /v1/products/{productNumber}`
- `PATCH /v1/products/{productNumber}/summary/mother`
- `PATCH /v1/products/{productNumber}/stores/{marketCode}`

**ATC 주의**:
- 라우트의 `:productType` (예: `IMPORTED`) 직접 URL로 진입 가능 → 깊은 페이지 빠르게 도달
- 이미지 에디터는 Konva 캔버스 — 일반 click 안 먹을 수 있음, 좌표 기반 또는 input[type=file]
- TanStack Query retry=0 — 에러 시 빠르게 fail → ATC에서 `waitFor` 명시
- Bear Design 컴포넌트 사용 — selector role/label 기반 추천
- Sentry 추적 활성 → 테스트 실행이 prod Sentry로 가지 않게 주의 (env 분리)

---

## 🛠️ 5. ATC 작성 시 따라야 할 패턴 (요약)

### 새 ATC 짤 때 의사결정 흐름

```
1. 시나리오 파악
   → §1 cross-reference 표에서 어느 앱인지 확인
   → 신/구 둘 다면 사용자에게 확인

2. URL·라우트 결정
   → §0 도메인 표 + §4 각 앱 라우팅 보고 진입 URL 정함
   → 가능하면 깊은 페이지 직접 goto (e.g., /products/IMPORTED/{id}/base)

3. Selector 추출
   → §4 해당 앱의 features/ 디렉토리 grep
   → §2 Selector 우선순위 따라 role/text/label/placeholder
   → data-testid 거의 없음을 인지

4. 인증
   → §3에 따라 storageState 적용 (refactor-plan.md §1)
   → ATC에 login step 직접 적지 않음

5. API 응답 대기
   → React Query 사용 앱(전부) → waitFor 명시
   → 스피너·skeleton 컴포넌트 텍스트 기반 대기
```

### 자주 쓰일 페이지 깊이 진입 URL

```
# 메인 (windly-frontend-web)
https://app.windly.cc/view3/products
https://app.windly.cc/view3/products/{id}
https://app.windly.cc/view3/import

# 구버전 (sesame)
https://app.windly.cc/view2/interested-product
https://app.windly.cc/view2/interested-product/{productId}
https://app.windly.cc/view2/registered-product

# 국내 마켓 (koco)
https://alpha-domestic.windly.cc/products/imported
https://alpha-domestic.windly.cc/products/IMPORTED/{productNumber}/base
https://alpha-domestic.windly.cc/settings/base/coupang

# 인증 (hub)
https://hub.windly.cc/accounts/login
https://hub.windly.cc/home
```

### 안 할 것
- ❌ Emotion 동적 클래스(`.css-xxxxx`) selector 사용
- ❌ ATC에 login/회원가입 step 직접 작성 (storageState로)
- ❌ data-testid 가정 (거의 없음)
- ❌ 전역 로딩 spinner 가정 (앱마다 컴포넌트별)
- ❌ sesame에서 로그인 시도 (폼 없음 — hub로 튕겨남)

---

## 📚 6. 참고

### 환경변수 (.env에 들어갈 것 — `.env.example` 참조)
```
WINDLY_LOGIN_EMAIL=...        # hub 로그인 자동화용
WINDLY_LOGIN_PASSWORD=...
WINDLY_BASE_URL=https://app.windly.cc
WINDLY_EXTENSION_PATH=...     # ProductImport 등 확장 의존 ATC
```

### 각 앱 README 위치
- `windly_repo/windly-frontend-web/README.md` (Vite 템플릿 기본)
- `windly_repo/hub-frontend-web/README.md`
- `windly_repo/sesame/README.md` (totoro 백엔드 의존)
- `windly_repo/koco-frontend-web/README.md`

### 본 코드 맵 갱신
- frontend 코드 변경 시 stale 가능 — 큰 라우트 리네이밍·디렉토리 이동 후 갱신 권장
- 갱신 명령(새 Claude 세션):
  > "code-map.md를 windly_repo/ 4개 앱 다시 조사해서 갱신해줘"

### 연관 문서
- `refactor-plan.md` — 본 맵 §3 (인증) 정보가 §1 작업 A (storageState)에 직접 사용됨
- `CLAUDE.md` — 이 프로젝트의 공통 컨벤션·도메인 컨텍스트
- `.hoyeon/specs/atc-framework/requirements.md` — 프레임워크 결정 D1~D12, D_H1~D_H5 원본
