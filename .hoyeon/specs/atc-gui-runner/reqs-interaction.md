---
spec: "atc-gui-runner"
phase: extract
axis: interaction
count: 10
---

# Interaction Requirements

## R-U1: VSCode-style split-panel entry screen
- **type**: functional
- **behavior**: on launch the application presents a left catalog panel (ATC list grouped by domain) and a right detail panel (input form and run log), matching the VSCode/Postman split-pane mental model
- **source**: [JOURNEY.Q: 진입 화면?]
- **confidence**: high
- **open_questions**: composes 조각 ATC (`_<name>.atc.yml`) 를 카탈로그에 별도 그룹/들여쓰기로 노출할지, 완전히 숨길지 미결 (State Q&A assumption 참조)

### Sub-requirements

#### R-U1.1: domain-grouped catalog panel
- **given**: the GUI application has launched successfully
- **when**: the left panel renders the catalog
- **then**: ATC entries are grouped under collapsible domain sections (collect / error-check / fix / upload / e2e), each section header showing the domain name and the count of entries inside

#### R-U1.2: right panel shows form on selection
- **given**: the catalog panel is visible
- **when**: the user clicks any ATC entry in the left panel
- **then**: the right panel updates to show the selected ATC's title, its declared `inputs` schema as a typed form (one field per input with description and example as placeholder), and a Run button — without requiring any additional navigation step

#### R-U1.3: fragment ATCs rendered with visual distinction
- **given**: the catalog has been loaded and includes `_<name>.atc.yml` compose-fragment files
- **when**: the left panel renders those entries
- **then**: they appear with a visual distinction (e.g., indented sub-row or dimmed label) compared to top-level ATC entries, so the user can recognize them as fragments rather than standalone scenarios

---

## R-U2: ≤3-click happy path to run a single ATC
- **type**: quality
- **behavior**: a user with no prior session must be able to trigger an ATC run from catalog browse to execution start in three interactions or fewer: one click to select, one fill of inputs, one click of Run (or Cmd+Enter)
- **source**: [HAPPY.Q: Happy path 클릭 수?]
- **confidence**: high
- **open_questions**: none

### Sub-requirements

#### R-U2.1: single click selects and loads form
- **given**: the catalog is visible and no ATC is selected
- **when**: the user clicks one ATC entry
- **then**: the right panel immediately shows the input form pre-populated with example values as placeholders; no secondary confirmation step is needed before the form is interactive

#### R-U2.2: Run button is reachable without scroll on typical viewport
- **given**: an ATC with ≤5 input fields is selected and the form is visible
- **when**: the right panel renders
- **then**: the Run button (or equivalent primary action) is visible without vertical scroll on a 1440×900 viewport

#### R-U2.3: Cmd+Enter submits from any focused input field
- **given**: the right panel form is visible and the user has filled at least one input field
- **when**: the user presses Cmd+Enter (macOS) while focus is anywhere inside the form panel
- **then**: the run is submitted identically to clicking the Run button, provided pre-run validations pass

---

## R-U3: pre-run environment validation
- **type**: functional
- **behavior**: before spawning a Playwright process, the GUI validates that required environment prerequisites are satisfied and surfaces specific, actionable error messages to the user rather than letting the run fail mid-execution
- **source**: [EDGE.Q: ATC 실행 주요 실패 시나리오 — GUI 특별 처리?]
- **confidence**: high
- **open_questions**: none

### Sub-requirements

#### R-U3.1: WINDLY_EXTENSION_PATH absence blocks Run
- **given**: the user has selected an ATC and filled all inputs
- **when**: the user clicks Run (or presses Cmd+Enter) and the `.env` file is absent or `WINDLY_EXTENSION_PATH` is not set
- **then**: the Run action is blocked; a non-dismissible inline message appears in the right panel stating which variable is missing and instructing the user to populate `.env` before retrying — no Playwright process is spawned

#### R-U3.2: .env file not found surfaces specific message
- **given**: the GUI attempts pre-run validation
- **when**: the `.env` file does not exist in the project root
- **then**: the error message distinguishes "`.env` file not found" from "variable missing inside `.env`", and provides the path where the file is expected

---

## R-U4: catalog-load-time step handler mismatch detection
- **type**: functional
- **behavior**: when the catalog loads (or refreshes), the GUI cross-references each ATC's step IDs against the corresponding spec.ts StepHandlers and marks any ATC where at least one step.id has no handler as Stale
- **source**: [EDGE.Q: ATC 실행 주요 실패 시나리오 — GUI 특별 처리?; Research §9: handler 가 누락된 step.id 가 ATC 에 있으면 runner 가 즉시 FAIL]
- **confidence**: medium
- **open_questions**: static analysis of spec.ts to extract handler keys may require AST parsing or a naming convention; the exact detection mechanism is unresolved at this stage

### Sub-requirements

#### R-U4.1: stale-badge shown on mismatch detected at load
- **given**: the catalog has loaded and at least one ATC has a step.id that is not declared as a handler key in its paired spec.ts
- **when**: the left panel renders the affected entry
- **then**: the entry shows a Stale warning badge (distinct from other state indicators) alongside its title; hovering or clicking reveals a tooltip or panel message listing the unmatched step IDs

