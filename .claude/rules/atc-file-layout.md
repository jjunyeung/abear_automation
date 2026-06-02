# ATC 파일 레이아웃

ATC (Automated Test Case) 정의 파일은 **단일 위치 / 단일 확장자 / 고정 스키마** 규칙을 따른다. Claude 가 일관 패턴으로 새 ATC 를 추가하려면 이 규칙이 어겨지면 안 된다.

## 금지

- ATC 파일을 `atcs/` 디렉토리 **밖에** 두지 마라. (`tests/` 밑, 프로젝트 루트, `fixtures/` 밑 모두 금지.)
- 도메인 디렉토리를 건너뛰지 마라. `atcs/foo.atc.yml` (도메인 없음) 금지.
- 도메인 디렉토리를 다단으로 깊게 만들지 마라. `atcs/collect/taobao/foo.atc.yml` (depth 3) 금지 — `atcs/<domain>/<name>.atc.yml` (depth 2) 만 허용.
- 확장자 위반 금지: `.yml` 단독 (`foo.yml`), `.yaml` (`foo.yaml`, `foo.atc.yaml`), `.json`, `.ts` 모두 ATC 정의로 사용 X.
- ATC YAML 의 최상위 키를 임의로 추가/변경하지 마라. 고정 키 7개만 사용: `title`, `priority`, `description`, `inputs`, `outputs`, `steps`, `expected` (큰 시나리오는 추가로 `composes`). 새 키 도입은 스키마 (`lib/atc-schema.ts`) 변경이 선행되어야 함.
- `priority` 값은 정확히 `P0` / `P1` / `P2` 중 하나. 소문자 (`p0`) / 다른 라벨 (`high`, `critical`) 금지. 통합 ATC 는 묶인 TC# 들 중 최고 priority (P0 > P1 > P2).
- ATC 안에 Playwright 코드 (raw JS/TS 스니펫)를 임베드하지 마라. `do` 는 한국어 자연어 설명만.

## 대신

- 경로 규칙 (정확히 depth 2):
  ```
  atcs/<domain>/<name>.atc.yml
  ```
  - `<domain>` ∈ `collect`, `error-check`, `fix`, `upload`, `e2e` (D9 후보. 새 도메인이 필요하면 먼저 추가 결정 후).
  - `<name>` 은 kebab-case, 의미 있는 단어 (`product-error-check`, `taobao-collect-single`).
  - 확장자는 반드시 `.atc.yml` (이중 확장자: `name` + `.atc` + `.yml`).
- YAML 스키마 (고정 키 7개):
  ```yaml
  title: <한글 또는 영문 1줄 요약>
  priority: P0 | P1 | P2                    # 선택 (점진 backfill 중). 엑셀 TC export 의 P 컬럼과 동일.
  description: |                           # 선택: 사람이 읽는 설명/메모. GUI InputForm 헤더 아래에 표시.
    <이 TC 가 무엇을 하는지, 어떤 시나리오인지>
    <줄바꿈 포함 가능 (pre-line)>
  inputs:
    <input_name>:
      type: string | number | url | ...
      description: <설명>
      example: <예시값>
      from: previous                        # 선택: GUI 큐 안에서 앞 TC 의 같은 이름 output 자동 주입
  outputs:                                  # 선택: spec.ts 가 emitOutput() 으로 채울 값들의 선언
    <output_name>:
      type: string | number | boolean
      description: <설명>
  steps:
    - id: <step_id>          # 필수
      do: <한국어 설명>      # 필수: Claude 가 Playwright 코드로 변환할 의도
      on_error: [<recovery_id>, ...]   # 선택
      on_recovery: { restart_from: <step_id | __start__> }  # 선택
      expect: <한국어 검증 설명>        # 선택
  expected: <한국어 종합 결과 기대>     # 선택
  ```

  - `description` 은 "이 TC 가 뭐 하는지" 작성자 메모. 실행에는 사용 안 함 (runner/reporter 모두 무시) — GUI 표시 전용.
  - composes 의 child ATC 의 `description` 은 부모로 자동 병합되지 않음 (inputs 와 같은 정책 — D8 일관성). 부모 ATC 가 자기 description 을 명시.
  - `outputs` 는 선언만 — spec.ts 가 `import { emitOutput } from '../../lib/atc-output'` 로 실제 값을 emit. 같은 batch 의 뒤 TC 가 `inputs.<name>.from === 'previous'` 로 선언하면 자동 주입 (사용자가 큐 뷰에서 직접 입력한 값이 우선).
  - `inputs.<name>.from` 의 허용값은 현재 `previous` 한 가지. 다른 값은 zod 가 reject.

