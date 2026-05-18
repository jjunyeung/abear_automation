---
type: feature
goal: "윈들리 ATC 프레임워크용 로컬 GUI 러너 — 카탈로그·다중선택·동적폼·실시간 관전·리포트 인라인 표시"
non_goals:
  - "ATC YAML 작성/편집 (CLI/Claude 유지)"
  - "spec.ts (Playwright 핸들러) 생성 (CLI/Claude 유지)"
  - "복구(recoveries/) 작성/관리 UI"
  - "기존 Playwright/ATC 프레임워크 자체 변경"
  - "CI/CD 통합 (D10 = 로컬 전용)"
  - "멀티유저/호스팅 배포"
  - "macOS 외 플랫폼 지원 (Windows/Linux 미지원)"
---

# Requirements

## R-B1: 주 사용자 — 솔로 운영자 + 미래 팀원/QA
- behavior: GUI는 현재 솔로 운영자가 즉시 사용 가능해야 하고, 추후 팀원/QA가 추가 설명 없이 ATC를 선택·실행할 수 있도록 직관적이어야 한다.

#### R-B1.1: 솔로 운영자 즉시 사용
- given: 솔로 운영자가 로컬 머신에서 GUI를 처음 실행한다
- when: GUI 창이 열린다
- then: 별도 온보딩 없이 ATC 카탈로그가 바로 보이고, 선택 → 폼 작성 → 실행을 3클릭 이내로 진행할 수 있다

## R-B2: 카탈로그/입력 메모리 부담 제거
- behavior: GUI는 사용자가 ATC 이름·입력 스키마·CLI 플래그를 암기하지 않아도 ATC를 선택하고 실행할 수 있게 해야 한다.

#### R-B2.1: ATC 카탈로그 자동 노출
- given: `atcs/<domain>/<name>.atc.yml` 파일들이 로컬 파일시스템에 존재한다
- when: GUI가 시작되거나 카탈로그가 새로고침된다
- then: 도메인별로 그룹화된 ATC 목록이 자동으로 렌더되어 파일 경로를 몰라도 ATC를 찾을 수 있다

#### R-B2.2: inputs 스키마 기반 동적 폼 렌더
- given: 사용자가 카탈로그에서 ATC를 선택한다
- when: 우측 패널이 갱신된다
- then: 해당 ATC의 `inputs` 스키마(type/description/example)로부터 폼이 자동 생성되어 CLI 플래그 문법을 몰라도 입력 가능하다

## R-B3: 핵심 가치 3종 — 카탈로그+폼, 실시간 관전, 히스토리 대시보드
- behavior: GUI는 카탈로그+동적 폼, 실시간 런 관전, 리포트 인라인+히스토리 대시보드의 세 기능을 v1에서 모두 제공해야 한다.

#### R-B3.1: 카탈로그+동적 폼 (필수 선행)
- given: GUI가 실행 중이다
- when: 사용자가 ATC를 선택하고 입력 폼을 작성한다
- then: 선택된 ATC와 입력값으로 실행을 즉시 트리거할 수 있다

#### R-B3.2: 실시간 런 관전
- given: ATC 실행이 시작되었다
- when: Playwright runner가 각 step을 진행한다
- then: step별 상태·로그·스크린샷이 GUI에 실시간으로 표시된다

#### R-B3.3: 히스토리 대시보드
- given: 과거 run 결과가 `reports/runs/<runId>/` 에 존재한다
- when: 사용자가 히스토리 패널을 연다
- then: 과거 run 목록과 인라인 `.md` 리포트를 GUI 안에서 바로 조회할 수 있다

## R-B4: 성공 기준 — 안정성과 QoL
- behavior: 일상적 사용 중 버그·비정상 종료가 거의 없어야 하며, 스케줄링 포함 모든 기능이 안정적으로 동작하는 상태가 성공이다.

#### R-B4.1: 일상 사용 중 비정상 종료 없음
- given: GUI가 정상 운영 중이다
- when: 사용자가 ATC 선택·실행·히스토리·스케줄 설정 등 일반 동작을 수행한다
- then: 크래시·GUI 멈춤·의도치 않은 프로세스 종료가 발생하지 않는다

#### R-B4.2: 스케줄링 포함 정상 동작
- given: 스케줄이 설정되어 있고 GUI가 꺼진 상태다
- when: 지정된 시간 또는 주기가 도래한다
- then: launchd가 ATC를 실행하고, GUI 재기동 시 해당 run 결과가 히스토리에 반영된다

## R-B5: MVP 범위 — 5개 기능 + 스케줄링
- behavior: MVP는 카탈로그+폼, 실행 엔진, 실시간 관전, 히스토리 대시보드, 스케줄링(주기+단발) 다섯 가지를 포함한다.

#### R-B5.1: 스케줄링 — 주기 + 단발 모두 지원
- given: 사용자가 GUI에서 스케줄을 설정한다
- when: cron-like 반복 또는 단발 예약 정의를 저장한다
- then: macOS launchd plist가 동적으로 생성·등록되어 GUI가 꺼진 동안에도 해당 시점에 ATC가 실행된다

#### R-B5.2: non-goal 기능 불포함
- given: 어떤 요청이든 ATC YAML 편집, spec.ts 생성, recoveries UI, 기존 프레임워크 변경, CI/CD, 멀티유저 호스팅에 해당한다
- when: 해당 기능이 GUI에 요청된다
- then: 해당 기능은 구현하지 않고 기존 CLI/Claude 워크플로우를 유지한다

## R-B6: 리스크 대응 — 8가지 운영 시나리오
- behavior: GUI는 동시 실행, 즉시 실행 UX, 닫기 처리, 입력 비영속, 크래시 감지, stale 배지, lock 충돌 시나리오를 정의된 방식으로 처리해야 한다.

