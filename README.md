# Windly ATC Framework

Playwright 기반 자동화 테스트 케이스(ATC) 실행 프레임워크. 자유양식 ATC를 작성하면 Claude가 Playwright 코드로 변환하고, 에러 발생 시 별도 복구 플로우로 분기 후 복귀해 단계별 결과를 기록합니다.

## 빠른 시작

```bash
cp .env.example .env
# .env 편집 — WINDLY_EXTENSION_PATH, WINDLY_BASE_URL 등

npx playwright install chromium     # 최초 1회

npm run typecheck                    # 타입 검증
npm run atc -- atcs/collect/product-error-check.atc.yml \
  --url=https://item.taobao.com/...
```

## 디렉토리 구조

| 경로                              | 용도                                                       |
|-----------------------------------|------------------------------------------------------------|
| `atcs/<domain>/<name>.atc.yml`    | ATC 선언 (YAML, 자유양식 step)                             |
| `tests/<domain>/<name>.spec.ts`   | 대응 Playwright spec (StepHandlers 정의)                   |
| `recoveries/<id>.ts`              | 복구 플로우 (단일 함수 export)                             |
| `lib/`                            | 런타임 (loader, runner, recovery-registry, errors, schema) |
| `reporters/atc-reporter.ts`       | 단계별 `.md` + `.json` 리포터                              |
| `reports/runs/<runId>/`           | 실행 결과 (`runId = result_YYYY-MM-DD_HH-MM-SS`)           |
| `.claude/{rules,skills,hooks}`    | Claude Code 가드레일                                       |
| `CLAUDE.md`                       | Claude 를 위한 단일 진입점 (도메인·결정·절차)              |

## Playwright 프로젝트 (도메인별)

`windly-collect`, `windly-error-check`, `windly-fix`, `windly-upload`, `windly-e2e` —
`npx playwright test --project=<name>` 으로 선택 실행.

## 새 ATC / 복구 추가
- 새 ATC: `/atc-new` 또는 `CLAUDE.md` (d) 절차
- 새 복구: `/recovery-new <id>` 또는 `CLAUDE.md` (e) 절차

## 더 깊이
- 결정·제약·요건: `.hoyeon/specs/atc-framework/requirements.md`
- 가드레일: `.claude/rules/`
- 도메인 스킬: `.claude/skills/`