## 위반 예시

```
# 잘못된 디렉토리 구조
atcs/foo.atc.yml                                # ✗ 도메인 누락
atcs/collect/taobao/single.atc.yml              # ✗ depth 3
tests/collect/foo.atc.yml                       # ✗ atcs/ 밖
src/atcs/collect/foo.atc.yml                    # ✗ atcs/ 가 루트가 아님

# 잘못된 확장자
atcs/collect/foo.yml                            # ✗ .atc 누락
atcs/collect/foo.yaml                           # ✗ .yaml 단독
atcs/collect/foo.atc.yaml                       # ✗ yaml 아닌 yml
atcs/collect/foo.json                           # ✗ JSON 금지
```

```yaml
# 잘못된 예: 임의 최상위 키 + 코드 임베드
title: 타오바오 단건 수집
my_extra_field: something                       # ✗ 고정 키 외
steps:
  - id: collect
    do: |
      await page.goto('https://item.taobao.com/...');   # ✗ 코드 임베드 금지
      await page.click('.btn');
```

## 올바른 예

```
# 올바른 디렉토리 구조
atcs/
  collect/
    product-error-check.atc.yml
    taobao-single.atc.yml
  error-check/
    revalidate-after-fix.atc.yml
  fix/
    missing-image-batch.atc.yml
  upload/
    smartstore-single.atc.yml
  e2e/
    collect-fix-upload.atc.yml
```

```yaml
# 올바른 예: atcs/collect/product-error-check.atc.yml
title: 상품 수집 후 에러체크 → 복구 → 재시도
inputs:
  product_url:
    type: url
    description: 수집 대상 타오바오 상품 URL
    example: https://item.taobao.com/item.htm?id=12345
outputs:
  source_product_id:
    type: string
    description: 수집 완료 후 윈들리가 발급한 내부 상품 코드 (다음 TC 가 받아감)
steps:
  - id: collect
    do: 윈들리 확장으로 상품 URL 수집 트리거
    on_error: [collect_failed]
  - id: open_detail
    do: 수집된 상품의 상세 페이지로 이동
  - id: error_check
    do: 에러체크 실행
    on_error: [missing_image, invalid_category]
  - id: error_check_retry
    do: 에러체크 재실행
    on_recovery:
      restart_from: error_check
expected: 모든 step 이 ✅ 로 끝나고 unhandled 에러가 0건
```

```yaml
# 올바른 예: 다음 TC — 수집 결과 받아가기
# 파일: atcs/upload/single-product.atc.yml
title: 수집된 상품 단건 업로드
inputs:
  source_product_id:
    type: string
    description: 등록할 상품의 윈들리 내부 코드
    example: '235442266'
    from: previous            # 같은 batch 의 앞 TC outputs.source_product_id 자동 주입
steps:
  - id: open_search_modal
    do: 상품 코드 검색 모달 열기
  - id: search
    do: source_product_id 로 검색
```

## 근거 / 출처

- requirements.md **C3**: "ATC 파일은 `atcs/<domain>/<name>.atc.yml`. 다른 위치/확장자 금지."
- requirements.md **D3**: "ATC DSL = YAML + 구조적 step. 고정 키: `title`, `description?`, `inputs`, `outputs?`, `steps`, `expected`. step은 `{ id, do, on_error?, on_recovery?, expect? }`. 파일 확장자: `.atc.yml`."
- **outputs / inputs.from 의도**: 같은 GUI batch 안에서 앞 TC 가 emit 한 값을 뒤 TC 가 받기 위함. `lib/atc-output.ts` 의 `emitOutput()` 호출 → `gui/main/run-queue.ts` 가 reports/runs/<runId>/<runId>.json 의 outputs 를 파싱해 batchOutputs pool 에 머지 → 다음 spawn 직전 `from: previous` input 빈 칸에 자동 주입. 사용자가 큐 뷰에서 직접 입력한 값이 항상 우선.
- requirements.md **D9**: 도메인 후보 = `windly-collect`, `windly-error-check`, `windly-fix`, `windly-upload`, `windly-e2e`. testMatch 가 `atcs/<domain>/**/*.atc.yml` 분리.
- requirements.md **D_H3**: `atc-file-layout.md` ← C3 (ATC는 `atcs/<domain>/<name>.atc.yml`만).
- requirements.md **R-A1.4**: zod 스키마로 검증 — title/description?/inputs/steps/expected. 위반 시 명확한 에러 메시지.