#### R-B6.1: 다중 선택/추가 요청 → 큐 순차 실행
- given: `workers=1` / userDataDir SingletonLock 제약이 존재한다
- when: 사용자가 여러 ATC를 선택하거나 실행 중에 추가 실행을 요청한다
- then: 새 실행은 큐에 추가되어 현재 실행 완료 후 순차적으로 진행된다 (병렬 spawn 절대 없음)

#### R-B6.2: Run = 확인 없이 즉시 실행
- given: 사용자가 입력 폼을 작성했다
- when: Run 버튼을 누르거나 Cmd+Enter를 입력한다
- then: 별도 confirm 모달 없이 즉시 ATC가 실행된다

#### R-B6.3: GUI 닫기 시 진행 중 ATC — 선택지 제공
- given: ATC가 실행 중인 상태에서 사용자가 GUI 창 닫기를 시도한다
- when: 닫기 이벤트가 발생한다
- then: confirm 모달이 표시되어 "kill(즉시 종료)" 또는 "detach(백그라운드 계속)" 중 하나를 선택할 수 있다

#### R-B6.4: detach 후 완료 시그널 + 알림 클릭 deep-link
- given: 사용자가 닫기 시 "detach"를 선택했다
- when: 백그라운드에서 ATC 실행이 완료된다
- then: macOS 네이티브 알림이 발송되고, 알림을 클릭하면 GUI가 활성화되며 해당 run의 Report 탭이 자동으로 열린다

#### R-B6.5: 폼 입력값 비영속화
- given: 사용자가 이전 실행에서 폼에 값을 입력한 적 있다
- when: 같은 ATC를 다시 선택한다
- then: 이전 입력값이 남지 않고 폼이 빈 상태(또는 example placeholder만)로 초기화된다

#### R-B6.6: Playwright 비정상 종료 감지
- given: ATC 실행을 위해 `child_process.spawn`으로 Playwright가 기동되었다
- when: Playwright 프로세스가 예상치 못한 exit code를 반환하거나 stdout 마지막 라인에 실패 패턴이 포함된다
- then: GUI가 해당 run을 실패로 마킹하고 관련 에러 정보를 히스토리에 기록한다 (watchdog hang-kill은 구현하지 않음)

#### R-B6.7: stale ATC 자동 감지 + 배지
- given: 카탈로그에 로드된 ATC가 `login`/`enter_workspace` 같은 setup-통합된 구 step을 포함하거나 spec.ts의 handlerKeys 와 step.id 매칭이 누락되어 있다
- when: GUI가 카탈로그를 로드한다
- then: 해당 ATC에 'stale' 경고 배지가 표시되고 실행은 차단되지 않는다 (사용자 확인 후 실행 가능)

#### R-B6.8: 스케줄 실행 vs GUI 실행 SingletonLock 충돌 방지
- given: launchd가 예약된 ATC를 실행하려는데 GUI에서 이미 다른 ATC가 실행 중이다
- when: launchd job이 발화한다
- then: 파일 기반 lock 상태를 사전 체크하여 해당 스케줄 실행을 스킵하고 리포트에 "skipped(lock)"으로 마킹하며, macOS OS 알림으로 사용자에게 통지하고 다음 GUI 열림 시 상단 배너로도 표시한다

## R-U1: VSCode-style split-panel 진입 화면
- behavior: 실행 즉시 좌측에 도메인별 그룹 ATC 카탈로그, 우측에 입력 폼/실행 로그 패널이 보이는 split-pane 구조를 제공한다.

#### R-U1.1: 도메인별 그룹화된 카탈로그
- given: GUI 앱이 정상 기동되었다
- when: 좌측 패널이 카탈로그를 렌더한다
- then: ATC 항목들이 collapsible 도메인 섹션(collect/error-check/fix/upload/e2e)으로 그룹화되고 각 섹션 헤더에 도메인명과 항목 수가 표시된다

#### R-U1.2: ATC 선택 시 우측 폼 즉시 렌더
- given: 카탈로그 패널이 보이는 상태다
- when: 사용자가 좌측의 ATC 항목을 클릭한다
- then: 우측 패널이 즉시 갱신되어 선택된 ATC의 title, `inputs` 스키마 기반 typed form, Run 버튼을 보여준다

#### R-U1.3: composes/fragment ATC 시각 구분 + 단독 실행 가능
- given: 카탈로그에 `_<name>.atc.yml` 형태의 fragment ATC가 포함되어 있다
- when: 좌측 패널이 해당 항목들을 렌더한다
- then: top-level ATC와 시각적으로 구분되도록 들여쓰기 또는 dimmed 표기되고, 클릭 시 우측 폼이 렌더되어 단독 실행도 가능하다

## R-U2: ≤3-click happy path
- behavior: 사용자가 single ATC 실행을 카탈로그 선택부터 Run 트리거까지 3회 이하 상호작용으로 완료할 수 있어야 한다.

#### R-U2.1: 단일 클릭으로 선택 + 폼 로드
- given: 카탈로그가 보이고 선택된 ATC가 없다
- when: 사용자가 ATC 항목을 한 번 클릭한다
- then: 우측 패널에 입력 폼이 즉시 표시되고 추가 확인 단계 없이 폼이 인터랙티브 상태가 된다

#### R-U2.2: Run 버튼은 스크롤 없이 도달 가능
- given: 입력 필드가 5개 이하인 ATC가 선택되었고 폼이 보인다
- when: 우측 패널이 1440×900 뷰포트에서 렌더된다
- then: Run 버튼(또는 primary action)이 세로 스크롤 없이 보인다

