# docs/ — 프로젝트 문서

루트를 깔끔히 유지하기 위해 마크다운 문서를 성격별로 모았다. 프레임워크 진입점은 여전히 루트 `CLAUDE.md`.

| 폴더 | 용도 | 주요 파일 |
|------|------|-----------|
| `reference/` | 안정적 참조 자료 (CLAUDE.md 가 가리킴) | `code-map.md` (시나리오↔frontend 레포 매핑), `legacy-shortcuts.md` (레거시 automation 카탈로그), `atc-consolidation-log.md` (ATC 묶기 결정 로그) |
| `reports/` | 생성된 분석 리포트 (스냅샷) | `atc-coverage.md`, `atc-improvement.md`, `tc-dedupe.md`, `tc-gap.md`, `tc-gap-2026-06-04.md`, `tc-uncovered.md` |
| `progress/` | 진행 상황 · 핸드오프 | `atc-marathon.md`, `p0-progress.md`, `p0-backlog.md`, `next-steps.md`, `handoff-coverage-2026-06-09.md` |
| `planning/` | 계획 · 결정 문서 | `atc-decisions.md`, `e2e-regression-plan.md`, `refactor-plan.md` |
| `bug-reports/` | 백엔드/프론트로 넘기는 버그 리포트 (CLAUDE.md (m)) | `delivery-agency-WS1014.md` |

> 새 버그 리포트는 `docs/bug-reports/<area>-<short-id>.md` 에 작성한다 (CLAUDE.md (m) 참조).