#### R-U4.2: stale ATC remains runnable with explicit acknowledgement
- **given**: an ATC entry has a Stale badge
- **when**: the user clicks Run
- **then**: a confirmation dialog appears explaining the mismatch risk; the user can choose to proceed or cancel — the run is not silently blocked

---

## R-U5: catalog item state indicators
- **type**: functional
- **behavior**: each ATC entry in the left catalog panel reflects its current lifecycle state through a distinct visual indicator so the user can assess overall run health at a glance without opening individual entries
- **source**: [STATE.Q: 카탈로그 ATC 항목의 주요 상태?]
- **confidence**: high
- **open_questions**: exact icon/color tokens to be decided during design; the six named states below are required

### Sub-requirements

#### R-U5.1: Normal state — no indicator
- **given**: an ATC has never been run in this session and has no detected issues
- **when**: the catalog renders
- **then**: the entry shows only its title and domain label with no additional indicator

#### R-U5.2: Stale state — warning badge
- **given**: the catalog-load mismatch detection (R-U4) has flagged an ATC
- **when**: the left panel renders the entry
- **then**: a yellow or amber warning badge is visible on the entry row

#### R-U5.3: Running state — animated spinner
- **given**: a Playwright process has been spawned for an ATC and has not yet finished
- **when**: the left panel renders the entry
- **then**: an animated spinner replaces or overlays the state indicator position, conveying active execution

#### R-U5.4: Queued state — position number badge
- **given**: a run queue contains more than one pending ATC (multi-select or sequential scheduling)
- **when**: an ATC is waiting behind the active run
- **then**: its entry displays its numeric queue position (e.g., "2", "3") as a badge

#### R-U5.5: Failed-recent state — red dot
- **given**: the most recent completed run of an ATC resulted in overall status `failed` or `unhandled`
- **when**: the left panel renders the entry in a subsequent session or after the run completes
- **then**: a filled red dot appears on the entry row and persists until the ATC is run again

#### R-U5.6: Passed-recent state — green dot
- **given**: the most recent completed run of an ATC resulted in overall status `success` or all steps `recovered`
- **when**: the left panel renders the entry
- **then**: a filled green dot appears on the entry row and persists until the ATC is run again

---

## R-U6: real-time step-level run observation (GitHub Actions style)
- **type**: functional
- **behavior**: while an ATC is running, the right panel shows each step as an expand/collapse card that updates in real time as log lines arrive, matching the GitHub Actions job-step visual pattern
- **source**: [FEEDBACK.Q: 실시간 런 중 진행 상황 표시 형태?]
- **confidence**: high
- **open_questions**: none

### Sub-requirements

#### R-U6.1: step cards appear in order as execution progresses
- **given**: an ATC run has started and the right panel is showing the run view
- **when**: the runner begins executing each step
- **then**: a new card for that step appears at the bottom of the step list with the step's `id` and `do` description as its header, in the order declared in the ATC YAML

#### R-U6.2: running step auto-expands; completed steps collapse
- **given**: multiple step cards are visible
- **when**: a step transitions from pending to running
- **then**: its card auto-expands to show live log output; when it transitions to a terminal state (success / failed / recovered / unhandled / skipped), the card collapses to a summary row showing status icon, step id, and duration

#### R-U6.3: user can manually expand any completed step card
- **given**: a step card is in collapsed terminal state
- **when**: the user clicks the card header
- **then**: the card expands to show the full log output captured during that step's execution

#### R-U6.4: step status icons match ATC framework statuses
- **given**: a step card has reached terminal state
- **when**: the card is in collapsed view
- **then**: the status icon maps to the framework's step status values: success → green checkmark, failed → red X, recovered → amber refresh icon, unhandled → red exclamation, skipped → grey dash

---

## R-U7: screenshot inline thumbnail with lightbox
- **type**: functional
- **behavior**: screenshots captured during an ATC run are displayed as thumbnails inside the relevant step card, and clicking a thumbnail opens a full-resolution lightbox overlay
- **source**: [FEEDBACK.Q: 스크린샷 + 최종 리포트 표시?]
- **confidence**: high
- **open_questions**: none

### Sub-requirements

#### R-U7.1: screenshot thumbnail appears inside step card
- **given**: a step card is expanded and the runner has written a screenshot file for that step
- **when**: the card content renders
- **then**: a thumbnail image (max 160px wide) is embedded below the log text within the same card, labeled with the screenshot filename

#### R-U7.2: clicking thumbnail opens lightbox
- **given**: a screenshot thumbnail is visible inside a step card
- **when**: the user clicks the thumbnail
- **then**: a full-screen or near-full-screen lightbox overlay appears showing the image at its native resolution with a close button; keyboard Escape closes the lightbox

---