#### R-U2.3: Cmd+Enter로 어디서든 Run 제출
- given: 우측 패널 폼이 표시되고 사용자가 한 필드 이상에 값을 입력했다
- when: 사용자가 우측 패널 안 어디서든 Cmd+Enter를 누른다
- then: pre-run 검증을 통과하는 경우 Run 버튼 클릭과 동일하게 실행이 트리거된다

## R-U3: 사전 환경 검증
- behavior: Playwright spawn 이전에 .env 환경변수 충족 여부를 검증하고 실패 시 구체적 메시지를 표시해야 한다.

#### R-U3.1: WINDLY_EXTENSION_PATH 누락 시 Run 차단
- given: 사용자가 ATC를 선택하고 모든 입력을 채웠다
- when: Run을 시도하고 `.env`가 없거나 `WINDLY_EXTENSION_PATH`가 설정되지 않았다
- then: Run 액션이 차단되고 우측 패널에 누락된 변수와 해결 방법(`.env`에 추가)을 명시한 inline 메시지가 표시되며 Playwright 프로세스는 spawn되지 않는다

#### R-U3.2: .env 파일 부재 vs 변수 누락 구분
- given: GUI가 pre-run 검증을 시도한다
- when: `.env` 파일이 프로젝트 루트에 없거나, 파일은 있으나 특정 변수가 비어있다
- then: 두 경우의 에러 메시지가 구분되어 표시되고 기대되는 파일 경로와 변수명이 함께 안내된다

## R-U4: step handler mismatch 감지 — handlerKeys manifest 파일
- behavior: 각 ATC의 step.id를 paired `tests/<domain>/<name>.handlerKeys.json` 매니페스트 파일과 비교하여 매칭 누락을 카탈로그 로드 시점에 감지한다. **spec.ts 본체는 변경하지 않는다.**

#### R-U4.1: handlerKeys manifest 파일 생성 (spec.ts 0 변경)
- given: 기존 `tests/<domain>/<name>.spec.ts` 파일 51개가 존재하고 각각 `const handlers: StepHandlers = {...}` 패턴을 사용한다
- when: T4 마이그레이션 스크립트가 각 spec.ts 를 정적으로 파싱하여 handlers 객체의 키를 추출한다
- then: 각 spec.ts 옆에 `<name>.handlerKeys.json` (단순 문자열 배열) 매니페스트 파일이 생성되며 **원본 spec.ts 는 단 한 글자도 변경되지 않는다**

#### R-U4.2: 카탈로그 로드 시 mismatch 감지 → stale 배지
- given: 카탈로그가 로드되고 ATC의 step.id 집합과 paired `<name>.handlerKeys.json` 의 키 집합이 비교된다
- when: 어느 ATC의 step.id 중 한 개라도 manifest 에 포함되지 않거나 manifest 파일 자체가 누락되었다
- then: 해당 ATC 항목에 'stale' 경고 배지가 표시되고 hover 시 매칭 누락된 step.id 목록이 tooltip으로 보이며 실행은 차단되지 않는다 (사용자 확인 dialog 후 실행 가능)

## R-U5: 카탈로그 항목 상태 표시 — 6가지
- behavior: 각 ATC 항목이 현재 라이프사이클 상태를 시각 indicator로 반영해 한눈에 전체 상태를 파악할 수 있어야 한다.

#### R-U5.1: Normal — indicator 없음
- given: ATC가 이번 세션에서 미실행이고 감지된 이슈가 없다
- when: 카탈로그가 렌더된다
- then: title과 도메인 라벨만 표시되고 추가 indicator는 없다

#### R-U5.2: Stale — 경고 배지
- given: R-U4 또는 R-B6.7의 stale 감지에 해당된다
- when: 좌측 패널이 해당 항목을 렌더한다
- then: amber/yellow 경고 배지가 항목에 표시된다

#### R-U5.3: Running — 애니메이션 spinner
- given: 어떤 ATC에 대한 Playwright 프로세스가 spawn되어 진행 중이다
- when: 카탈로그가 해당 항목을 렌더한다
- then: 애니메이션 spinner가 indicator 위치에 표시된다

#### R-U5.4: Queued — 대기 번호 배지
- given: 큐에 2개 이상의 ATC가 대기 중이다
- when: 활성 run 뒤에 대기 중인 항목이 렌더된다
- then: 큐 번호(예: "2", "3")가 배지로 표시된다

#### R-U5.5: Failed-recent — 빨간 도트
- given: 마지막으로 완료된 run의 overall 상태가 `failed` 또는 `unhandled` 다
- when: 카탈로그가 항목을 렌더한다
- then: 채워진 빨간 도트가 표시되며 다음 run 전까지 유지된다

#### R-U5.6: Passed-recent — 초록 도트
- given: 마지막 완료된 run의 overall 상태가 `success` 이거나 모든 step이 `recovered`다
- when: 카탈로그가 항목을 렌더한다
- then: 채워진 초록 도트가 표시되며 다음 run 전까지 유지된다

## R-U6: GitHub Actions 스타일 step 카드
- behavior: 실행 중 각 step이 expand/collapse 가능한 카드로 표시되고 로그 라인이 실시간으로 채워진다.

#### R-U6.1: step 카드는 실행 순서대로 등장
- given: 실행이 시작되고 우측 패널이 run view를 보여준다
- when: runner가 각 step을 시작한다
- then: 해당 step의 카드가 step 목록 하단에 추가되며 header에 step.id와 `do` 설명이 표시된다

#### R-U6.2: 진행 중 step 자동 expand, 완료 step 자동 collapse
- given: 여러 step 카드가 보인다
- when: 한 step이 pending → running으로 전이하면
- then: 그 카드가 자동 expand되어 실시간 로그를 표시하고, terminal 상태(success/failed/recovered/unhandled/skipped)로 전이되면 status 아이콘·step.id·duration을 요약한 collapsed row로 줄어든다

