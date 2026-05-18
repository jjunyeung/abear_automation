---
type: greenfield
goal: "Playwright 기반 ATC(자동화 테스트 케이스) 실행 프레임워크 — 자유양식 ATC를 Playwright 코드로 변환, 에러 발생 시 복구 플로우 분기 후 복귀, 단계별 결과 리포팅"
non_goals:
  - "실제 N개 ATC 콘텐츠 작성 (프레임워크 깔린 후 케이스 추가는 별도)"
  - "Windly 서비스(웹앱) 본체 코드 수정"
  - "마켓별(스마트스토어/쿠팡/톡스토어 등) 업로드 검증 비즈니스 로직 자체"
  - "운영용 CI/CD 파이프라인 (필요 시 L2에서 결정)"
---

# Goal

Windly에서 ATC(자동화 테스트 케이스)를 굴리는 실행 프레임워크를 새로 구축한다. 사용자가 자유양식으로 ATC를 적으면 Claude가 그 의도를 읽어 Playwright 코드로 변환·실행하고, 도중에 에러가 나면 별도 복구 플로우로 분기해 문제를 고친 뒤 본 ATC로 복귀해 끝까지 수행한 다음, 단계별 결과(성공/에러/복구)를 구조화된 형태로 기록한다.

## Confirmed Goal

새 ATC가 들어왔을 때 Claude가 일관된 패턴으로 코드를 짤 수 있도록 — Playwright 기반 ATC 실행 프레임워크의 **구조·규칙·하네스·예제 vertical slice 1건**을 깔아둔다. 다음 세션의 Claude가 CLAUDE.md만 읽고도 새 ATC와 새 복구 플로우를 같은 패턴으로 추가할 수 있어야 한다.

## Non-Goals

- 실제 N개의 ATC 콘텐츠 작성은 이번 scaffold 범위 밖. (프레임워크가 깔린 후 사용자가 케이스를 던져주면 추가)
- Windly 서비스 본체 코드 수정 없음.
- 마켓별 업로드 검증 비즈니스 로직 자체는 ATC 콘텐츠 영역 — 프레임워크는 그걸 표현·실행할 그릇만 제공.
- 운영용 CI/CD는 기본 범위 외 (L2 인터뷰에서 필요성 확인).

# Research

## L1 — Environment Scan

### 런타임 / 패키지 매니저
- **Node**: v25.2.1 (최신, ES2024+ OK)
- **npm**: 11.6.2
- **pnpm/yarn/bun**: 미설치
- **Python**: 3.14.3 (필요 시 보조 스크립트)
- **Docker**: 미설치 (로컬 컨테이너 미사용 환경)
- **Git**: 2.52.0
- **OS**: macOS Darwin arm64 (Apple Silicon)
- **Playwright/tsc 글로벌**: 미설치 (프로젝트 로컬 설치 예정)

### 신규 프로젝트 디렉토리
- 경로: `/Users/a1/windly 자동화`
- 상태: 비어있음 (`.hoyeon/specs/atc-framework/`만 존재)
- **주의**: 디렉토리명에 공백 포함 → import path / shell 사용 시 quoting 필수

### 기존 자산 (참조 가능, 별도 위치)
1. **`/Users/a1/automation`** — `windly-api-automation` 풀 Playwright/TS 프로젝트 (강력한 참조 자산)
   - **스택**: Playwright 1.44+, TypeScript 5.x (CommonJS, ES2020), dotenv
   - **멀티 프로젝트**: `windly-p0/p1/p2`, `windly-collected`, `windly-hub`, `windly-e2e` — testMatch로 분리
   - **커스텀 리포터 패턴**: `reporters/summary-reporter.js` → `reports/runs/{runId}/{runId}.md|.csv` 생성. 신규 프레임워크의 "단계별 결과 리포트" 요구를 거의 그대로 충족할 잠재 모듈
   - **runId 빌더**: `result_YYYY-MM-DD_HH-MM-SS` 패턴으로 실행마다 분리
   - **base URL**: `https://app-api.windly.cc` (env `WINDLY_BASE_URL`)
   - **윈들리 Chrome 확장 로드**: `WINDLY_EXTENSION_PATH` env 기반, headless 비호환 → `headless: false` 자동
   - **테스트 구조**: `tests/api/windly/p0|p1|p2/`, `tests/ui/windly/collected-products/`, `tests/e2e/`
   - **dotenv** 의존
   - 232개의 audit_*.json/.png/.ts 파일 — 과거 probe/디버그 산출물
