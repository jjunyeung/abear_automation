# scripts/atc-gen/

R1-R7 마라톤에서 사용된 ATC 일괄 생성/패치 스크립트. R8+ 에서 재실행 가능하도록 `/tmp` 에서 옮겨옴.

## 파일 목록

| 파일 | 용도 | 사용 라운드 |
|---|---|---|
| `gen-skel-specs.py` | 100% destructive/noop skeleton ATC 에 대응하는 `spec.ts` + `handlerKeys.json` 일괄 생성 (모든 step = noopAfter) | R3 |
| `gen-round4.py` | base-setting (9) + windly-shell (23) 의 잔여 skeleton 에 spec.ts 생성 (project 별 진입 URL/페이지 라벨 매핑 포함) | R4 |
| `round6-loose-verify.py` | windly-shell + base-setting 의 generator 패턴 spec 첫 step handler 를 `noopAfter` → `verifyPageReachable` (body length ≥ 10) 로 일괄 패치 | R6 |
| `round7-patch.py` | collected-product / product-collect / smartstore-customs-tax / delivery-agency / upload / order-mgmt / registered-product 의 generator 패턴 spec 첫 step 을 `verifyPageReachable` 로 패치 | R7 |

## 공통 패턴

- ROOT = `/Users/a1/windly 자동화` (스크립트 안 hardcoded — 다른 환경에서 돌리려면 수정 필요).
- 생성/패치 대상 = `tests/<project>/p*-*.spec.ts` 중 generator 패턴 (`const enterPage: StepHandler = async (page) =>` 시그니처 보유).
- skip 대상 = R1+R2 handwritten spec (enterPage 패턴 없음) + 이미 R5/R6 손댄 spec (SKIP set 명시).
- 패치 단위 = `handlers: StepHandlers` 객체의 **첫 항목** 만 변경 (나머지는 noopAfter 유지).

## 새 라운드 추가 시 가이드

1. 새 일괄 패치가 필요하면 이 디렉토리에 `roundN-<purpose>.py` 추가.
2. SKIP set 에 직전 라운드 SKIP + 이번 라운드까지 손댄 spec 들을 cumulative 로 추가.
3. 실행 후 결과 카운트 (Patched / Skipped) 출력.
4. `atc-marathon.md` 에 라운드 결과 append.

## 함수명 정책

- `verifyEntered` → `verifyPageReachable` 로 rename (R8). 모든 신규 패치는 후자 사용.
  - 의미: "페이지가 진입 가능 + body 어느 정도 렌더 됨" — 진짜 페이지 검증이 아님.
  - strict 검증 (selector/text 매칭) 이 필요하면 별도 helper 작성.

## 주의사항

- 이 스크립트들은 **idempotent 보장 X**. 같은 spec 에 반복 적용 시 깨질 가능성. 항상 SKIP set 으로 가드.
- 생성/패치 후 `npx tsc --noEmit` 으로 타입 체크 필수.
- spec.ts 가 이미 handwritten 인 경우 generator 패턴 미존재 → 자동 skip.