#### R-U6.3: 사용자가 완료 step 수동 expand 가능
- given: terminal 상태의 step 카드가 collapsed 상태다
- when: 사용자가 카드 header를 클릭한다
- then: 카드가 expand되어 해당 step 실행 중 캡쳐된 전체 로그가 표시된다

#### R-U6.4: step status 아이콘 매핑
- given: step 카드가 terminal 상태이고 collapsed 뷰다
- when: 카드가 렌더된다
- then: status 아이콘이 ATC 프레임워크의 상태값에 매핑된다 (success → 초록 체크, failed → 빨간 X, recovered → amber refresh, unhandled → 빨간 느낌표, skipped → 회색 dash)

## R-U7: 스크린샷 inline thumbnail + lightbox
- behavior: 실행 중 캡처된 스크린샷은 해당 step 카드 내부의 thumbnail로 표시되며 클릭 시 lightbox로 확대된다.

#### R-U7.1: 스크린샷 thumbnail은 step 카드 내부에 표시
- given: step 카드가 expand 상태이고 해당 step에 대해 스크린샷 파일이 작성되었다
- when: 카드 content가 렌더된다
- then: 로그 텍스트 아래에 최대 160px 너비의 thumbnail 이미지가 임베드되고 파일명이 라벨로 표시된다

#### R-U7.2: thumbnail 클릭 → lightbox
- given: step 카드 안의 스크린샷 thumbnail이 보인다
- when: 사용자가 thumbnail을 클릭한다
- then: 전체 화면 또는 near-full-screen lightbox가 열려 원본 해상도로 이미지를 표시하며 닫기 버튼과 Esc 키로 닫을 수 있다

## R-U8: .md 리포트는 GUI 내 별도 탭 렌더링
- behavior: ATC 실행 완료 후 생성된 `<runId>.md` 리포트를 GUI를 떠나지 않고 별도 탭에서 렌더링하여 볼 수 있다.

#### R-U8.1: 실행 완료 시 Report 탭 자동 활성화
- given: ATC 실행이 끝나고 `reports/runs/{runId}/{runId}.md` 가 reporter에 의해 작성되었다
- when: 우측 패널이 run 완료를 감지한다 (fs.watch)
- then: 우측 패널 header에 "Report" 탭이 표시되거나 active 상태가 되고, 탭으로 전환하면 `{runId}.md`의 Markdown이 렌더링된 상태로 보인다

#### R-U8.2: unhandled 섹션 시각적 강조
- given: 렌더된 리포트에 "Unhandled" 에러 섹션이 포함된다
- when: Report 탭이 표시된다
- then: unhandled 섹션 heading과 항목들이 빨간 테두리·경고 아이콘 등 distinct한 표기로 일반 Markdown과 구분되게 렌더된다

#### R-U8.3: 히스토리에서 과거 리포트 재조회
- given: 사용자가 히스토리/대시보드 패널의 과거 run 항목으로 이동한다
- when: 사용자가 "View Report"를 선택한다
- then: 우측 패널 Report 탭이 열리고 해당 runId의 `.md`가 렌더링된다

## R-U9: 키보드 단축키 + Cmd+K 명령 팔레트
- behavior: 핵심 파워-유저 단축키와 fuzzy ATC 검색·즉시 실행이 가능한 명령 팔레트를 제공해야 한다.

#### R-U9.1: Cmd+Enter로 Run 트리거
- given: ATC가 선택되어 우측 패널 폼이 표시된다
- when: 사용자가 우측 패널 안에서 Cmd+Enter를 누른다
- then: Run 버튼 클릭과 동일하게 (R-U3 pre-run 검증 통과 시) 실행이 트리거된다

#### R-U9.2: Cmd+/로 검색 입력에 포커스
- given: 앱 창이 포커스되어 있다
- when: 사용자가 Cmd+/를 누른다
- then: 좌측 패널의 카탈로그 search/filter 입력이 포커스를 받고 기존 검색어가 select되어 즉시 새 검색어를 입력할 수 있다

#### R-U9.3: Esc로 오버레이 닫기
- given: lightbox(R-U7.2), 명령 팔레트(R-U9.4), 또는 confirm modal이 열린 상태다
- when: 사용자가 Esc를 누른다
- then: 최상위 오버레이가 닫히고 메인 창은 닫히지 않는다 (오버레이가 없으면 무동작)

#### R-U9.4: Cmd+K로 명령 팔레트 열기
- given: 앱 창이 포커스되어 있다
- when: 사용자가 Cmd+K를 누른다
- then: 화면 중앙에 floating 팔레트 입력이 표시되고, 타이핑 시 모든 ATC 항목이 title/도메인 기준 fuzzy 필터링되며, highlighted 항목에서 Enter를 누르면 카탈로그 선택 + 우측 폼 포커스로 이어진다

#### R-U9.5: Cmd+Shift+Enter로 팔레트에서 즉시 실행
- given: Cmd+K 팔레트가 열려있고 어떤 ATC가 highlight 되어있다
- when: 사용자가 Cmd+Shift+Enter를 누른다
- then: 해당 ATC가 선택되고 Run 액션이 즉시 트리거된다 (수동 폼 포커스 단계 생략)

## R-U10: 단일 인스턴스 enforcement + 포커스 redirect
- behavior: GUI는 동시에 1개의 창만 허용하고 2번째 인스턴스 시도 시 기존 창을 활성화하며 informational 메시지를 보여준다.