2. **`/Users/a1/windly_repo`** — 비어있음
3. **`/Users/a1/windly_tc_maker/등록상품_TC.xlsx`** — TC 양식 엑셀
4. **`/Users/a1/windly_tc.xlsx`** (23KB) — TC 시트

### L1 → L2 자동 해소 후보
- **언어/런타임**: TypeScript + Node (기존 자산 일치, 사용자 의지 일치) — `D` 후보
- **테스트 프레임워크**: Playwright `@playwright/test` (사용자 명시, 기존 자산 일치) — `D` 후보
- **패키지 매니저**: npm (가용한 유일 옵션, 추가 설치 부담 없음) — `D` 후보, 단 사용자 확인 필요
- **컨테이너**: 미사용 (Docker 미설치, scope 외) — `D` 후보
- **결과 리포팅**: 기존 `reports/runs/{runId}/` 패턴 차용 가능 — L2 결정 후보

### Greenfield 확인
- 신규 디렉토리 비어있음 → greenfield ✅
- 다만 기존 자산이 풍부 → "참조 차용 vs 완전 신규" 선택을 L2에서 명시적으로 결정해야 함

# Decisions

## L2 — Architecture

### D1: 기존 자산 활용 방식 = 패턴만 차용, 코드는 새로
`/Users/a1/automation`은 참조 자료로만 활용. 차용 대상 패턴:
- `playwright.config.ts` 구조 (multi-project, runId 빌더, Chrome 확장 로드)
- `summary-reporter.js` 아이디어 (단계별 .md + .csv + .json 다중 출력)
- `reports/runs/{runId}/...` 디렉토리 스킴
- dotenv 로딩 패턴
코드 자체는 0부터 새로 작성. 기존 프로젝트 의존성 없음.

### D2: 패키지 매니저 = npm
이미 설치되어 있고(11.6.2) 추가 도구 부담 없음. `package-lock.json` 커밋.

### D3: ATC DSL = YAML + 구조적 step (느슨)
- 고정 키: `title`, `inputs`, `steps`, `expected`
- step은 list of object: `{ id, do, on_error?, on_recovery?, expect? }`
- `do`는 한국어 자연어 — Claude가 해석해 Playwright 코드로 변환
- 사용자는 step만 대충 나눠 적으면 OK, 누락 키는 Claude가 정규화 단계에서 채움
- 파일 확장자: `.atc.yml`

### D4: 복구 후 재개 지점 = 실패 step부터 (작성자 override 가능)
- 기본값: 실패한 step부터 재시도
- override: 해당 step에 `on_recovery: { restart_from: <step_id> }` 명시 시 그 step부터
- "처음부터 재시작" 옵션도 지원 (`restart_from: __start__`)

### D5: 복구 플로우 등록 = `recoveries/<id>.ts` + ATC step의 `on_error: [<id>, ...]` 명시
- 파일 위치: `recoveries/<recovery_id>.ts`
- 각 파일은 하나의 함수 export: `async function recover(page, ctx): Promise<void>`
- ATC step에 `on_error: [missing_image, invalid_category]` 형태로 후보 나열
- 실행 시 에러체크가 반환한 `error_key`와 매칭되는 첫 항목 호출

### D6: 결과 리포트 = `reports/runs/{runId}/{runId}.md` + `.json` + Playwright html
- runId 패턴: `result_YYYY-MM-DD_HH-MM-SS` (기존 자산 동일)
- `.md`: 사람 친화 요약 — 사용자 원문 예시 그대로 (단계별 ✅/⚠️ + 복구 정보)
- `.json`: 기계용 — step별 status/duration/error_key/recovery_id 구조화
- `html/`: Playwright 기본 html reporter
- 커스텀 reporter는 `reporters/atc-reporter.ts`로 작성

