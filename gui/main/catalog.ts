/**
 * ATC catalog discovery (main process).
 *
 * Fulfills:
 *   R-B2.1  — startup glob scan of atcs/<domain>/*.atc.yml → CatalogItem[] grouped by domain
 *   R-B6.7  — stale auto-detect (legacy login/enter_workspace step OR handlerKeys mismatch)
 *             → 'stale' badge; runs not blocked
 *   R-U1.1  — domain grouping (collect/error-check/fix/upload/e2e) sourced from directory layout
 *   R-U1.3  — fragment ATCs (`_<name>.atc.yml`) classified via `isFragment: true`; loaded as
 *             standalone catalog entries (single-run still possible per CLAUDE.md §(l))
 *   R-U4.2  — per-ATC stale mismatch surfaced via `staleMismatches: string[]` (step.ids missing
 *             from `<name>.handlerKeys.json`)
 *   R-T16.2 — handlerKeys manifest comparison; missing manifest = stale; missing step.id = stale
 *
 * Invariants:
 *   INV-3  — imports: electron, node stdlib, ../shared/ipc, ../../lib/atc-loader, ../../lib/atc-schema
 *            only. NEVER imports tests/, recoveries/, atcs/ as code; YAML files are read via loadATC
 *            and spec/manifest files are walked on filesystem.
 *   INV-4  — filesystem only; no network port.
 *
 * Catalog lifecycle:
 *   1. initCatalog(mainWindow) called from app.whenReady() seeds in-memory snapshot.
 *   2. catalog:list invoke handler returns the cached snapshot (rebuild lazily if empty).
 *   3. catalog:reload invoke handler triggers full rescan and pushes catalog:updated.
 *
 * Status classification scope:
 *   This module only emits 'stale' | 'normal'. Session-overlay statuses ('running' / 'queued' /
 *   'failed-recent' / 'passed-recent') are layered downstream by T9 (renderer) which merges
 *   run-queue and run-history state on top of this base snapshot. Precedence rule (contracts.md
 *   §CatalogStatus) is enforced there, not here.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import * as path from 'node:path';
import type { BrowserWindow } from 'electron';
import { loadATC } from '../../lib/atc-loader';
import type { ATC } from '../../lib/atc-schema';
import {
  PUSH_CHANNELS,
  type CatalogItem,
  type CatalogStatus,
  type Domain,
} from '../shared/ipc';

const ATCS_DIR_REL = 'atcs';
const TESTS_DIR_REL = 'tests';
const ATC_EXT = '.atc.yml';
const HANDLER_KEYS_EXT = '.handlerKeys.json';
const SPEC_EXT = '.spec.ts';

// Domains declared by contracts.md §CatalogItem and D9. New domains require a
// requirements decision first, so we whitelist here rather than mirror disk.
const KNOWN_DOMAINS: readonly Domain[] = [
  'collect',
  'error-check',
  'fix',
  'upload',
  'e2e',
] as const;

// Setup-integrated legacy step ids that must NOT appear in new ATCs (CLAUDE.md §(j) — login
// and enter_workspace are handled by tests/auth.setup.ts; presence indicates a stale ATC).
const LEGACY_SETUP_STEP_IDS: readonly string[] = ['login', 'enter_workspace'] as const;

/** Project root — `npm run gui` and Playwright reporter both anchor on cwd. */
function projectRoot(): string {
  return path.resolve(process.cwd());
}

function atcsRoot(): string {
  return path.join(projectRoot(), ATCS_DIR_REL);
}

function testsRoot(): string {
  return path.join(projectRoot(), TESTS_DIR_REL);
}

function isKnownDomain(value: string): value is Domain {
  return (KNOWN_DOMAINS as readonly string[]).includes(value);
}

/**
 * Read `tests/<domain>/<name>.handlerKeys.json` and return the parsed string array.
 * Returns `null` when the file is absent (caller treats this as a stale signal).
 * Returns `[]` when the file exists but is malformed — preserves stale signaling without
 * masking the manifest's presence (caller still flags all step.ids as missing).
 */
function readHandlerKeys(filePath: string): string[] | null {
  if (!existsSync(filePath)) return null;
  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const keys: string[] = [];
  for (const item of parsed) {
    if (typeof item === 'string') keys.push(item);
  }
  return keys;
}

/**
 * Diff the expanded ATC's step.ids against the spec's handlerKeys manifest.
 * Returns the step.ids that are missing from the manifest; an empty array means full coverage.
 * When the manifest is null (absent), every step.id is reported as missing — caller surfaces
 * this case as a manifest-level stale (R-T16.2: manifest file itself missing).
 */
function diffHandlerKeys(atc: ATC, handlerKeys: string[] | null): string[] {
  const stepIds = atc.steps.map((s) => s.id);
  if (handlerKeys === null) return stepIds;
  const known = new Set(handlerKeys);
  return stepIds.filter((id) => !known.has(id));
}

/** Legacy setup-integrated step.ids present in the expanded ATC (R-B6.7). */
function detectLegacySetupSteps(atc: ATC): string[] {
  const legacy = new Set<string>(LEGACY_SETUP_STEP_IDS);
  return atc.steps.map((s) => s.id).filter((id) => legacy.has(id));
}

