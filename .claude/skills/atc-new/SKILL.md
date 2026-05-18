---
name: atc-new
description: 자유양식 ATC 설명을 받아 atcs/<domain>/<name>.atc.yml + tests/<domain>/<name>.spec.ts 스캐폴드를 생성한다. 사용자가 "ATC 만들어", "타오바오 상품 수집 ATC 짜줘", "에러체크 ATC 추가" 류로 요청할 때 트리거한다.
disable-model-invocation: true
---

# /atc-new

새 ATC(Automated Test Case)를 빠르고 일관된 패턴으로 추가하기 위한 스캐폴딩 스킬이다. 자유양식 한국어 설명을 입력으로 받아, 도메인을 분류하고 YAML + spec 두 파일을 표준 구조로 만든다.

## 트리거

다음과 같은 사용자 발화에 반응한다.

- "타오바오 상품 1개 수집해서 에러체크하는 ATC 만들어"
- "ATC 만들어"
- "에러체크 ATC 추가"
- "쿠팡 업로드 ATC 짜줘"
- "/atc-new <설명>"

## 무엇을 하는가

사용자의 자유양식 설명을 읽어 의도를 파악하고, 다음을 자동으로 결정·생성한다.

1. **도메인 분류** — 설명에서 키워드를 뽑아 다음 5개 중 하나로 매핑한다.
   - `collect` — 수집 (타오바오/티몰/라쿠텐 상품 긁기)
   - `error-check` — 에러체크 (윈들리 에러체크 기능 검증)
   - `fix` — 수정/가공 (이미지·카테고리·이름 보정)
   - `upload` — 마켓 업로드 (스스/쿠팡/톡스토어 등)
   - `e2e` — 위 흐름을 종단으로 묶은 케이스
2. **이름 슬러그** — 설명에서 핵심 명사·동사를 골라 kebab-case로 짧게 만든다 (예: `taobao-product-error-check`).
3. **두 파일 스캐폴드** — `atcs/<domain>/<name>.atc.yml` + `tests/<domain>/<name>.spec.ts`.
4. **사용자 확인** — 도메인·이름·step 목록이 의도에 맞는지 한 번 더 묻는다.

## 절차

1. 사용자 설명에서 **도메인**을 분류한다. 모호하면 후보 2~3개를 보여주고 사용자에게 선택을 요청한다.
2. **name 슬러그**를 결정한다 (kebab-case, 30자 이내, 영문 권장).
3. `atcs/<domain>/` 디렉토리가 없으면 `mkdir -p`로 만든다.
4. `atcs/<domain>/<name>.atc.yml`을 다음 골격으로 작성한다.
   ```yaml
   title: <한국어 한 줄 설명>
   inputs:
     # 값은 비우고 schema만 — 실제 값은 CLI/fixture/prompt로 주입
     url:
       type: string
       description: <설명>
       example: <예시>
   steps:
     - id: step1
       do: <자연어 액션>
       on_error: []          # 후보가 있으면 추천: [missing_image, invalid_category]
     - id: step2
       do: <자연어 액션>
     # ... 3~7개 권장
   expected: <성공 조건 한 줄>
   ```
5. `tests/<domain>/` 디렉토리가 없으면 `mkdir -p`로 만든다.
6. `tests/<domain>/<name>.spec.ts`를 다음 3줄 표준 패턴으로 작성한다.
   ```typescript
   import { test } from '@playwright/test';
   import { loadATC } from '../../lib/atc-loader';
   import { runner } from '../../lib/runner';

   test('<name>', async ({ page }) => {
     const atc = await loadATC('atcs/<domain>/<name>.atc.yml');
     await runner.run(atc, { page });
   });
   ```
7. 도메인·이름·step 다듬기를 사용자에게 한 번 더 확인한다 ("이대로 진행할까요? 아니면 step을 바꿀까요?").

## 출력

- 새로 만든 두 파일의 절대 경로
- 한 줄 요약 (예: `collect/taobao-product-error-check 스캐폴드 완료 — 4 step, on_error 후보 2개 추천됨`)

## 검증

- `ls atcs/<domain>/<name>.atc.yml tests/<domain>/<name>.spec.ts` — 두 파일 존재
- `npx tsc --noEmit` — TS 에러 없음
- 동봉된 `scripts/validate.sh <domain>/<name>` 실행 — exit 0