### D7: 윈들리 Chrome 확장 = 필수, 기존 패턴 그대로
- `WINDLY_EXTENSION_PATH` env로 확장 경로 주입
- 확장 로드 시 자동으로 `headless: false` + Chromium 강제 + `--no-sandbox`
- env 미설정 시 일반 Chromium으로 fallback (단, UI ATC는 실패 가능)

### D8: ATC 입력 = schema-only 선언, 실행 시 주입 (CLI > fixture > interactive)
- YAML `inputs` 블록은 schema만 (`type`, `description`, `example`) — 값은 비움
- 주입 우선순위:
  1. CLI 인자 `--url=https://...` (최우선, 디버그·임시 실행용)
  2. fixture 파일 `fixtures/<name>.json` (배치 실행용, ATC가 fixture 이름 참조 시)
  3. interactive prompt (위 둘 다 없으면 콘솔이 입력 요청)
- 결과 리포트에 어떤 입력이 사용되었는지 기록

### D9: Playwright 프로젝트 구조 = 도메인별 다중 프로젝트
- 초기 후보: `windly-collect`, `windly-error-check`, `windly-fix`, `windly-upload`, `windly-e2e` (실제 도메인은 ATC 추가하며 정의)
- testMatch로 `atcs/<domain>/**/*.atc.yml` 분리
- 프로젝트별 base config 공유 + override 최소화

### D10: CI/CD = 이번 scaffold 범위 외
- 로컬 실행 전용 (Chrome 확장·headed·수동 입력 주입 등 CI 부담 큼)
- 향후 필요 시 별도 도입

### D11: 등록되지 않은 에러 = 즉시 실패 + 리포트 'unhandled' 기록
- 자동 복구 시도 안 함 (자율 추측 위험)
- 리포트에 "unhandled error: <key>" 명시 + 스크린샷 + 스택트레이스 첨부
- 사람이 보고 `recoveries/` 추가 결정

### D12: 복구 자체 실패 = 1회만 시도, 실패 시 본 ATC도 실패
- 복구 함수 안에서 또 에러 → 재귀 복구 없음
- 리포트: "recovery '<id>' attempt failed: <reason>" + 본 ATC step도 FAIL
- 무한 루프·재귀 깊이 폭주 원천 차단

### Activated Conditional Extensions
- **[x] Type Contracts (D_EXT1)** — TypeScript 타입으로 ATC 스키마, `error_key` 유니온, `recover()` 시그니처 강제. zod로 YAML→TS 런타임 검증 권장
- **[ ] Data Layer** — 미활성 (DB 없음)
- **[ ] Docker/Infra** — 미활성 (컨테이너 없음, 로컬 전용)
- **[ ] Runtime Patterns** — 미활성 (장기 실행 서버 아님)

# Constraints

- **C1**: 모든 코드는 TypeScript strict 모드. 테스트·reporter·recoveries 포함.
- **C2**: 패키지 매니저는 npm 단독. yarn/pnpm/bun 사용 금지. `package-lock.json` 커밋.
- **C3**: ATC 파일은 `atcs/<domain>/<name>.atc.yml`. 다른 위치/확장자 금지.
- **C4**: 복구 플로우는 `recoveries/<recovery_id>.ts` 단일 파일 단일 함수 export.
- **C5**: 1회 실행 = 1개 `reports/runs/{runId}/` 디렉토리. runId 충돌 방지.
- **C6**: UI 조작이 필요한 ATC는 `.env`에 `WINDLY_EXTENSION_PATH` 설정이 전제.
- **C7**: 복구 플로우는 절대 nested 호출 불가 (`recover()` 안에서 다른 `recover()` 호출 금지).
- **C8**: 매칭되지 않은 에러는 자동 복구 시도 금지. 무조건 unhandled로 리포트.

# Known Gaps

- **KG1**: 새 종류의 unhandled 에러 발견 후 → `recoveries/` 추가까지의 운영 워크플로우 (누가/언제/어떻게 결정) 미정. CLAUDE.md에 가이드 한 절 추가 권장.
- **KG2**: ATC ↔ recovery 간 컨텍스트 전달 (`ctx`)의 구체적 필드 미정. MVP는 `{ error_key, page_url, last_step_id, screenshot_path }` 정도로 시작 — 시나리오 늘면 확장.
- **KG3**: 동일 ATC를 fixture로 N건 돌릴 때 한 건 실패가 다음 건에 미치는 영향 (브라우저 컨텍스트 재사용 vs 새 컨텍스트). 기본은 ATC당 새 컨텍스트로 시작 가정.

