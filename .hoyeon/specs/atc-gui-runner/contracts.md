# Contracts — atc-gui-runner

Delta surface for the GUI runner feature. Generated from `requirements.md` — regenerate on change.
This is a **feature delta**: only what `gui/` adds or newly constrains is documented here.
Existing `lib/*` types are listed under Consumed Existing Types for cross-reference; their definitions live in `lib/`.

---

## Consumed Existing Types (read-only)

`gui/` imports these from `lib/*` without modification.
*fulfills R-T12.1*

| Type / Symbol | Source | Used for |
|---|---|---|
| `ATC` | `lib/atc-schema.ts` | Catalog item data shape |
| `InputSpec` | `lib/atc-schema.ts` | Dynamic form field generation (type/description/example) |
| `atcSchema` | `lib/atc-schema.ts` | Zod parse of loaded YAML |
| `loadATC(path)` | `lib/atc-loader.ts` | Catalog population + composes expansion |
| `StepStatus` | `lib/runner.ts` | Step card status icon mapping |
| `StepOutcome` | `lib/runner.ts` | Per-step result consumed from `.json` report |
| `RunResult` | `lib/runner.ts` | `.json` report root schema (atc_title/steps/overall/inputs_used) |
| `ErrorKey` | `lib/errors.ts` | Step card unhandled/recovered badge |
| `RecoveryContext` | `lib/errors.ts` | Step card tooltip (error_key, last_step_id) |
| `AppEnv` | `lib/config.ts` | Pre-run env validation (WINDLY_EXTENSION_PATH check) |
| `loadEnv()` | `lib/config.ts` | Read .env for pre-run validation — called by main process only |
| `buildRunId()` | `lib/config.ts` | **Not called by GUI** — single entry point reserved for Playwright (see INV-1) |

---

## New Types

### CatalogStatus
*fulfills R-U5.1–R-U5.6, R-B6.7, R-U4.2*

The six possible per-ATC visual states rendered in the left catalog panel.

```
CatalogStatus =
  | 'normal'           -- no indicator (never run this session, no issues)
  | 'stale'            -- amber badge: step.id not in handlerKeys OR legacy login/enter_workspace step detected
  | 'running'          -- animated spinner: Playwright spawn active for this ATC
  | 'queued'           -- queue-position badge (integer >= 2): waiting behind an active run
  | 'failed-recent'    -- filled red dot: last completed run overall = 'failed' | 'unhandled'
  | 'passed-recent'    -- filled green dot: last completed run overall = 'success' or all steps 'recovered'
```

Precedence when multiple conditions apply (highest wins): `running` > `queued` > `stale` > `failed-recent` > `passed-recent` > `normal`.

---

### CatalogItem
*fulfills R-B2.1, R-U1.1, R-U1.3, R-U4.1, R-U4.2*

One entry in the in-memory catalog, built by the main process at startup and on reload.

Fields:
- `atcPath` (string) — absolute path to `atcs/<domain>/<name>.atc.yml`
- `specPath` (string) — paired `tests/<domain>/<name>.spec.ts` (may be absent — triggers `stale`)
- `domain` — one of `collect | error-check | fix | upload | e2e`
- `isFragment` (boolean) — true when filename starts with `_` (dimmed display, R-U1.3)
- `atc` (`ATC`) — fully expanded ATC (composes resolved by `loadATC`)
- `handlerKeys` (string[]) — imported from spec.ts `export const handlerKeys`; empty array when export absent
- `status` (`CatalogStatus`)
- `queuePosition` (number | null) — queue slot (1-indexed) when `status === 'queued'`; null otherwise
- `staleMismatches` (string[]) — step.id values missing from `handlerKeys`; empty when not stale

---

### RunQueueItem
*fulfills R-B6.1, R-T6.1, R-T6.2*

One pending or active Playwright execution in the sequential run queue.

Fields:
- `queueId` (string) — monotonically incrementing string ID assigned at enqueue time; distinct from runId
- `atcPath` (string) — absolute path to `.atc.yml`
- `domain` (string) — Playwright `--project=windly-<domain>` arg
- `specPath` (string) — spec.ts passed to Playwright
- `inputs` (Record<string, string>) — user-supplied form values keyed by input name
- `status` — one of `pending | running | done | skipped`
- `skipReason` (string | null) — populated when `status === 'skipped'` (e.g. `"lock"`)
- `runId` (string | null) — discovered post-run from `reports/runs/` rescan; null until discovered
- `pid` (number | null) — OS PID of the spawned Playwright process; null when pending/done

