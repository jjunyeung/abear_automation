/**
 * Pre-run environment validation (main process only).
 *
 * Fulfills:
 *   R-U3.1 — Block Run when .env is missing or WINDLY_EXTENSION_PATH is not set;
 *            return structured errors so the renderer can show inline messages.
 *   R-U3.2 — Distinguish "no .env file at all" from "file exists but variable missing"
 *            so the inline message can name the file path vs. the variable name.
 *   R-T16.1 — Verify WINDLY_EXTENSION_PATH points to an existing directory before spawn.
 *
 * Contract: returns a `PreRunValidation` shape from gui/shared/ipc.ts
 *   { ok: boolean, errors: PreRunError[] }
 *
 * Invariants:
 *   INV-3 — only `lib/config` and node stdlib are imported here; no tests/recoveries/atcs.
 *   INV-7 — env access goes through `loadEnv()` from `lib/config`; `.env` is never read here.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { loadEnv } from '../../lib/config';
import type { PreRunError, PreRunValidation } from '../shared/ipc';

const ENV_VAR_NAME = 'WINDLY_EXTENSION_PATH';

/** Project root = walk up from __dirname until we find package.json. */
function projectRoot(): string {
  // Compiled emit is gui/dist/gui/main/preflight.js (rootDir=../.. preserves
  // the gui/ segment under dist/). Source is gui/main/preflight.ts. Walking up
  // looking for package.json is layout-agnostic and survives both forms.
  let dir = __dirname;
  for (let i = 0; i < 8; i += 1) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(__dirname, '..', '..');
}

function isDirectory(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

export async function runPreflight(): Promise<PreRunValidation> {
  const errors: PreRunError[] = [];

  const root = projectRoot();
  const envPath = path.join(root, '.env');
  const envFileExists = fs.existsSync(envPath);

  if (!envFileExists) {
    errors.push({ code: 'ENV_FILE_MISSING', path: envPath });
  }

  const env = loadEnv();
  const rawExtensionPath = env.WINDLY_EXTENSION_PATH?.trim() ?? '';

  if (rawExtensionPath === '') {
    // Only report VAR_MISSING when the .env file itself exists — otherwise
    // ENV_FILE_MISSING already explains the root cause (R-U3.2).
    if (envFileExists) {
      errors.push({ code: 'VAR_MISSING', varName: ENV_VAR_NAME });
    }
  } else {
    const resolvedPath = path.isAbsolute(rawExtensionPath)
      ? rawExtensionPath
      : path.resolve(root, rawExtensionPath);
    if (!isDirectory(resolvedPath)) {
      errors.push({
        code: 'VAR_INVALID_PATH',
        varName: ENV_VAR_NAME,
        resolvedPath,
      });
    }
  }

  return { ok: errors.length === 0, errors };
}