## L3 — Harness

### D_H1: 도메인 컨텍스트 (CLAUDE.md에 박제)
- **수집 소스**: 타오바오 (item.taobao.com), 티몰 (detail.tmall.com), 라쿠텐 (item.rakuten.co.jp)
- **윈들리 본체**: `app-api.windly.cc` API + `app.windly.cc` 웹앱 + 윈들리 Chrome 확장 (수집·가공 중계)
- **윈들리 워크플로우**: 수집 → 가공 (이미지/카테고리/배송/속성/이름 등) → 마켓 등록 → 동기화
- **대상 마켓**: 스마트스토어 (스스), 쿠팡, 톡스토어, 11번가, 인터파크(에스엠2), 롯데온 등
- **용어**:
  - **ATC** = Automated Test Case. 본 프레임워크의 단위 실행 케이스
  - **에러체크** = 상품을 마켓에 업로드 가능한 상태인지 검사하는 윈들리 기능
  - **복구 플로우** = 에러를 자동 수정하는 별도 코드 경로 (`recoveries/<id>.ts`)
  - **본 플로우** = ATC가 정의한 정상 시나리오
  - **on_error** = ATC step에서 매칭되면 실행할 복구 후보 목록
  - **runId** = `result_YYYY-MM-DD_HH-MM-SS` 형식의 실행 식별자

### D_H2: 팀 컨벤션
- 솔로 프로젝트. 커밋 메시지 자유 (한국어 권장).
- 브랜치 전략 없음. main에 직접 커밋 OK.
- PR/리뷰 프로세스 없음.

### D_H3: 제약 → 규칙 변환 (.claude/rules/)
- `typescript-strict.md` ← C1 (모든 .ts는 strict, any 금지)
- `npm-only.md` ← C2 (yarn.lock/pnpm-lock.yaml/bun.lockb 생성 금지)
- `atc-file-layout.md` ← C3 (ATC는 `atcs/<domain>/<name>.atc.yml`만)
- `recovery-file-layout.md` ← C4 (복구는 `recoveries/<id>.ts` 단일 함수 export)

### D_H4: 도메인 스킬 (.claude/skills/)
1. **`/atc-new`** — 자유양식 설명을 받아 `atcs/<domain>/<name>.atc.yml` 스캐폴드 + Playwright 실행 코드(`tests/<domain>/<name>.spec.ts`) 생성
2. **`/atc-run`** — 특정 ATC 실행. `--url=<override>`, `--fixture=<name>`, `--prompt` 옵션. 결과 디렉토리 경로 출력
3. **`/recovery-new`** — 새 복구 플로우 `recoveries/<id>.ts` 스캐폴드 (시그니처 + ctx 사용 예 + 에러 매칭 키 등록 가이드)
4. **`/atc-report`** — 최신 run 또는 지정 runId의 `.md` 리포트 출력. unhandled 에러 강조

각 스킬은 `disable-model-invocation: true` (사이드이펙트 있음). 실행 가능 outcome인 `/atc-run` `/recovery-new` `/atc-new`는 `scripts/validate.sh` 포함.

### D_H5: 자동 훅 (.claude/settings.json)
- **PostToolUse on Edit/Write to .ts**: `npx tsc --noEmit` (오류 시 비차단 경고)
- **PreToolUse on Edit/Write to `.env*`**: 차단 + "환경변수 파일 수정 금지" 메시지
- **PreToolUse on Edit/Write to `package-lock.json`**: 차단 + "lock 파일은 npm install 결과만 허용"

# Requirements

## R-A1: 코드 구조 — 프로젝트 디렉토리, base config, vertical slice exemplar
fulfills: D1, D2, D3, D5, D6, D7, D8, D9
priority: critical