#### R-U10.1: 두 번째 launch는 기존 창에 포커스
- given: GUI 창이 이미 열려 있고 실행 중이다
- when: 사용자가 .app을 다시 더블클릭하거나 `npm run gui`를 재실행한다
- then: 두 번째 프로세스는 즉시 종료되고 기존 창이 forefront로 올라온다 (Electron `app.requestSingleInstanceLock` + `second-instance` 이벤트)

#### R-U10.2: 포커스된 기존 창에 informational 토스트
- given: 두 번째 인스턴스 시도로 기존 창이 포커스된 상태다
- when: 기존 창이 `second-instance` 시그널을 수신한다
- then: "Already open — only one window allowed" 같은 transient 토스트 또는 status-bar 메시지가 4–6초간 표시된다

#### R-U10.3: 추가 BrowserWindow 생성 차단
- given: GUI가 Electron 앱이고 renderer 창이 있다
- when: 어떤 메커니즘이든 (window.open 등) 두 번째 BrowserWindow를 열려고 한다
- then: 새 창 생성이 인터셉트되어 취소되며 두 번째 renderer context가 만들어지지 않는다

## R-T1: Electron + React/TypeScript 데스크탑 스택
- behavior: GUI는 Electron 메인 프로세스 + React/TS 렌더러로 구성된 단일 데스크탑 앱으로 구현되어야 한다.

#### R-T1.1: Electron 단일 인스턴스 보장
- given: GUI 앱이 이미 실행 중이다
- when: 사용자가 동일한 .app을 다시 실행하거나 두 번째 인스턴스가 기동된다
- then: 두 번째 인스턴스는 즉시 종료되고 기존 창이 포커스를 얻는다 (`app.requestSingleInstanceLock()`)

#### R-T1.2: Vite + electron-builder 빌드 도구
- given: 개발 빌드 또는 프로덕션 패키징을 수행한다
- when: `npm run gui` 또는 패키징 커맨드가 실행된다
- then: Vite + @vitejs/plugin-react가 렌더러 번들을 빌드하고, electron-builder가 macOS `.app`/`.dmg`/`.zip` 아티팩트를 생성한다

#### R-T1.3: gui/ 코드도 strict TS — any 금지
- given: `gui/` 하위의 모든 `.ts`/`.tsx` 파일
- when: PostToolUse 훅이 `npx tsc --noEmit`을 실행한다
- then: `strict: true` + `noImplicitAny` 위반이 0건이어야 한다 (C1, `.claude/rules/typescript-strict.md`)

## R-T2: ATC 실행은 child_process.spawn 직접 호출
- behavior: GUI 메인 프로세스가 `child_process.spawn('npx', ['playwright', 'test', '--project=<domain>', ...])`로 ATC를 실행하고, `npm run atc` 스크립트에는 의존하지 않는다.

#### R-T2.1: 도메인 프로젝트 인자 자동 결정
- given: 사용자가 `atcs/<domain>/<name>.atc.yml`을 선택하고 Run을 트리거했다
- when: spawn 인자가 조립된다
- then: `--project=windly-<domain>`과 ATC YAML 경로(또는 paired spec.ts 경로)가 포함된 인자 배열이 만들어진다

#### R-T2.2: 환경변수 상속 — GUI는 .env 미개입
- given: 메인 프로세스가 spawn을 호출한다
- when: child_process 옵션이 설정된다
- then: `env` 옵션이 명시되지 않아 부모 환경(`.env`를 dotenv가 이미 로드한 상태)이 자식에게 그대로 상속되며, GUI는 `.env`를 직접 파싱하지 않는다

#### R-T2.3: runId는 GUI가 생성하지 않음
- given: spawn 직후
- when: GUI가 실행 결과 디렉토리를 식별하려 한다
- then: GUI는 `buildRunId()`를 호출하지 않고 `reports/runs/`를 재스캔하거나 stdout을 파싱해 Playwright가 생성한 runId를 사후 발견한다 (`lib/config.ts:50-59` 단일 진입점 유지)

## R-T3: 실시간 스트리밍은 Electron IPC만 — 네트워크 포트 없음
- behavior: spawn 자식 프로세스의 stdout/stderr 스트림은 Electron IPC(ipcMain → contextBridge → ipcRenderer)로 렌더러에 전달되고, WebSocket·HTTP 등 외부 포트는 열지 않는다.

#### R-T3.1: stdout 라인 단위 IPC 전송
- given: child_process가 실행 중이고 stdout에 데이터가 출력된다
- when: 메인 프로세스에서 `data` 이벤트가 수신된다
- then: ipcMain이 해당 데이터를 `atc:log` 채널로 렌더러에 즉시 전달한다

#### R-T3.2: 프로세스 종료 신호 IPC 전달
- given: spawn된 Playwright 프로세스가 실행 중이다
- when: `exit` 또는 `close` 이벤트가 발생한다
- then: exit code와 runId(있다면)가 `atc:done` 채널로 렌더러에 알림된다

#### R-T3.3: preload 채널 화이트리스트
- given: preload 스크립트가 contextBridge를 통해 IPC API를 노출한다
- when: 렌더러가 IPC를 호출한다
- then: 화이트리스트된 채널 (`atc:run`, `atc:kill`, `atc:log`, `atc:done`, `catalog:list`, `schedule:create`, `schedule:delete` 등)에 한해서만 통신이 허용된다

## R-T4: 스케줄링 — macOS launchd plist 동적 관리
- behavior: cron-like 반복과 단발 예약 모두 launchd plist 동적 생성·등록·삭제로 구현되어 GUI가 꺼진 상태에서도 발화된다.

#### R-T4.1: 반복 스케줄 — StartCalendarInterval
- given: 사용자가 "매일 09:00" 같은 cron-like 스케줄을 생성한다
- when: GUI가 launchd에 등록한다
- then: `StartCalendarInterval` 키를 포함한 plist가 `~/Library/LaunchAgents/cc.windly.atc.<schedule-id>.plist`에 생성되고 `launchctl load`가 실행된다

