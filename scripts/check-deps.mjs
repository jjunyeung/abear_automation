#!/usr/bin/env node
// Enforces gui/ guardrails (INV-3 / INV-4 / INV-7 / R-T12 / R-T15 / R-T14.3 / R-B5.2):
//   1. Unidirectional dep boundary: gui/ → lib/* only; lib/ never imports gui/; gui/ never imports tests|recoveries|atcs|reporters|automation.
//   2. Renderer/preload sandbox: gui/renderer/** and gui/preload/** must NOT import from lib/* (only IPC).
//   3. Zero network ports: gui/** must NOT import HTTP/WS server modules.
//   4. Env policy: gui/** must NOT import dotenv-family libs.
// Scans static import/export/require specifiers in .ts/.tsx/.mts and resolves relative paths against the source file location.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SRC_EXT = /\.(ts|tsx|mts)$/;
const SKIP_DIRS = new Set(['node_modules', 'dist', 'test-results', 'reports', '.playwright-userdata', 'automation']);

// Relative-path rules (top-level dir from → forbid top-level dirs to).
const RELATIVE_RULES = [
  {
    from: 'gui',
    forbid: ['tests', 'recoveries', 'atcs', 'reporters'],
    reason: 'gui/ must not import tests/recoveries/atcs/reporters (R-T12.2, INV-3)',
  },
  {
    from: 'lib',
    forbid: ['gui'],
    reason: 'lib/ must not import gui/ (R-T12.3, INV-3)',
  },
];

// Subtree rules — apply to specific subtrees of gui/.
// gui/renderer/** and gui/preload/** are sandboxed — they cannot import lib/* at all (must use IPC).
const SUBTREE_RELATIVE_RULES = [
  {
    fromPrefix: join('gui', 'renderer') + sep,
    forbidTop: ['lib'],
    reason: 'gui/renderer/** must not import lib/* directly — use IPC only (R-T14.1, INV-3)',
  },
  {
    fromPrefix: join('gui', 'preload') + sep,
    forbidTop: ['lib'],
    reason: 'gui/preload/** must not import lib/* — preload exposes contextBridge only (R-T3.3, INV-3)',
  },
];

// Bare-module bans inside gui/** (network servers, .env parsers).
const GUI_BARE_BANS = [
  // INV-4: zero network ports
  { pattern: /^express(\/.*)?$/, reason: "gui/ forbids 'express' — no network servers (INV-4, R-T15.1)" },
  { pattern: /^koa(\/.*)?$/, reason: "gui/ forbids 'koa' (INV-4, R-T15.1)" },
  { pattern: /^fastify(\/.*)?$/, reason: "gui/ forbids 'fastify' (INV-4, R-T15.1)" },
  { pattern: /^@hapi\/hapi(\/.*)?$/, reason: "gui/ forbids '@hapi/hapi' (INV-4, R-T15.1)" },
  { pattern: /^polka(\/.*)?$/, reason: "gui/ forbids 'polka' (INV-4, R-T15.1)" },
  { pattern: /^connect(\/.*)?$/, reason: "gui/ forbids 'connect' (INV-4, R-T15.1)" },
  { pattern: /^restify(\/.*)?$/, reason: "gui/ forbids 'restify' (INV-4, R-T15.1)" },
  { pattern: /^@nestjs\//, reason: "gui/ forbids '@nestjs/*' (INV-4, R-T15.1)" },
  { pattern: /^ws(\/.*)?$/, reason: "gui/ forbids 'ws' — no WebSocket server (INV-4, R-T15.1)" },
  { pattern: /^socket\.io(\/.*)?$/, reason: "gui/ forbids 'socket.io' (INV-4, R-T15.1)" },
  { pattern: /^socket\.io-client(\/.*)?$/, reason: "gui/ forbids 'socket.io-client' (INV-4, R-T15.1)" },
  { pattern: /^engine\.io(\/.*)?$/, reason: "gui/ forbids 'engine.io' (INV-4, R-T15.1)" },
  { pattern: /^sockjs(\/.*)?$/, reason: "gui/ forbids 'sockjs' (INV-4, R-T15.1)" },
  { pattern: /^uws(\/.*)?$/, reason: "gui/ forbids 'uws' (INV-4, R-T15.1)" },
  // INV-7: no dotenv parsing in gui/
  { pattern: /^dotenv(\/.*)?$/, reason: "gui/ forbids 'dotenv' — env access through lib/config.loadEnv() only (INV-7, R-T14.3)" },
  { pattern: /^dotenv-flow(\/.*)?$/, reason: "gui/ forbids 'dotenv-flow' (INV-7, R-T14.3)" },
  { pattern: /^dotenv-expand(\/.*)?$/, reason: "gui/ forbids 'dotenv-expand' (INV-7, R-T14.3)" },
  { pattern: /^dotenv-safe(\/.*)?$/, reason: "gui/ forbids 'dotenv-safe' (INV-7, R-T14.3)" },
  { pattern: /^dotenv-cli(\/.*)?$/, reason: "gui/ forbids 'dotenv-cli' (INV-7, R-T14.3)" },
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name) || name.startsWith('.')) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (SRC_EXT.test(name)) out.push(p);
  }
  return out;
}

const SPEC_RE = /(?:^|[^.\w])(?:import|export)(?:\s+[^'"]*?from)?\s+['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)/g;

function topDir(absPath) {
  return relative(ROOT, absPath).split(sep)[0];
}

function resolveSpecifier(specifier, fromFile) {
  if (!specifier.startsWith('.') && !specifier.startsWith('/')) return null; // bare module
  const abs = specifier.startsWith('/') ? specifier : resolve(dirname(fromFile), specifier);
  return abs.startsWith(ROOT + sep) || abs === ROOT ? abs : null;
}

const violations = [];
for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file);
  const fromTop = topDir(file);
  const topRule = RELATIVE_RULES.find((r) => r.from === fromTop);
  const subtreeRules = SUBTREE_RELATIVE_RULES.filter((r) => rel.startsWith(r.fromPrefix));
  const isInGui = fromTop === 'gui';
  const src = readFileSync(file, 'utf8');
  let m;
  SPEC_RE.lastIndex = 0;
  while ((m = SPEC_RE.exec(src)) !== null) {
    const spec = m[1] ?? m[2];
    const resolved = resolveSpecifier(spec, file);
    if (resolved) {
      const toTop = topDir(resolved);
      if (topRule && topRule.forbid.includes(toTop)) {
        violations.push({ file: rel, specifier: spec, target: toTop, reason: topRule.reason });
      }
      for (const sr of subtreeRules) {
        if (sr.forbidTop.includes(toTop)) {
          violations.push({ file: rel, specifier: spec, target: toTop, reason: sr.reason });
        }
      }
    } else if (isInGui) {
      // Bare-module ban applies only to gui/**.
      for (const ban of GUI_BARE_BANS) {
        if (ban.pattern.test(spec)) {
          violations.push({ file: rel, specifier: spec, target: '(npm)', reason: ban.reason });
          break;
        }
      }
    }
  }
}

if (violations.length === 0) {
  console.log('check-deps: OK (0 violations, INV-3/INV-4/INV-7 boundaries intact)');
  process.exit(0);
}

console.error(`check-deps: FAIL — ${violations.length} violation(s):`);
for (const v of violations) console.error(`  ${v.file}: imports '${v.specifier}' → ${v.target} (${v.reason})`);
process.exit(1);
