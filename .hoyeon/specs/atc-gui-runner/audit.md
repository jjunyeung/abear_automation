
- 2026-05-13T07:16:43Z WORKER_SPAWN T4 mode=agent round=1
- 2026-05-13T07:20:34Z WORKER_RESULT T4 status=done
- 2026-05-13T07:20:34Z COMMIT_SKIP round=1 work=no-commit
- 2026-05-13T07:29:58Z WORKER_SPAWN T1 mode=direct round=2
- 2026-05-13T07:36:27Z WORKER_RESULT T1 status=done
- 2026-05-13T07:36:27Z WORKER_SPAWN T2 mode=direct round=3
- 2026-05-13T07:42:22Z WORKER_RESULT T2 status=done
- 2026-05-13T07:42:22Z WORKER_SPAWN T3 mode=direct round=4
- 2026-05-13T07:45:45Z WORKER_RESULT T3 status=done
- 2026-05-13T07:47:41Z SESSION_BREAK L0 complete (T1-T4 done); resume next session via /execute .hoyeon/specs/atc-gui-runner/
- 2026-05-13T07:50:00Z WORKER_SPAWN T7 mode=agent round=5
- 2026-05-13T07:50:00Z WORKER_SPAWN T8 mode=agent round=5
- 2026-05-13T07:50:00Z WORKER_SPAWN T15 mode=agent round=5
- 2026-05-13T07:50:00Z WORKER_SPAWN T16 mode=agent round=5
- 2026-05-13T07:50:00Z WORKER_SPAWN T6+T12+T14 mode=agent round=5 group=renderer
- 2026-05-13T07:55:00Z WORKER_RESULT T16 status=done
- 2026-05-13T07:58:00Z WORKER_RESULT T8 status=done
- 2026-05-13T08:00:00Z WORKER_RESULT T7 status=done contract_mismatch=AtcRunResult-widened
- 2026-05-13T08:00:30Z CONTRACTS_PATCH path=contracts.md:163 kind=modify_interface section="IPC Channels / atc:run" rationale="AtcRunResult widened to discriminated union so preflight failures propagate without throwing across IPC (origin T7)" diff="+ Returns AtcRunResult = { ok:true; queueId } | { ok:false; errors:PreRunError[] }"

## Contracts Patch (round 5, 2026-05-13T08:00:30Z)
- Signal: worker T7 reported "AtcRunResult was `{ queueId }` only; widened to discriminated union to surface PreRunError[] without throwing across IPC."
- Patch kind: modify_interface
- Section: IPC Channels table / `atc:run` row
- Diff:
  ```diff
  - | `atc:run` | invoke | `{ atcPath, domain, specPath, inputs }` | Enqueue and (if idle) spawn. Returns `{ queueId }`. *R-T2.1, R-T6* |
  + | `atc:run` | invoke | `{ atcPath, domain, specPath, inputs }` | Runs pre-run validation, then enqueues + (if idle) spawns. Returns `AtcRunResult` = `{ ok: true; queueId: string } | { ok: false; errors: PreRunError[] }` — discriminated so preflight failures propagate without throwing across IPC (added by T7). *R-T2.1, R-T6, R-U3.1* |
  ```
- User confirm: NONE (INV-7)

