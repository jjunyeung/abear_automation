#!/usr/bin/env node
/**
 * ATC runner wrapper — single source of truth for D8 input priority
 * (CLI > env > fixture > schema-example).
 *
 * Translates `--<key>=<value>` CLI flags into `ATC_INPUT_<KEY>=<value>` env
 * vars before spawning Playwright. The spec.ts files already read
 * `process.env.ATC_INPUT_*`, so by setting those before dotenv/config loads
 * (dotenv does NOT overwrite existing env), the CLI value wins.
 *
 * Usage:
 *   node scripts/atc.mjs <atcPath> [--key=val ...] [-- ...passthrough]
 *   npm run atc -- <atcPath> [--key=val ...]
 *
 * Derives `--project` and `specPath` from atcPath:
 *   atcs/<domain>/<name>.atc.yml → --project=windly-<domain>, tests/<domain>/<name>.spec.ts
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import * as path from 'node:path';

const argv = process.argv.slice(2);

if (argv.length === 0) {
  process.stderr.write(
    'Usage: atc <atcPath> [--key=val ...]\n' +
      '       npm run atc -- <atcPath> [--key=val ...]\n',
  );
  process.exit(2);
}

let atcPath = null;
const inputs = {};
const passthrough = [];
let headless = false;

function buildRunId(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const mi = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `result_${yyyy}-${mm}-${dd}_${hh}-${mi}-${ss}`;
}

for (let i = 0; i < argv.length; i += 1) {
  const arg = argv[i];
  if (arg === '--') {
    // Anything after a literal `--` token is forwarded verbatim to playwright
    // (rarely needed; CLI inputs use `--key=val` and skip this branch).
    passthrough.push(...argv.slice(i + 1));
    break;
  }
  if (arg === '--headless') {
    // wrapper-level switch — NOT forwarded to playwright. Exported as
    // WINDLY_HEADLESS=1 below so lib/test-fixture.ts can pick it up.
    headless = true;
    continue;
  }
  if (arg.startsWith('--')) {
    const eq = arg.indexOf('=');
    if (eq === -1) {
      // Flag without `=` — forward to playwright passthrough.
      passthrough.push(arg);
      continue;
    }
    const key = arg.slice(2, eq);
    const val = arg.slice(eq + 1);
    inputs[key] = val;
    continue;
  }
  if (atcPath === null) {
    atcPath = arg;
    continue;
  }
  // Extra positional — treat as additional test path / pattern for playwright.
  passthrough.push(arg);
}

if (atcPath === null) {
  process.stderr.write('Missing <atcPath>\n');
  process.exit(2);
}

// Accept both relative (`atcs/<domain>/<name>.atc.yml`) and absolute
// (`/abs/.../atcs/<domain>/<name>.atc.yml`) paths. GUI's CatalogItem.atcPath
// is absolute; CLI usage is typically relative.
const match = atcPath.match(/(?:^|\/)atcs\/([^/]+)\/(.+)\.atc\.yml$/);
if (match === null) {
  process.stderr.write(
    `atcPath must end with atcs/<domain>/<name>.atc.yml — got: ${atcPath}\n`,
  );
  process.exit(2);
}
const domain = match[1];
const name = match[2];
// specPath relative to cwd (= repo root when invoked via npm run atc or GUI).
const specPath = path.posix.join('tests', domain, `${name}.spec.ts`);

if (!existsSync(specPath)) {
  process.stderr.write(`paired spec missing: ${specPath} (cwd=${process.cwd()})\n`);
  process.exit(2);
}

// Promote CLI inputs into ATC_INPUT_<KEY> env. Dotenv (loaded by
// playwright.config.ts on Playwright start) does NOT overwrite existing
// vars, so these CLI-derived values shadow .env. Schema-example fallback
// inside spec.ts handles the no-CLI no-env case.
const env = { ...process.env };
const runId = env.WINDLY_RUN_ID?.trim() || buildRunId();
env.WINDLY_RUN_ID = runId;
for (const [key, val] of Object.entries(inputs)) {
  const envKey = `ATC_INPUT_${key.toUpperCase()}`;
  env[envKey] = val;
}
if (headless) {
  // lib/test-fixture.ts reads this and sets launchPersistentContext({ headless: true }).
  env.WINDLY_HEADLESS = '1';
}

const pwArgs = [
  'playwright',
  'test',
  `--project=windly-${domain}`,
  specPath,
  ...passthrough,
];

process.stderr.write(`[atc-wrapper] runId=${runId}\n`);

const child = spawn('npx', pwArgs, { stdio: 'inherit', env, shell: false });

child.on('error', (err) => {
  process.stderr.write(`[atc-wrapper] spawn error: ${err.message}\n`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal !== null) {
    process.exit(1);
  }
  process.exit(code ?? 1);
});