#### R-A1.1: 프로젝트 디렉토리 레이아웃
- given: `/Users/a1/windly 자동화` 가 비어있음
- when: scaffold가 완료됨
- then: 다음 디렉토리가 존재 — `atcs/`, `recoveries/`, `tests/`, `lib/`, `reporters/`, `fixtures/`, `reports/`, `.claude/{rules,skills}/`, `package.json`, `tsconfig.json`, `playwright.config.ts`, `.env.example`, `CLAUDE.md`

#### R-A1.2: vertical slice exemplar — "상품 수집 → 에러체크 → (복구) → 재시도 → 리포트" ATC 1건
- given: scaffold가 끝나고 사용자가 `WINDLY_EXTENSION_PATH`를 `.env`에 설정함
- when: `npm run atc -- atcs/collect/product-error-check.atc.yml --url=<유효한 타오바오 상품 URL>` 실행
- then: 다음 단계가 순서대로 수행되고 결과가 `reports/runs/{runId}/{runId}.md`에 기록됨 — (1) 상품수집 ✅, (2) 상품 상세 이동 ✅, (3) 에러체크 → 에러 발견 시 `recoveries/missing_image.ts`로 분기 → 수정 → (4) 에러체크 재시도 ✅. unhandled 에러는 발생 안 함

#### R-A1.3: import 가능한 유틸리티 (`lib/`)
- given: 새 ATC를 작성하는 다음 세션의 Claude
- when: `lib/`를 import해서 사용
- then: `lib/logger.ts` (구조화 로깅), `lib/config.ts` (env 로딩 + 검증), `lib/errors.ts` (에러 클래스 + error_key 유니온), `lib/atc-loader.ts` (YAML→정규화된 ATC 객체, zod 검증), `lib/runner.ts` (step 순회 + 복구 분기 + 재개), `lib/recovery-registry.ts` (recoveries/ 자동 로드 + 매칭) — 모두 importable, inline 코드 아님

#### R-A1.4: ATC YAML 스키마 강제
- given: 사용자가 `atcs/<domain>/<name>.atc.yml`을 추가
- when: `npm run atc`가 ATC를 로드
- then: zod 스키마로 검증 — title(string), inputs(object), steps(array<{id, do, on_error?, on_recovery?}>), expected(string?). 누락 키는 정규화 단계에서 기본값 채움. 스키마 위반 시 명확한 에러 메시지

#### R-A1.5: 복구 플로우 분기 메커니즘
- given: 본 ATC 실행 중 step의 `on_error: [recovery_id_a, recovery_id_b]`가 정의됨
- when: 그 step에서 에러 발생, 에러체크가 `error_key="recovery_id_a"` 반환
- then: `recoveries/recovery_id_a.ts`의 `recover(page, ctx)`가 호출됨, 정상 종료 시 본 ATC의 재개 지점(D4 규칙)으로 복귀해 다음 실행 계속, 결과 리포트에 "복구 사용: recovery_id_a" 기록

#### R-A1.6: unhandled 에러 처리 (D11)
- given: ATC step에서 에러 발생, 매칭되는 `on_error` 항목이 없거나 `recoveries/<key>.ts` 미존재
- when: runner가 에러 감지
- then: 자동 복구 시도 없이 즉시 ATC 실패 처리, 리포트 .md/.json에 `unhandled error: <key>` + 스크린샷 경로 + 스택트레이스 명시

#### R-A1.7: 복구 자체 실패 처리 (D12)
- given: 복구 함수 `recover()` 실행 중 예외 발생
- when: runner가 복구 실패 감지
- then: 재귀 호출 없이 1회로 종료, 리포트에 "recovery '<id>' attempt failed: <reason>" 명시 + 본 ATC step도 FAIL로 기록

---

## R-A2: 테스트 인프라 — Playwright 설정 + 도메인별 다중 프로젝트
fulfills: D7, D9
priority: critical

#### R-A2.1: playwright.config.ts — 다중 프로젝트 + 윈들리 확장 로드 + runId 리포터
- given: `WINDLY_EXTENSION_PATH`가 `.env`에 설정됨
- when: `npx playwright test` 실행
- then: config가 `windly-collect`, `windly-error-check`, `windly-fix`, `windly-upload`, `windly-e2e` 5개 프로젝트로 분리 (각 testMatch 명시), Chrome 확장 자동 로드(headed Chromium), runId 빌더가 `result_YYYY-MM-DD_HH-MM-SS` 생성, 커스텀 reporter `reporters/atc-reporter.ts`가 `.md` + `.json` 출력