- 2026-05-13T08:05:00Z WORKER_RESULT T6 status=done
- 2026-05-13T08:05:00Z WORKER_RESULT T12 status=done
- 2026-05-13T08:05:00Z WORKER_RESULT T14 status=done
- 2026-05-13T08:05:00Z WORKER_RESULT T15 status=done
- 2026-05-13T08:05:30Z COMMIT_SKIP round=5 work=no-commit
- 2026-05-13T08:06:00Z WORKER_SPAWN T5 mode=agent round=6
- 2026-05-13T08:06:00Z WORKER_SPAWN T17 mode=agent round=6
- 2026-05-13T08:06:00Z WORKER_SPAWN T10+T13+T18 mode=agent round=6 group=renderer-close
- 2026-05-13T08:20:00Z WORKER_RESULT T17 status=done
- 2026-05-13T08:25:00Z WORKER_RESULT T5 status=done
- 2026-05-13T08:30:00Z WORKER_RESULT T10 status=done
- 2026-05-13T08:30:00Z WORKER_RESULT T13 status=done partial=R-U9.4,R-U9.5
- 2026-05-13T08:30:00Z WORKER_RESULT T18 status=done
- 2026-05-13T08:30:30Z COMMIT_SKIP round=6 work=no-commit
- 2026-05-13T08:31:00Z WORKER_SPAWN T9+T11 mode=agent round=7 group=renderer
- 2026-05-13T08:31:00Z WORKER_SPAWN T21 mode=agent round=7
- 2026-05-13T08:31:00Z WORKER_SPAWN T22 mode=agent round=7
- 2026-05-13T08:31:00Z WORKER_SPAWN T23 mode=agent round=7
- 2026-05-13T08:31:00Z WORKER_SPAWN T24 mode=agent round=7
- 2026-05-13T08:50:00Z WORKER_RESULT T22 status=done
- 2026-05-13T08:55:00Z WORKER_RESULT T23 status=done
- 2026-05-13T08:58:00Z WORKER_RESULT T21 status=done
- 2026-05-13T09:00:00Z WORKER_RESULT T9 status=done
- 2026-05-13T09:00:00Z WORKER_RESULT T11 status=done
- 2026-05-13T09:02:00Z WORKER_RESULT T24 status=done
- 2026-05-13T09:02:30Z COMMIT_SKIP round=7 work=no-commit
- 2026-05-13T09:03:00Z WORKER_SPAWN T19 mode=agent round=8
- 2026-05-13T09:03:00Z WORKER_SPAWN T20 mode=agent round=8
- 2026-05-13T09:03:00Z WORKER_SPAWN T25 mode=agent round=8
- 2026-05-13T09:10:00Z WORKER_RESULT T20 status=done
- 2026-05-13T09:12:00Z WORKER_RESULT T19 status=done
- 2026-05-13T09:15:00Z WORKER_RESULT T25 status=done
- 2026-05-13T09:15:30Z COMMIT_SKIP round=8 work=no-commit
- 2026-05-13T09:16:00Z VERIFY_DISPATCH gate=1 targets=[all sub_reqs] result=PASS (tsc + check-deps clean)
- 2026-05-13T09:16:30Z VERIFY_RESULT all_sub_reqs gate=1 verdict=PASS
- 2026-05-13T09:17:00Z RUN_COMPLETE all 25 tasks done; gate-1 clean
- 2026-05-14T00:00:00Z CONTRACTS_PATCH path=contracts.md:108 kind=modify_interface section="SpawnArgs" rationale="post-ship — direct playwright spawn with --key=val never reached spec.ts (Playwright treated post-`--` args as path patterns). Wrapper scripts/atc.mjs converts CLI flags to ATC_INPUT_* env so D8 priority works end-to-end" diff="cmd=npx→process.execPath; args=[playwright,test,...,--,--key=val]→[scripts/atc.mjs,atcPath,--key=val]"

## Contracts Patch (post-ship, 2026-05-14T00:00:00Z)
- Signal: user reported Run always failing with exit 1 + empty DevTools; root cause = CLI inputs never reached spec.ts because Playwright treats post-`--` args as test path patterns
- Patch kind: modify_interface
- Section: ### SpawnArgs
- Diff:
  ```diff
  - cmd = "npx"
  - args = ["playwright","test","--project=windly-<domain>","<specPath>","--","--<key>=<val>",...]
  + cmd = process.execPath  (node binary)
  + args = ["scripts/atc.mjs","<atcPath>","--<key>=<val>",...]
  ```
  scripts/atc.mjs new file — converts --key=val into ATC_INPUT_<KEY>=val env, derives --project + specPath from atcPath, exec's npx playwright. CLI flag overrides win over .env because dotenv default does not clobber existing env vars.
- INV-7 status: preserved — gui/ still spawns with env: undefined; wrapper alone sets ATC_INPUT_*.
- User confirm: NONE (INV-7 / C4 contract-patch hook)
