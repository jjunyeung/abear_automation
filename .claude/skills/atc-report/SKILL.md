---
name: atc-report
description: 최신 또는 지정 runId의 ATC 실행 리포트(reports/runs/<runId>/<runId>.md)를 stdout으로 출력하고, unhandled 에러는 강조해 보여준다. 사용자가 "ATC 리포트 보여줘", "방금 결과 뭐야" 류로 요청할 때 트리거한다.
disable-model-invocation: true
---

# /atc-report

방금 또는 지정한 ATC 실행의 결과 리포트를 빠르게 보여주는 read-only 스킬이다. 부수 효과가 없으므로 validate.sh는 동봉하지 않는다. unhandled 에러를 발견하면 즉시 강조해 사용자가 다음에 어떤 복구를 추가해야 할지 알려준다.

## 트리거

- "ATC 리포트 보여줘"
- "방금 결과 뭐야"
- "마지막 run 보여줘"
- "/atc-report"
- "/atc-report result_2026-04-28_15-12-30"

## 무엇을 하는가

인자가 없으면 `reports/runs/`에서 mtime이 가장 큰 디렉토리를 자동 선택한다. 인자가 있으면 그 runId를 사용한다. 해당 디렉토리의 `<runId>.md`를 읽어 stdout으로 출력하고, 본문에 `unhandled` 단어가 등장하면 빨강 강조 + recoveries/ 추가 안내를 덧붙인다.

## 절차

1. **runId 결정**
   - 인자 없음 → `ls -dt reports/runs/*/`로 가장 최근 디렉토리를 찾는다. 비어있으면 "아직 실행 결과가 없습니다"로 종료.
   - 인자 있음 → `reports/runs/<runId>/`가 존재하는지 검사. 없으면 사용 가능한 runId 목록을 보여주고 종료.
2. **리포트 파일 경로 확인** — `reports/runs/<runId>/<runId>.md`. 없으면 같은 디렉토리에서 `.md` 파일을 찾아 후보를 제시.
3. **본문 출력** — Read 도구로 파일을 읽어 stdout에 그대로 흘린다.
4. **unhandled 강조** — 본문에 `unhandled` 단어가 있으면 다음을 추가 출력한다.
   ```
   ⚠️  UNHANDLED 에러 감지
   → recoveries/<key>.ts 추가가 필요합니다
   → /recovery-new <key>로 새 복구 플로우를 스캐폴드하세요
   ```
   (가능하면 리포트에서 `unhandled error: <key>` 패턴을 정규식으로 뽑아 `<key>`를 채운다.)
5. **추가 액션 안내** — 같은 runId에 `<runId>.json`이 있으면 "기계용 데이터: reports/runs/<runId>/<runId>.json"도 함께 출력.

## 출력

- 리포트 본문 (전체)
- (있을 시) UNHANDLED 강조 + recoveries 추가 안내
- 관련 파일 경로 (`.md` / `.json` / `html/`)

## 검증

- 지정된 리포트 파일이 존재
- 출력 본문에 최소 한 step 이상의 결과(✅/⚠️/❌)가 포함됨
- (read-only 스킬이라 별도 validate.sh 없음)