#### R-A2.2: 테스트 디렉토리 구조 = 소스 미러
- given: ATC가 `atcs/collect/foo.atc.yml`로 작성됨
- when: `/atc-new`가 실행 코드 생성
- then: 대응 spec이 `tests/collect/foo.spec.ts`로 생성되고 `atc-loader`로 YAML을 로드해 `runner.run()`을 호출하는 패턴

#### R-A2.3: 예제 spec — vertical slice exemplar의 spec 파일
- given: R-A1.2의 ATC 파일이 존재
- when: `tests/collect/product-error-check.spec.ts`를 보면
- then: ATC 로드 → runner 실행 → 결과 검증의 3줄짜리 표준 패턴이 보이고, 새 ATC 추가 시 그대로 따라 쓰면 됨

---

## R-A3: 가드레일 — CLAUDE.md + 린터/포맷 + .env.example
fulfills: D_H1, D_H2, D_H4, D_H5, all C*
priority: critical

#### R-A3.1: CLAUDE.md 작성
- given: 다음 세션에서 새 Claude가 프로젝트를 처음 봄
- when: CLAUDE.md를 읽음
- then: 다음을 모두 인지 — (a) 도메인 컨텍스트(D_H1: 수집소스, 윈들리 도메인, 마켓, 용어집), (b) 팀 컨벤션(D_H2: 솔로, 자유, 한국어), (c) 아키텍처 결정 요약(D1-D12), (d) 새 ATC 추가 절차(`/atc-new` → 정규화 → 실행 코드 생성 → 실행), (e) 새 복구 추가 절차(`/recovery-new` → 시그니처 + ctx 사용 + on_error 등록 가이드), (f) 사용 가능한 스킬 4개 요약, (g) 활성 훅 요약, (h) 의존성 방향(`atcs/` ← `tests/` ← `lib/runner` ← `recoveries/` 단방향), (i) 새 종류 unhandled 에러 발견 시 운영 워크플로우(KG1)

#### R-A3.2: TypeScript strict + Prettier(스킵, 합의) + 린터 최소
- given: 새 .ts 파일 작성
- when: 저장 후 `npx tsc --noEmit` 실행
- then: 통과. strict 모드, `any` 사용 시 경고 또는 거부

#### R-A3.3: CI 파이프라인 — 미적용 (D10)
- given: scaffold 완료
- when: `.github/workflows/`를 확인
- then: 디렉토리 생성하지 않음. README/CLAUDE.md에 "CI 미사용, 로컬 전용" 명시

#### R-A3.4: .env.example
- given: 새 사용자가 프로젝트를 받음
- when: `.env.example`을 봄
- then: `WINDLY_BASE_URL`, `WINDLY_EXTENSION_PATH`, `WINDLY_LOGIN_EMAIL?`, `WINDLY_LOGIN_PASSWORD?` 등 모든 필수/선택 환경변수가 주석과 함께 나열됨

---

## R-A4: Type Contracts — ATC↔runner↔recovery 타입 안전성 (Activated D_EXT1)
fulfills: D3, D5, D8
priority: high

#### R-A4.1: ATC 스키마 = zod로 정의 + 타입 추론
- given: `lib/atc-schema.ts`에 zod 스키마 정의
- when: ATC YAML 로드
- then: 런타임 검증 + TypeScript 타입 자동 추론(`type ATC = z.infer<typeof atcSchema>`). 수동 타입 중복 없음

#### R-A4.2: error_key 유니온 + recovery 시그니처
- given: `lib/errors.ts`에 `type ErrorKey = "missing_image" | "invalid_category" | ...` 정의
- when: 새 복구 추가
- then: `recoveries/<key>.ts`의 `recover(page: Page, ctx: RecoveryContext): Promise<void>` 시그니처가 강제됨, ctx는 `{ error_key: ErrorKey, page_url: string, last_step_id: string, screenshot_path: string }` (KG2 MVP)

---

## R-A8: 프로젝트 규칙 — 제약 → .claude/rules/ (D_H3)
fulfills: D_H3, C1, C2, C3, C4
priority: high