#### R-T4.2: 단발 예약 — 발화 후 자동 unload
- given: 사용자가 "오늘 22:00 한 번" 같은 단발 예약을 생성한다
- when: 해당 plist 발화가 1회 완료된다
- then: launchd 래퍼 스크립트 또는 GUI 재기동 시 cleanup 로직이 해당 plist를 unload + 삭제하여 재발화를 방지한다

#### R-T4.3: 스케줄 삭제 시 plist 정리
- given: 사용자가 GUI에서 스케줄을 삭제한다
- when: 삭제 액션이 처리된다
- then: `launchctl unload` 후 해당 plist 파일이 삭제되고 `schedules.json`에서도 항목이 제거된다

## R-T5: 파일 기반 lock + skip-on-collision
- behavior: launchd가 예약 ATC를 기동하려 할 때 GUI 또는 다른 ATC가 이미 userDataDir SingletonLock을 잡고 있다면 파일 기반 lock 확인 후 스킵하고 사용자에게 알림한다.

#### R-T5.1: Run 시작 전 lock 파일 생성
- given: GUI 메인 프로세스 또는 launchd 래퍼가 spawn 직전 단계에 있다
- when: lock 확인이 수행된다
- then: `<userData>/.gui-run.lock` 파일이 없으면 생성(PID 기록)하고 spawn을 진행하며, 이미 존재하면 "skipped(lock)" 결과를 기록하고 spawn하지 않는다

#### R-T5.2: Run 완료 시 lock 파일 삭제
- given: spawn된 Playwright 프로세스의 exit 이벤트가 발생한다
- when: exit code와 무관하게 종료가 감지된다
- then: `.gui-run.lock` 파일이 즉시 삭제되어 다음 실행 또는 launchd 발화가 가능한 상태가 된다

#### R-T5.3: skip 발생 시 사용자 알림
- given: launchd 발화가 lock 충돌로 스킵되었다
- when: 스킵 결과가 기록된다
- then: macOS OS 네이티브 알림이 발송되고, 다음 GUI 열림 시 상단 토스트/배너로도 "최근 스케줄 스킵됨" 표시가 일정 시간 노출된다

## R-T6: 동시성 제한 — 전역 1 워커 + 순차 큐
- behavior: GUI는 동시에 1개의 Playwright 실행만 허용하고 추가 요청은 순차 큐에 적재한다.

#### R-T6.1: 큐 대기 상태 UI 반영
- given: 큐에 대기 중인 ATC가 있다
- when: 렌더러가 카탈로그 항목 상태를 갱신한다
- then: 해당 항목이 `Queued(n번째)` 상태 배지로 표시된다

#### R-T6.2: 병렬 spawn 절대 금지
- given: GUI 메인 프로세스에 Run 요청이 2개 이상 동시에 도착했고 이미 spawn이 활성이다
- when: 두 번째 이후 요청이 처리된다
- then: 즉시 spawn되지 않고 큐에만 적재되며, userDataDir SingletonLock 충돌을 유발하는 병렬 Playwright 기동은 발생하지 않는다 (`playwright.config.ts:51-52`, `lib/test-fixture.ts:123-159`)

## R-T7: runs 결과 발견 — reports/runs/ SSOT + chokidar
- behavior: GUI는 `reports/runs/`를 단일 정보 소스로 취급하며 앱 시작 시 전체 재스캔, 활성 중에는 chokidar fs.watch로 새 runId를 감지한다.

#### R-T7.1: 앱 시작 시 기존 runs 인덱싱
- given: Electron 앱이 기동된다
- when: 메인 프로세스 초기화 단계가 실행된다
- then: `reports/runs/`를 glob 스캔하여 기존 `<runId>.json` 파일들을 읽고 히스토리 목록을 구성한다 (스키마: `{ atc_title, steps[{step_id, status, duration_ms, error_key, recovery_id, message}], overall, inputs_used }`)

#### R-T7.2: 활성 중 신규 runId 자동 감지
- given: GUI가 열려있고 chokidar가 `reports/runs/`를 watch한다
- when: 새 `reports/runs/<runId>/` 디렉토리 또는 `<runId>.json` 파일이 생성된다
- then: 히스토리 목록에 해당 runId가 자동 추가되고 완료 여부가 반영된다

#### R-T7.3: launchd post-hook 의존 금지
- given: launchd가 ATC를 실행하고 완료했다
- when: GUI가 해당 run의 결과를 발견한다
- then: launchd plist에 post-exit hook을 추가하지 않고 순수 파일시스템 watch만으로 발견한다

## R-T8: 데이터 영속화 — Electron userData 폴더
- behavior: 스케줄 정의, runs 인덱스 캐시, lock 파일은 `~/Library/Application Support/Windly ATC Runner/`(Electron `app.getPath('userData')`)에 저장된다.

#### R-T8.1: schedules.json은 userData에 저장
- given: 사용자가 스케줄을 생성·수정·삭제한다
- when: 변경이 적용된다
- then: `<userData>/schedules.json`이 갱신되며 레포 디렉토리에는 저장되지 않는다

#### R-T8.2: reports/runs/ 결과는 GUI가 이동·복사·삭제 금지
- given: Playwright가 `reports/runs/<runId>/`에 결과를 기록했다
- when: GUI가 해당 결과를 표시한다
- then: `.json`/`.md`/스크린샷을 읽기 전용으로만 소비하며 파일을 이동·복사·삭제하지 않는다 (D6 컨벤션 유지)