---

### ScheduleDef
*fulfills R-B5.1, R-T4.1, R-T4.2, R-T4.3, R-T8.1*

One schedule entry persisted in `<userData>/schedules.json`.

Fields:
- `id` (string) — UUID; becomes `cc.windly.atc.<id>` launchd label
- `atcPath` (string) — absolute path to `.atc.yml`
- `domain` (string)
- `specPath` (string)
- `inputs` (Record<string, string>)
- `kind` — `'recurring'` | `'oneshot'`
- `calendarInterval` (object) — launchd `StartCalendarInterval` shape; present when `kind === 'recurring'`
  - Fields: `Hour` (number), `Minute` (number), optional `Weekday` (number 0-6), optional `Day` (number)
- `runAtEpochMs` (number | null) — target unix timestamp when `kind === 'oneshot'`; null otherwise
- `plistPath` (string) — absolute path: `~/Library/LaunchAgents/cc.windly.atc.<id>.plist`
- `active` (boolean) — false after oneshot fires and plist is unloaded

---

### SpawnArgs
*fulfills R-T2.1, R-T2.2, D8 input priority*

The argument bundle assembled by the main process immediately before `child_process.spawn`. Inputs flow through the project-level wrapper `scripts/atc.mjs` which converts `--<key>=<val>` CLI flags into `ATC_INPUT_<KEY>=<val>` env vars; spec.ts files already read those env vars, so D8 priority (CLI > env > schema-example) works end-to-end. Direct `playwright test ... -- --key=val` (the original shape) was broken because Playwright treats post-`--` args as test path patterns.

Fields:
- `cmd` (string) — `process.execPath` (the running node binary)
- `args` (string[]) — `["scripts/atc.mjs", "<atcPath>", "--<inputKey>=<val>", ...]`; the wrapper derives `--project=windly-<domain>` and `<specPath>` from `<atcPath>` (= `atcs/<domain>/<name>.atc.yml` ↔ `tests/<domain>/<name>.spec.ts`)
- `env` (undefined) — `gui/` still never sets env (INV-7); the wrapper alone constructs the `ATC_INPUT_*` overrides from CLI flags before exec'ing `npx playwright test ...`

---

### PreRunValidation
*fulfills R-U3.1, R-U3.2, R-T16.1*

Result of the pre-run environment check performed before any spawn.

Fields:
- `ok` (boolean)
- `errors` (PreRunError[])

```
PreRunError =
  | { code: 'ENV_FILE_MISSING';  path: string }
  | { code: 'VAR_MISSING';       varName: string }
  | { code: 'VAR_INVALID_PATH';  varName: string; resolvedPath: string }
```

---

### RunHistoryEntry
*fulfills R-T7.1, R-T7.2, R-B3.3*

In-memory representation of a discovered past run. Populated by scanning `reports/runs/`.

Fields:
- `runId` (string) — `result_YYYY-MM-DD_HH-MM-SS`
- `atcTitle` (string) — from `RunResult.atc_title`
- `overall` (`'success' | 'failed' | 'unhandled'`) — from `RunResult.overall`
- `completedAt` (Date) — derived from `runId` timestamp
- `reportMdPath` (string) — absolute path to `<runId>.md`
- `reportJsonPath` (string) — absolute path to `<runId>.json`

---

## IPC Channels (preload contextBridge whitelist)

All channels are Electron IPC only. No WebSocket/HTTP/TCP. *fulfills R-T3.3, R-T14.2, R-T15*

Channel names are the exhaustive whitelist. Any channel not listed here must not be exposed via `contextBridge`.

### Renderer → Main (invoke / send)