/**
 * Build a single CatalogItem from an absolute `.atc.yml` path.
 * Returns null when the ATC cannot be loaded (composes-broken, schema-invalid, etc.) — we drop
 * the entry rather than synthesize a fake CatalogItem so the renderer never sees half-data.
 */
function buildItem(atcPath: string, domain: Domain): CatalogItem | null {
  let atc: ATC;
  try {
    atc = loadATC(atcPath);
  } catch {
    // Schema violation / composes cycle / IO error — surfaced via the reload's catch path
    // already (caller decides whether to log). Returning null keeps the snapshot consistent.
    return null;
  }

  const baseName = path.basename(atcPath, ATC_EXT);
  const specPath = path.join(testsRoot(), domain, `${baseName}${SPEC_EXT}`);
  const handlerKeysPath = path.join(testsRoot(), domain, `${baseName}${HANDLER_KEYS_EXT}`);
  const specExists = existsSync(specPath);
  const handlerKeys = readHandlerKeys(handlerKeysPath);

  const mismatches = diffHandlerKeys(atc, handlerKeys);
  const legacyHits = detectLegacySetupSteps(atc);

  // staleMismatches surfaces both (a) step.id ↔ handlerKeys gaps and (b) legacy setup
  // step.ids; the renderer's tooltip lists every reason in one place (R-U4.2).
  const staleMismatches: string[] = [];
  for (const id of mismatches) staleMismatches.push(id);
  for (const id of legacyHits) {
    if (!staleMismatches.includes(id)) staleMismatches.push(id);
  }

  const isStale =
    !specExists || handlerKeys === null || mismatches.length > 0 || legacyHits.length > 0;
  const status: CatalogStatus = isStale ? 'stale' : 'normal';

  return {
    atcPath,
    specPath,
    domain,
    isFragment: baseName.startsWith('_'),
    atc,
    handlerKeys: handlerKeys ?? [],
    status,
    queuePosition: null,
    staleMismatches,
  };
}

/**
 * Walk `atcs/<domain>/*.atc.yml` (depth 2 only — per .claude/rules/atc-file-layout.md), parse
 * each via `loadATC` (composes expanded), pair with `tests/<domain>/<name>.{spec.ts,handlerKeys.json}`,
 * classify, and return CatalogItem[] sorted by domain then atc title.
 *
 * Fragments (`_<name>.atc.yml`) are included as separate entries — CLAUDE.md §(l) declares
 * them individually runnable.
 */
export function loadCatalog(): CatalogItem[] {
  const root = atcsRoot();
  let domainDirs: string[];
  try {
    domainDirs = readdirSync(root);
  } catch {
    // atcs/ may not exist on a fresh checkout; no entries.
    return [];
  }

  const items: CatalogItem[] = [];
  for (const dirent of domainDirs) {
    if (!isKnownDomain(dirent)) continue;
    const domainPath = path.join(root, dirent);
    let domainStat;
    try {
      domainStat = statSync(domainPath);
    } catch {
      continue;
    }
    if (!domainStat.isDirectory()) continue;

    let files: string[];
    try {
      files = readdirSync(domainPath);
    } catch {
      continue;
    }

    for (const file of files) {
      if (!file.endsWith(ATC_EXT)) continue;
      const atcPath = path.join(domainPath, file);
      const item = buildItem(atcPath, dirent);
      if (item) items.push(item);
    }
  }

  items.sort((a, b) => {
    if (a.domain !== b.domain) return a.domain < b.domain ? -1 : 1;
    // Within a domain: fragments first (so the user sees them grouped), then by atc title.
    if (a.isFragment !== b.isFragment) return a.isFragment ? -1 : 1;
    const ta = typeof a.atc === 'object' && a.atc !== null && 'title' in a.atc
      ? String((a.atc as { title: unknown }).title)
      : a.atcPath;
    const tb = typeof b.atc === 'object' && b.atc !== null && 'title' in b.atc
      ? String((b.atc as { title: unknown }).title)
      : b.atcPath;
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  });

  return items;
}

let snapshot: CatalogItem[] | null = null;
let boundWindow: BrowserWindow | null = null;

/**
 * Read-only snapshot served by the `catalog:list` invoke handler.
 * Builds lazily on first call so the renderer never blocks on app.whenReady() ordering.
 */
export function getCatalogSnapshot(): CatalogItem[] {
  if (snapshot === null) {
    snapshot = loadCatalog();
  }
  return snapshot.slice();
}

/**
 * Force a fresh rescan and push `catalog:updated` to the bound window (R-B6.7).
 * Returns the new snapshot so the invoking IPC handler can resolve with it directly.
 */
export function reloadCatalog(): CatalogItem[] {
  snapshot = loadCatalog();
  if (boundWindow && !boundWindow.isDestroyed()) {
    boundWindow.webContents.send(PUSH_CHANNELS.catalogUpdated, snapshot.slice());
  }
  return snapshot.slice();
}

/**
 * Seed the catalog snapshot at app startup and bind the window for future
 * `catalog:updated` pushes. Idempotent: re-binding swaps the window reference.
 *
 * Must be invoked from `app.whenReady().then(...)` after mainWindow exists.
 */
export function initCatalog(mainWindow: BrowserWindow): void {
  boundWindow = mainWindow;
  snapshot = loadCatalog();
}