## R-U8: .md report rendered in separate in-app tab
- **type**: functional
- **behavior**: after an ATC run completes, the user can view the rendered Markdown report (generated at `reports/runs/{runId}/{runId}.md`) in a dedicated tab within the GUI without leaving the application
- **source**: [FEEDBACK.Q: 스크린샷 + 최종 리포트 표시?]
- **confidence**: high
- **open_questions**: none

### Sub-requirements

#### R-U8.1: Report tab appears automatically on run completion
- **given**: an ATC run has finished and the `.md` report file has been written by `reporters/atc-reporter.ts`
- **when**: the right panel detects run completion (via fs.watch or polling the reports directory)
- **then**: a "Report" tab appears (or becomes active) in the right panel header, and switching to it shows the rendered Markdown content of `{runId}.md`

#### R-U8.2: unhandled section visually highlighted in report tab
- **given**: the rendered report contains an Unhandled errors section
- **when**: the Report tab is displayed
- **then**: the unhandled section heading and its entries are rendered with a distinct visual treatment (e.g., red border, warning icon prefix) compared to standard Markdown rendering

#### R-U8.3: report tab is persistent for history runs
- **given**: the user navigates to a past run entry in the history/dashboard panel
- **when**: the user selects "View Report"
- **then**: the right panel opens the Report tab rendering the `.md` file from `reports/runs/{runId}/{runId}.md` for that historical run

---

## R-U9: keyboard shortcuts and Cmd+K command palette
- **type**: functional
- **behavior**: the GUI exposes keyboard shortcuts for the three primary power-user actions and a Cmd+K command palette for fuzzy ATC search and direct execution, following the VSCode/Linear interaction model
- **source**: [ACCESS.Q: 키보드 단축키 / 파워 유저 기능?]
- **confidence**: high
- **open_questions**: none

### Sub-requirements

#### R-U9.1: Cmd+Enter triggers Run from any form focus position
- **given**: an ATC is selected and its input form is displayed in the right panel
- **when**: the user presses Cmd+Enter while focus is anywhere within the right panel
- **then**: the Run action is triggered (subject to pre-run validation R-U3); this is the keyboard equivalent of clicking the Run button

#### R-U9.2: Cmd+/ focuses the catalog search field
- **given**: the application window is focused
- **when**: the user presses Cmd+/
- **then**: the catalog search/filter input in the left panel receives focus and any existing query is selected so the user can immediately type a new search term

#### R-U9.3: Esc closes open overlay panels
- **given**: a lightbox (R-U7.2), the command palette (R-U9.4), or a confirmation modal is open
- **when**: the user presses Escape
- **then**: the topmost open overlay is closed; if no overlay is open, Esc has no effect (does not close the main window)

#### R-U9.4: Cmd+K opens command palette with ATC search
- **given**: the application window is focused
- **when**: the user presses Cmd+K
- **then**: a floating command palette input appears centered on the screen; typing fuzzy-filters the list of all ATC entries by title or domain; pressing Enter on a highlighted result both selects that ATC in the catalog and focuses the right panel form, ready for input

#### R-U9.5: Cmd+K palette supports direct run initiation
- **given**: the Cmd+K palette is open and an ATC entry is highlighted
- **when**: the user presses Cmd+Shift+Enter (or a clearly labelled secondary action)
- **then**: the ATC is selected and Run is immediately triggered (equivalent to select + Cmd+Enter), skipping manual form focus

---

## R-U10: single-instance enforcement with focus redirect
- **type**: constraint
- **behavior**: only one GUI window may be open at a time; attempting to open a second instance brings the existing window to the foreground and shows an informational message rather than opening a duplicate window
- **source**: [ACCESS.Q: 멀티 인스턴스 (여러 창/탭) 허용?; Research: userDataDir SingletonLock 제약]
- **confidence**: high
- **open_questions**: none

### Sub-requirements

#### R-U10.1: second launch attempt focuses existing window
- **given**: a GUI window is already open and running
- **when**: the user attempts to launch a second instance of the application (e.g., double-clicking the .app, running `npm run gui` again)
- **then**: the second process immediately exits without opening a new window; the existing window is brought to the foreground (Electron `app.requestSingleInstanceLock` + `second-instance` event handling)

#### R-U10.2: informational message shown in focused existing window
- **given**: the existing GUI window has been focused due to a second-instance attempt (R-U10.1)
- **when**: the window receives the `second-instance` signal
- **then**: a transient toast or status bar message appears in the existing window stating "Already open — only one window is allowed" and disappears after 4–6 seconds

#### R-U10.3: second browser tab opening is also blocked
- **given**: the GUI is an Electron app with a renderer window
- **when**: any mechanism (e.g., a link click, programmatic window.open) would open a second BrowserWindow
- **then**: the new window creation is intercepted and cancelled; the user is not able to create a second renderer context that could trigger a parallel Playwright run

---

<!--
Parsing hints:
  - Requirement ID:     ^## R-U\d+: (.+)
  - Field:              ^- \*\*(\w+)\*\*: (.+)
  - Sub-requirement ID: ^#### R-U\d+\.\d+: (.+)
  - GWT fields:         given/when/then under sub-requirement
  - Axis codes:         U=Interaction (user-facing)
-->