| Channel | Direction | Payload | Description |
|---|---|---|---|
| `atc:run` | invoke | `{ atcPath, domain, specPath, inputs }` | Runs pre-run validation, then enqueues + (if idle) spawns. Returns `AtcRunResult` = `{ ok: true; queueId: string } \| { ok: false; errors: PreRunError[] }` — discriminated so preflight failures propagate without throwing across IPC (added by T7). *R-T2.1, R-T6, R-U3.1* |
| `atc:kill` | send | `{ queueId }` | SIGTERM to active spawn; remove from queue if pending. *R-T18.1* |
| `catalog:list` | invoke | — | Returns `CatalogItem[]`. *R-B2.1, R-U1.1* |
| `catalog:reload` | invoke | — | Triggers full re-scan of `atcs/` and `tests/`. Returns `CatalogItem[]`. *R-B6.7* |
| `schedule:create` | invoke | `ScheduleDef` (without `id`/`plistPath`) | Persists, creates plist, loads via launchctl. Returns created `ScheduleDef`. *R-T4.1, R-T4.2* |
| `schedule:delete` | invoke | `{ id }` | launchctl unload + plist delete + schedules.json update. *R-T4.3* |
| `schedule:list` | invoke | — | Returns `ScheduleDef[]` from schedules.json. *R-T8.1* |
| `run:history` | invoke | — | Returns `RunHistoryEntry[]` sorted newest-first. *R-T7.1* |
| `run:report` | invoke | `{ runId }` | Returns `{ md: string, json: RunResult }` — file contents read by main. *R-T13.1, R-T13.2* |
| `run:open` | send | `{ runId }` | Deep-link: activates GUI window + opens Report tab for runId. *R-T18.3, R-B6.4* |

### Main → Renderer (send to window)

| Channel | Payload | Description |
|---|---|---|
| `atc:log` | `{ queueId, line: string }` | stdout/stderr line streamed in real time. *R-T3.1* |
| `atc:done` | `{ queueId, exitCode: number, runId: string \| null }` | Playwright process exited. runId is null if not yet discovered. *R-T3.2* |
| `catalog:updated` | `CatalogItem[]` | Pushed after any catalog reload (fs change detected). *R-T7.2* |
| `run:history-updated` | `RunHistoryEntry` | Pushed when a new runId appears in `reports/runs/`. *R-T7.2* |
| `schedule:skipped` | `{ scheduleId, atcTitle, skippedAt: string }` | Lock-collision skip; renderer shows banner. *R-T5.3, R-B6.8* |
| `app:second-instance` | — | Second launch detected; renderer shows informational toast. *R-U10.2* |

---

## Invariants

- **INV-1**: `buildRunId()` (`lib/config.ts`) must never be called from `gui/`. The GUI discovers the runId post-run by rescanning `reports/runs/` or parsing stdout. Single source: Playwright/reporter. *(R-T2.3)*

- **INV-2**: `reports/runs/` is read-only for the GUI. No file in that directory is moved, copied, renamed, or deleted by `gui/` code. *(R-T8.2, R-T13)*

- **INV-3**: Dependency direction is strictly `gui/ → lib/` only. `lib/` never imports from `gui/`. `gui/` never imports from `tests/`, `recoveries/`, or `atcs/` (YAML files are loaded at runtime via `loadATC`, not statically imported). *(R-T12)*

- **INV-4**: Zero network ports. No `ws`, `socket.io`, `express`, or `http.createServer` in `gui/`. All renderer↔main communication is Electron IPC via the channel whitelist above. *(R-T15, R-T3)*

- **INV-5**: Every `BrowserWindow` created by `gui/` must have `webPreferences: { contextIsolation: true, nodeIntegration: false }`. No exceptions. *(R-T14.1)*

- **INV-6**: At most 1 Playwright process spawned at any instant. The file `<userData>/.gui-run.lock` (containing the spawned PID) must be created before spawn and deleted unconditionally on process `close`, regardless of exit code. If the lock file exists at spawn time, the run is placed in `skipped` state and no spawn occurs. *(R-T5, R-T6)*

- **INV-7**: `gui/` never parses or writes `.env`. Environment variables reach the child Playwright process via inherited parent env (`env` option omitted from `child_process.spawn` options). GUI reads env state only through `loadEnv()` (`lib/config.ts`) for pre-run validation, in the main process only — never in the renderer. *(R-T14.3, R-T2.2)*

- **INV-8**: macOS only. No Windows/Linux abstraction layer. `launchctl`/`plist` code has no cross-platform fallback. *(R-T9)*

- **INV-9**: Every `tests/<domain>/<name>.spec.ts` file has a paired `tests/<domain>/<name>.handlerKeys.json` manifest (a flat JSON array of step.id strings). **The spec.ts files themselves are NOT modified — manifests are generated alongside.** Absence of the manifest causes the paired ATC to be marked `stale` in the catalog. *(R-U4.1)*

- **INV-10**: The `.json` report schema (`atc_title`, `steps[{ step_id, status, duration_ms, error_key, recovery_id, message }]`, `overall`, `inputs_used`) must not be modified to accommodate GUI needs. `reporters/atc-reporter.ts` output format is frozen from the GUI's perspective. *(R-T13.1)*
