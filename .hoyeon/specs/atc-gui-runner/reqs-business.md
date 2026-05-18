---
spec: "atc-gui-runner"
phase: extract
axis: business
count: 6
---

# Business Requirements

## R-B1: 주 사용자 — 솔로 운영자 + 미래 팀원/QA
- **type**: constraint
- **behavior**: GUI는 현재 솔로 운영자가 혼자 쓸 수 있어야 하고, 추후 팀원·QA가 추가 설명 없이도 ATC를 선택·실행할 수 있을 만큼 직관적이어야 한다.
- **source**: [Business.WHO.Q]
- **confidence**: high
- **open_questions**: none

### Sub-requirements

#### R-B1.1: 솔로 운영자 즉시 사용
- **given**: 솔로 운영자가 로컬 머신에서 GUI를 실행한다
- **when**: GUI가 처음 열린다
- **then**: 별도 온보딩 없이 ATC 카탈로그가 바로 보이고, 선택 → 폼 작성 → 실행을 3클릭 이내로 진행할 수 있다

---

## R-B2: 핵심 고통 — 카탈로그/입력 메모리 부담 제거
- **type**: functional
- **behavior**: GUI는 사용자가 ATC 이름·입력 스키마를 암기하거나 CLI 명령어를 직접 타이핑하지 않아도 ATC를 선택하고 실행할 수 있게 해야 한다.
- **source**: [Business.WHY.Q]
- **confidence**: high
- **open_questions**: none

### Sub-requirements

#### R-B2.1: ATC 카탈로그 자동 노출
- **given**: `atcs/<domain>/<name>.atc.yml` 파일들이 로컬 파일시스템에 존재한다
- **when**: GUI가 시작되거나 카탈로그 패널이 열린다
- **then**: 도메인별로 그룹화된 ATC 목록이 자동으로 렌더되어 사용자가 파일 경로를 몰라도 ATC를 찾을 수 있다

#### R-B2.2: 동적 입력 폼 렌더
- **given**: 사용자가 카탈로그에서 ATC를 선택한다
- **when**: ATC가 선택된다
- **then**: 해당 ATC의 `inputs` 스키마(type, description, example)로부터 폼이 자동 생성되어, CLI 플래그 문법을 몰라도 입력값을 채울 수 있다

---

## R-B3: 핵심 가치 3종 — 카탈로그+폼, 실시간 관전, 히스토리 대시보드
- **type**: functional
- **behavior**: GUI는 ATC 카탈로그+동적 폼, 실시간 런 관전(로그/스크린샷/step), 리포트 인라인+히스토리 대시보드의 세 가지 기능을 v1에서 모두 제공해야 한다.
- **source**: [Business.WHAT.Q, Business.WHAT.Drill]
- **confidence**: high
- **open_questions**: OD-1 — 일정 압박이 생기면 실시간 관전 vs 히스토리 중 하나를 v2로 미룰 수 있으나, 현재는 셋 다 v1 범위

### Sub-requirements

#### R-B3.1: 카탈로그+동적 폼 (필수 선행)
- **given**: GUI가 실행 중이다
- **when**: 사용자가 ATC를 선택하고 입력 폼을 작성한다
- **then**: 선택된 ATC와 입력값으로 실행을 즉시 트리거할 수 있다

#### R-B3.2: 실시간 런 관전
- **given**: ATC 실행이 시작됐다
- **when**: Playwright가 step을 진행한다
- **then**: step별 상태·로그·스크린샷이 GUI에 실시간으로 표시된다

#### R-B3.3: 히스토리 대시보드
- **given**: 과거 run이 `reports/runs/<runId>/`에 존재한다
- **when**: 사용자가 히스토리 패널을 연다
- **then**: 과거 run 목록과 인라인 리포트(`.md` 렌더)를 GUI 안에서 바로 볼 수 있다

---

## R-B4: 성공 기준 — 안정성과 사용성(QoL) 기반
- **type**: quality
- **behavior**: GUI는 일상적 사용 중 버그·비정상 종료가 거의 없어야 하며, 스케줄링 포함 모든 기능이 안정적으로 동작하는 상태가 성공이다.
- **source**: [Business.SUCCESS.Q, Business.SUCCESS.Drill]
- **confidence**: high
- **open_questions**: 정량 임계값(에러율 X% 이하 등)은 명시적으로 정하지 않음 — 일상 사용 중 이상 없음이 기준

### Sub-requirements

#### R-B4.1: 일상 사용 중 비정상 종료 없음
- **given**: GUI가 정상 운영 중이다
- **when**: 사용자가 ATC 선택, 실행, 히스토리 조회, 스케줄 설정 등 일반 동작을 수행한다
- **then**: 크래시·GUI 멈춤·의도치 않은 프로세스 종료가 발생하지 않는다

#### R-B4.2: 스케줄링 포함 정상 동작
- **given**: 스케줄이 설정되어 있고 GUI가 꺼진 상태다
- **when**: 지정된 시간 또는 주기가 도래한다
- **then**: launchd가 ATC를 실행하고, GUI를 다시 열면 해당 run 결과가 히스토리에 반영된다

---

## R-B5: 범위(MVP) — 5개 기능 + 스케줄링 포함, non-goal 명시
- **type**: constraint
- **behavior**: MVP는 카탈로그+폼, 실행 엔진, 실시간 관전, 히스토리 대시보드, 스케줄링(주기적+단발 예약)을 포함하며, ATC YAML 편집·spec.ts 생성·복구 UI·CI/CD·멀티유저 호스팅은 이번 범위에서 제외된다.
- **source**: [Business.SCOPE.Q, Business.SCOPE.Drill]
- **confidence**: high
- **open_questions**: none