#### R-A8.1: 4개 rule 파일 작성
- given: scaffold 완료
- when: `.claude/rules/` 확인
- then: `typescript-strict.md`, `npm-only.md`, `atc-file-layout.md`, `recovery-file-layout.md` 4개 파일 존재

#### R-A8.2: rule 파일 작성 품질 — 명확·실행 가능
- given: 새 Claude가 rule을 읽음
- when: 코드를 작성하려 함
- then: rule이 "X를 하지 마라" + "대신 Y를 해라" + "위반 예시"를 포함해 모호하지 않음. 단순 가이드라인 X

---

## R-A9: 도메인 스킬 — 4개 (D_H4)
fulfills: D_H4
priority: high

#### R-A9.1: `/atc-new` 스킬
- given: 사용자가 "타오바오 상품 1개 수집해서 에러체크하는 ATC 만들어"라고 입력
- when: `/atc-new`가 실행됨
- then: `atcs/collect/<생성-name>.atc.yml`(YAML 스캐폴드 + inputs schema + steps 초안) + `tests/collect/<name>.spec.ts`(loader→runner 호출 패턴) 생성. 사용자에게 도메인·이름·step 다듬기 확인

#### R-A9.2: `/atc-run` 스킬
- given: ATC 파일 경로가 주어지고 옵션으로 `--url=<override>` 또는 `--fixture=<name>` 전달 가능
- when: `/atc-run atcs/collect/foo.atc.yml --url=https://item.taobao.com/...`
- then: 해당 ATC 실행, 결과 디렉토리 경로 출력. 옵션 없으면 ATC inputs schema 기준으로 인터랙티브 prompt

#### R-A9.3: `/recovery-new` 스킬
- given: 사용자가 "missing_image 복구 만들어"라고 입력
- when: `/recovery-new missing_image`
- then: `recoveries/missing_image.ts` 생성 (시그니처 + ctx 사용 예 + 빈 본문 + TODO 주석), `lib/errors.ts`의 ErrorKey 유니온에 `"missing_image"` 추가 가이드 출력

#### R-A9.4: `/atc-report` 스킬
- given: 1회 이상 ATC 실행 후
- when: `/atc-report` (인자 없음 = 최신) 또는 `/atc-report result_2026-04-28_15-12-30`
- then: 해당 runId의 `.md` 리포트 stdout 출력. unhandled 에러가 있으면 빨강 강조 + "→ recoveries/<key>.ts 추가 필요" 가이드 동봉

#### R-A9.5: 모든 스킬 = `disable-model-invocation: true` + validate.sh
- given: 스킬 디렉토리
- when: SKILL.md 헤더 확인
- then: 4개 모두 `disable-model-invocation: true`. `/atc-run` `/recovery-new` `/atc-new`는 `scripts/validate.sh` 포함 (생성 결과물 형식 체크)

---

## R-A10: 프로젝트 훅 — TS 체크 + .env/lock 보호 (D_H5)
fulfills: D_H5
priority: high

#### R-A10.1: PostToolUse — TS 체크
- given: 사용자/Claude가 `.ts` 파일을 Edit 또는 Write
- when: hook 실행
- then: `npx tsc --noEmit`이 백그라운드로 돌아 결과를 stdout으로 알림 (실패해도 작업 차단 X, 경고만)

#### R-A10.2: PreToolUse — .env 보호
- given: Edit 또는 Write 도구가 `.env*` 파일에 호출됨
- when: hook 평가
- then: 도구 호출 차단 + "환경변수 파일은 사용자 수동 편집만. 변경이 필요하면 사용자에게 안내" 메시지

#### R-A10.3: PreToolUse — package-lock.json 보호
- given: Edit 또는 Write 도구가 `package-lock.json`에 호출됨
- when: hook 평가
- then: 도구 호출 차단 + "lock 파일은 npm install/uninstall 결과만 허용" 메시지

#### R-A10.4: 훅 설정 정확성
- given: `.claude/settings.json`이 작성됨
- when: 새 세션 시작
- then: 위 3개 훅이 모두 등록되어 동작. `claude --no-hooks`로 우회 가능