#### R-T8.3: lock 파일은 userData에 위치
- given: R-T5의 `.gui-run.lock`이 필요하다
- when: 파일 경로가 결정된다
- then: `<userData>/.gui-run.lock`을 사용하며 레포 루트나 `reports/` 안에 생성하지 않는다

## R-T9: 플랫폼 — macOS 전용 하드 제약
- behavior: GUI는 macOS 전용으로만 구현하며 Windows/Linux 추상화 레이어를 두지 않는다.

#### R-T9.1: launchd 하드 의존
- given: 스케줄링 발화 메커니즘이 구현된다
- when: 발화 방식이 선택된다
- then: macOS launchd만 사용하며 node-cron이나 setTimeout 기반 in-process 대안을 launchd 대체로 사용하지 않는다

#### R-T9.2: electron-builder macOS 타겟만 설정
- given: electron-builder 패키징 설정을 구성한다
- when: 배포 아티팩트가 정의된다
- then: `mac` 타겟만 활성화하고 `win`/`linux` 타겟은 추가하지 않는다

## R-T10: 의존성 — npm 단독 + 승인된 신규 deps
- behavior: GUI 추가에 필요한 신규 패키지는 `npm install`로만 설치하며 승인된 목록 외 패키지를 추가하지 않는다.

#### R-T10.1: 승인된 신규 패키지 목록
- given: GUI 구현이 시작된다
- when: `npm install`로 신규 의존성을 추가한다
- then: `electron`, `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `electron-builder`, `react-markdown` (또는 `marked`), `chokidar`만 추가하며 `ws`(WebSocket)는 IPC로 대체되었으므로 추가하지 않는다

#### R-T10.2: lockfile 단일 유지
- given: 신규 패키지 설치 후
- when: 레포 루트가 검사된다
- then: `package-lock.json`만 존재하고 `yarn.lock`/`pnpm-lock.yaml`/`bun.lock*`은 생성되지 않는다 (C2, `.claude/rules/npm-only.md`)

## R-T11: 단일 레포 — gui/ 디렉토리 평행 배치
- behavior: GUI 코드는 기존 레포의 `gui/` 디렉토리에 위치하며 기존 `atcs/`/`lib/`/`tests/`/`recoveries/`/`reporters/` 구조를 변경하지 않는다.

#### R-T11.1: tsconfig include에 gui/** 추가
- given: 기존 `tsconfig.json`의 `include` 배열이 있다
- when: GUI 코드가 추가된다
- then: `"gui/**"` 항목이 `include`에 추가되고 기존 항목은 그대로 유지된다

#### R-T11.2: npm run gui 스크립트 추가
- given: 개발자가 GUI를 실행한다
- when: `npm run gui`를 실행한다
- then: Electron + Vite dev 서버가 기동되며 `package.json`의 `scripts`에 해당 스크립트가 명시되어 있다

#### R-T11.3: 기존 npm run atc 동작 불변
- given: `gui/` 코드가 추가되었다
- when: `npm run atc -- atcs/<domain>/<name>.atc.yml`을 실행한다
- then: 기존 runner/reporter/config/tests 동작이 GUI 추가 이전과 완전히 동일하다

## R-T12: 단방향 의존 — GUI → lib only
- behavior: `gui/` 코드는 `lib/*`을 import할 수 있으나 `tests/`/`recoveries/`/`atcs/`를 직접 import해서는 안 되며, `lib/`은 `gui/`를 import해서는 안 된다.

#### R-T12.1: GUI → lib/* import 허용
- given: GUI가 ATC 카탈로그 로드, 스키마 검증, runId/env 유틸을 사용한다
- when: GUI 코드가 `lib/atc-loader.ts`/`lib/atc-schema.ts`/`lib/config.ts` 등을 import한다
- then: 해당 import는 허용되며 정상 타입 추론이 동작한다

#### R-T12.2: GUI → tests/recoveries/atcs 직접 import 금지
- given: `gui/` 내의 소스 파일
- when: `tests/`/`recoveries/`/`atcs/` 경로를 import 구문에 사용한다
- then: 해당 import는 존재하지 않으며 코드 리뷰 또는 tsc 에서 경로 위반이 드러난다

#### R-T12.3: lib/ → gui/ import 금지
- given: `lib/` 내의 소스 파일
- when: `gui/` 경로를 import 구문에 사용한다
- then: 해당 import는 존재하지 않는다 (CLAUDE.md §h 단방향 보존)

## R-T13: 리포트 데이터 소비 — .json/.md 읽기 전용
- behavior: GUI는 `reports/runs/<runId>/<runId>.json`과 `<runId>.md`를 reporter 생성 그대로 읽기 전용으로 소비한다.

#### R-T13.1: .json 스키마 변경 없이 그대로 사용
- given: GUI가 run 결과를 렌더링한다
- when: `<runId>.json`을 파싱한다
- then: 기존 스키마(atc_title/steps/overall/inputs_used)를 그대로 사용하며 reporter 출력 형식을 GUI 편의를 위해 변경하지 않는다 (`reporters/atc-reporter.ts:14-31`)

#### R-T13.2: .md 인라인 렌더링
- given: GUI에서 Report 탭이 선택된다
- when: `<runId>.md`가 로드된다
- then: react-markdown(또는 marked)로 GUI 내부 별도 탭에 렌더링되며 외부 viewer/브라우저를 열지 않는다

## R-T14: Renderer 보안 — contextIsolation + 화이트리스트
- behavior: Electron BrowserWindow는 `contextIsolation: true`, `nodeIntegration: false`로 생성되며 렌더러가 Node API에 직접 접근할 수 없다.

#### R-T14.1: contextIsolation/nodeIntegration 강제
- given: BrowserWindow 생성 옵션이 설정된다
- when: GUI 앱이 기동된다
- then: 모든 BrowserWindow의 `webPreferences`에 `contextIsolation: true`, `nodeIntegration: false`가 명시된다

#### R-T14.2: preload 채널 화이트리스트
- given: preload.ts에서 `contextBridge.exposeInMainWorld`가 정의된다
- when: 렌더러가 IPC API를 호출한다
- then: 미리 등록된 채널 목록(R-T3.3 참조) 외 임의 채널 사용이 차단된다

#### R-T14.3: .env 미접근
- given: GUI 메인 프로세스가 실행 중이다
- when: 환경변수가 필요한 상황이 발생한다
- then: GUI는 `.env`를 직접 파싱하거나 credential을 렌더러에 노출하지 않고 spawn 시 자식 프로세스(`lib/config.ts` 경유)에 위임한다

## R-T15: 네트워크 포트 미사용
- behavior: GUI 앱은 어떠한 TCP/UDP 포트도 열지 않으며 모든 통신은 Electron IPC 내부 채널만 사용한다.

#### R-T15.1: WebSocket/HTTP 서버 금지
- given: GUI 메인 프로세스 초기화 코드
- when: 통신 채널이 설정된다
- then: `ws`/`socket.io`/`express`/`http.createServer` 등 네트워크 서버 코드가 존재하지 않는다

#### R-T15.2: 원격 URL 로드 금지
- given: BrowserWindow loadURL/loadFile 호출
- when: 렌더러가 로드할 URL이 결정된다
- then: `file://` 프로토콜 또는 Vite dev 서버의 `localhost`만 사용되며 외부 URL을 BrowserWindow에 직접 로드하지 않는다

## R-T16: 사전 검증 — EXTENSION_PATH + handlerKeys 매칭
- behavior: Run 직전에 환경변수와 ATC step.id ↔ spec.ts handlerKeys 매칭 누락을 검증하여 명확한 오류 메시지를 제공한다.

#### R-T16.1: WINDLY_EXTENSION_PATH 사전 체크
- given: 사용자가 UI ATC의 Run을 트리거했다
- when: spawn 직전 사전 검증이 수행된다
- then: `process.env.WINDLY_EXTENSION_PATH`가 falsy이거나 해당 경로가 존재하지 않으면 실행을 차단하고 UI에 명확한 오류 메시지를 표시한다

#### R-T16.2: handlerKeys 매칭 검증 (stale 배지)
- given: 카탈로그 로드 시 ATC의 step.id 집합과 paired `<name>.handlerKeys.json` 매니페스트의 키 집합이 비교된다
- when: 한 개라도 step.id가 매니페스트에 없거나 매니페스트 파일 자체가 누락된다
- then: 해당 ATC에 'stale' 배지를 표시하지만 실행은 차단하지 않는다 (사용자 확인 후 진행 가능)

## R-T17: Chromium/Playwright 비정상 종료 감지 — exit + stdout
- behavior: spawn된 Playwright 프로세스의 exit code와 stdout 마지막 라인을 파싱하여 성공/실패를 판정하며 watchdog timeout은 구현하지 않는다.

#### R-T17.1: exit code 기반 성공/실패 판정
- given: spawn 프로세스가 종료된다
- when: `close` 이벤트의 code가 평가된다
- then: code가 0이면 성공, 비0이면 실패로 판정하고 UI 상태에 반영한다

#### R-T17.2: stdout 실패 패턴 파싱
- given: Playwright stdout에 "X failed" 또는 오류 요약 같은 실패 패턴이 출력되었다
- when: 프로세스 종료 후 stdout 버퍼를 분석한다
- then: 실패 패턴이 감지되면 run 상태를 failed로 마킹하고 해당 라인을 UI 로그에 강조 표시한다

## R-T18: GUI 닫기 시 처리 — Confirm + kill/detach + deep-link
- behavior: 진행 중 run이 있을 때 GUI 창 닫기를 시도하면 confirm 모달로 kill/detach를 선택하게 하며, detach 완료 시 OS 알림을 보내고 알림 클릭 시 Report 탭으로 deep-link한다.

#### R-T18.1: kill 선택 시 SIGTERM 후 창 닫기
- given: confirm 모달에서 사용자가 "kill"을 선택했다
- when: 모달 확인이 처리된다
- then: spawn된 Playwright 프로세스에 SIGTERM이 전달되고 종료 후 GUI 창이 닫힌다

#### R-T18.2: detach 선택 시 백그라운드 계속 실행 + 알림
- given: confirm 모달에서 사용자가 "detach"를 선택했다
- when: 모달 확인이 처리된다
- then: spawn 프로세스는 `detached: true`로 계속 실행되고 GUI 창만 닫히며 run 완료 시 macOS 네이티브 알림이 발송된다

#### R-T18.3: 알림 클릭 → GUI 활성화 + Report 탭 deep-link
- given: detach 후 run 완료 알림이 발송되었다
- when: 사용자가 OS 알림을 클릭한다
- then: GUI가 활성화(또는 재기동)되고 해당 runId의 Report 탭이 우측 패널에 자동으로 열려 `.md` 리포트가 즉시 보인다

## Open Decisions

### OD-1: MVP 컷 priority (일정 압박 시)
- context: WHAT 라운드에서 카탈로그+폼/실시간 관전/히스토리 대시보드 셋 다 동등하게 중요하다고 했으나 "일정 압박 없음"으로 컷 결정을 deferred 했다. 현재는 셋 다 v1 범위.
- options: [실시간 관전 우선 (v1) / 히스토리 대시보드 우선 (v1) / 셋 다 v1 — 현재 가정]
- impact: 향후 일정 압박이 발생하면 v2로 미루는 항목을 결정해야 함. 결정 전까지는 셋 다 v1 범위로 진행.