### Sub-requirements

#### R-B5.1: 스케줄링 — 주기 + 단발 예약 모두 지원
- **given**: GUI가 실행 중이고 사용자가 스케줄을 설정한다
- **when**: 주기(매일/매시간 등) 또는 단발(X시간 후, 오늘 22:00) 예약을 저장한다
- **then**: launchd plist가 동적으로 생성·등록되어 GUI가 꺼진 동안에도 해당 시간에 ATC가 실행된다

#### R-B5.2: non-goal 기능 미포함
- **given**: 어떤 요청이든 non-goal 항목(ATC YAML 편집, spec.ts 생성, recoveries 작성 UI, 기존 프레임워크 변경, CI/CD, 멀티유저 호스팅)에 해당한다
- **when**: 해당 기능이 GUI에서 구현 요청된다
- **then**: 해당 기능은 구현하지 않는다 — 기존 CLI/Claude 워크플로우를 유지한다

---

## R-B6: 리스크 대응 — 6가지 운영 시나리오 처리
- **type**: functional
- **behavior**: GUI는 동시 실행 충돌, 즉시 실행 UX, 닫기 시 ATC 처리, 입력값 비영속화, 크래시 감지, stale ATC 배지의 여섯 가지 리스크 시나리오를 정의된 방식으로 처리해야 한다.
- **source**: [Business.RISK.Q(동시 Run), Business.RISK.Q(prod 안전장치), Business.RISK.Q(GUI 닫기), Business.RISK.Q(폼 입력값 영속화), Business.RISK.Q(Playwright 비정상 종료), Business.RISK.Q(stale ATC)]
- **confidence**: high
- **open_questions**: watchdog hang-kill timeout 값은 미정 (Q&A에서 명시되지 않음)

### Sub-requirements

#### R-B6.1: 다중 선택 → 큐 순차 실행
- **given**: `workers=1` / `userDataDir SingletonLock` 제약이 존재한다
- **when**: 사용자가 여러 ATC를 선택하거나 실행 중에 추가 실행을 요청한다
- **then**: 새 실행은 큐에 추가되어 현재 실행 완료 후 순차적으로 진행된다 — 병렬 실행 시도 없음

#### R-B6.2: Run 버튼 = 확인 없이 즉시 실행
- **given**: 사용자가 입력 폼을 작성했다
- **when**: Run 버튼을 누른다
- **then**: 별도 confirm 모달 없이 즉시 ATC가 실행된다

#### R-B6.3: GUI 닫기 시 진행 중 ATC — 선택지 제공
- **given**: ATC가 실행 중인 상태에서 사용자가 GUI 닫기를 시도한다
- **when**: 닫기 이벤트가 발생한다
- **then**: confirm 모달이 표시되어 사용자가 "kill(즉시 종료)" 또는 "detach(백그라운드 계속)" 중 하나를 선택할 수 있다

#### R-B6.4: detach 후 완료 시그널
- **given**: 사용자가 닫기 시 "detach"를 선택했다
- **when**: 백그라운드에서 ATC 실행이 완료된다
- **then**: macOS 네이티브 알림이 발송되고, GUI를 다시 열면 runs 목록에 해당 결과가 표시된다

#### R-B6.5: 폼 입력값 비영속화
- **given**: 사용자가 이전 실행에서 폼에 값을 입력한 적 있다
- **when**: 같은 ATC를 다시 선택한다
- **then**: 이전 입력값이 남아 있지 않고 폼이 빈 상태로 초기화된다 — stale 입력 실수 방지

#### R-B6.6: Playwright 비정상 종료 감지
- **given**: ATC 실행을 위해 `child_process.spawn`으로 Playwright가 기동됐다
- **when**: Playwright 프로세스가 예상치 못한 exit code를 반환하거나 마지막 stdout 라인에 실패 메시지가 포함된다
- **then**: GUI가 해당 run을 실패로 마킹하고 관련 에러 정보를 히스토리에 기록한다

#### R-B6.7: stale ATC 감지 및 배지 표시
- **given**: 카탈로그에 로드된 ATC에 `login` / `enter_workspace` 등 이미 setup project로 통합된 구 step이 포함되어 있다
- **when**: GUI가 카탈로그를 로드한다
- **then**: 해당 ATC에 'stale' 배지가 표시되고, 실행 자체는 허용되며 차단하지 않는다

#### R-B6.8: 스케줄 실행과 GUI 실행의 SingletonLock 충돌 방지
- **given**: launchd가 예약된 ATC를 실행하려 하는데 GUI에서 이미 ATC가 실행 중이다
- **when**: launchd job이 발화한다
- **then**: GUI가 lock 상태를 파일 기반으로 사전 체크하여 해당 스케줄 실행을 스킵하고, 리포트에 "skipped(lock)"으로 마킹한다 — 재시도 없이 다음 발화 때 재시도

---

<!--
Parsing hints:
  - Requirement ID:     ^## R-[BUT]\d+: (.+)
  - Field:              ^- \*\*(\w+)\*\*: (.+)
  - Sub-requirement ID: ^#### R-[BUT]\d+\.\d+: (.+)
  - GWT fields:         given/when/then under sub-requirement
  - Axis codes:         B=Business, U=UX, T=Tech
-->
