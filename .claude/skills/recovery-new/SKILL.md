---
name: recovery-new
description: 새 복구 플로우 recoveries/<id>.ts를 표준 시그니처로 스캐폴드하고, KnownErrorKey 유니온 추가 가이드와 ATC step에서 on_error로 사용하는 가이드를 출력한다. 사용자가 "missing_image 복구 만들어", "복구 플로우 추가" 류로 요청할 때 트리거한다.
disable-model-invocation: true
---

# /recovery-new

새 복구 플로우를 한 가지 표준 패턴으로 추가하기 위한 스킬이다. 단일 파일·단일 함수·강제 시그니처 규칙(C4)을 그대로 강제하고, 에러 키 등록·on_error 사용 가이드를 한 번에 안내한다.

## 트리거

- "missing_image 복구 만들어"
- "복구 플로우 추가"
- "invalid_category 처리할 recovery 짜줘"
- "/recovery-new <recovery_id>"

## 무엇을 하는가

`recovery_id`를 받아 `recoveries/<id>.ts`를 강제된 시그니처로 만든다. `lib/errors.ts`의 `KnownErrorKey` 유니온에 새 키를 추가해야 한다는 사실을 사용자에게 알리되, **워커가 자동으로 추가하지는 않는다** — 기존 유니온 변경은 영향 범위가 크므로 사용자 확인을 거친다. ATC step에서 `on_error: ['<id>']`로 사용하는 예시도 함께 보여준다.

## 절차

1. **recovery_id 결정** — 사용자가 인자로 줬으면 그대로 사용. 없으면 사용자가 묘사한 에러를 snake_case로 변환해 후보를 제안한다 (예: "이미지 없음 복구" → `missing_image`).
2. **충돌 검사** — `recoveries/<id>.ts`가 이미 있으면 덮어쓰지 말고 사용자에게 알린다.
3. `recoveries/` 디렉토리가 없으면 `mkdir -p`.
4. `recoveries/<id>.ts`를 아래 골격으로 만든다.
   ```typescript
   import type { Page } from '@playwright/test';
   import type { RecoveryContext } from '../lib/errors';

   /**
    * <recovery_id> 복구 플로우.
    *
    * ctx 사용 예:
    *   - ctx.error_key:        실패한 step이 던진 키 (이 파일 이름과 일치해야 함)
    *   - ctx.page_url:         실패 시점의 page.url()
    *   - ctx.last_step_id:     본 ATC에서 실패한 step id
    *   - ctx.screenshot_path:  실패 시점 스크린샷 경로
    *
    * 정상 종료 시 본 ATC의 재개 지점(D4 규칙)으로 복귀한다.
    * 이 함수 안에서 다른 recover()를 호출하면 안 된다 (C7).
    */
   export async function recover(page: Page, ctx: RecoveryContext): Promise<void> {
     // TODO: <recovery_id> 복구 로직 구현
     //  1) 무엇을 어떻게 고칠지 ctx 정보로 분기
     //  2) 고친 뒤 본 ATC가 다시 시도할 수 있는 상태로 page를 남길 것
     throw new Error('recover(<recovery_id>): 구현 필요');
   }
   ```
5. **KnownErrorKey 추가 안내** — `lib/errors.ts`의 `KnownErrorKey` 유니온에 `'<recovery_id>'`를 추가해야 한다는 사실을 사용자에게 출력한다. 자동 수정하지 말고 "추가하시겠어요?"로 확인을 받는다.
6. **on_error 사용 예시 안내** — ATC step에서 다음처럼 등록한다고 출력한다.
   ```yaml
   - id: error-check
     do: 윈들리 에러체크 실행
     on_error:
       - <recovery_id>
   ```

## 출력

- 새로 만든 recovery 파일 절대 경로
- "lib/errors.ts의 KnownErrorKey에 `'<recovery_id>'`를 추가하시겠어요?" 확인 질문
- ATC step `on_error` 사용 예시 (위 yaml)

## 검증

- `ls recoveries/<id>.ts` — 파일 존재
- 파일에 `export async function recover(` 시그니처가 있는지 확인
- `npx tsc --noEmit` — TS 에러 없음
- 동봉된 `scripts/validate.sh <recovery_id>` 실행 — exit 0
