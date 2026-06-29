#!/usr/bin/env node
// stub ATC(개별 TC 1건) → 번들 spec 동작을 mirror 하는 per-stub spec + handlerKeys 생성기.
//
// 배경: scripts/generate-p0-skeletons.py 가 엑셀 TC 를 영역 단위 "번들 ATC" + 1건씩 쪼갠
//       "stub ATC(...-tcN.atc.yml)" 로 펼쳐 둠. 번들 spec 은 구현돼 있으나(진입+noop) stub 은
//       spec 이 없어 catalog 에서 stale. 이 스크립트는 stub 마다 번들 spec 의 핵심 동작
//       (URL 진입 + page reachable 검증) 을 복제한 최소 spec 을 생성한다.
//
// 깊이: "번들 mirror (얕음)" — 번들 URL goto + body length 검증. 번들의 noop 핸들러와
//       동일하거나 약간 강함(reachable 체크). 실제 액션 자동화는 별도 deepen 작업.
//
// 제약: 기존 spec.ts / ATC YAML 은 건드리지 않는다. stub 옆에 신규 .spec.ts + .handlerKeys.json 만 쓴다.
//       이미 spec 이 있는 stub 은 skip (멱등).
//
// 사용:
//   node scripts/gen-stub-mirror-specs.mjs --bundle="연결설정-오픈마켓"   # 특정 번들만 (파일럿)
//   node scripts/gen-stub-mirror-specs.mjs --domain=base-setting          # 한 도메인 전체
//   node scripts/gen-stub-mirror-specs.mjs --all                          # 전체 noSpec stub
//   node scripts/gen-stub-mirror-specs.mjs --bundle=... --dry             # 미생성, 목록만

import { readFileSync, existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ATCS = join(ROOT, 'atcs');
const TESTS = join(ROOT, 'tests');

const args = process.argv.slice(2);
const opt = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
};
const flag = (name) => args.includes(`--${name}`);
const bundleFilter = opt('bundle');
const domainFilter = opt('domain');
const all = flag('all');
const dry = flag('dry');

if (!bundleFilter && !domainFilter && !all) {
  console.error('하나는 필요: --bundle=<substr> | --domain=<name> | --all  (옵션 --dry)');
  process.exit(2);
}

/**
 * 번들 spec 의 진입 방식 추출. 캐시.
 * 반환: { kind: 'url', value } | { kind: 'helper', value } | null
 *   - url: `const <NAME>URL = "http..."` 또는 첫 `page.goto("http...")` 리터럴
 *   - helper: lib/windly-actions 의 `goTo*` 네비 헬퍼 (URL 리터럴이 없을 때)
 */
const entryCache = new Map();
function bundleEntry(bundleSpecPath) {
  if (entryCache.has(bundleSpecPath)) return entryCache.get(bundleSpecPath);
  if (!existsSync(bundleSpecPath)) {
    entryCache.set(bundleSpecPath, null);
    return null;
  }
  const src = readFileSync(bundleSpecPath, 'utf8');
  let entry = null;
  // 1) const <…>URL = "http..."
  const mConst = src.match(/const\s+\w*URL\w*\s*=\s*["'`](https?:\/\/[^"'`]+)["'`]/);
  if (mConst) {
    entry = { kind: 'url', value: mConst[1] };
  } else {
    // 2) 첫 page.goto("http...") 리터럴
    const mGoto = src.match(/page\.goto\(\s*["'`](https?:\/\/[^"'`]+)["'`]/);
    if (mGoto) {
      entry = { kind: 'url', value: mGoto[1] };
    } else {
      // 3) windly-actions 네비 헬퍼 (goTo*)
      const mHelper = src.match(/\b(goTo[A-Za-z]+)\b/);
      if (mHelper && /from ['"]\.\.\/\.\.\/lib\/windly-actions['"]/.test(src)) {
        entry = { kind: 'helper', value: mHelper[1] };
      }
    }
  }
  entryCache.set(bundleSpecPath, entry);
  return entry;
}

/** stub ATC 본문에서 `원본 번들: <path>` 추출 → 번들 spec 절대경로. */
function bundleSpecFor(stubRaw) {
  const m = stubRaw.match(/원본 번들:\s*(\S+)/);
  if (!m) return null;
  const bundleAtcRel = m[1]; // e.g. atcs/base-setting/p0-연결설정-오픈마켓.atc.yml
  const specRel = bundleAtcRel.replace(/^atcs\//, 'tests/').replace(/\.atc\.yml$/, '.spec.ts');
  return join(ROOT, specRel);
}

function specTemplate({ domain, stubBase, title, stepId, entry, bundleSpecRel }) {
  const j = JSON.stringify;
  const helperImport =
    entry.kind === 'helper'
      ? `import { ${entry.value} } from '../../lib/windly-actions';\n`
      : '';
  const entryConst = entry.kind === 'url' ? `const URL = ${j(entry.value)};\n` : '';
  const navLine =
    entry.kind === 'url'
      ? `  await page.goto(URL, { waitUntil: 'domcontentloaded' });\n  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);`
      : `  await ${entry.value}(page);`;
  return `/**
 * ${title} — 개별 TC ${stepId} mirror spec.
 * 번들 spec(${bundleSpecRel}) 의 진입+reachable 동작을 복제한 얕은 spec.
 * 실제 액션 자동화는 별도 deepen 작업 (번들도 noop skip).
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
${helperImport}
const ATC_PATH = join(__dirname, '..', '..', 'atcs', ${j(domain)}, ${j(stubBase + '.atc.yml')});
${entryConst}
const verifyPageReachable: StepHandler = async (page) => {
${navLine}
  await page.waitForTimeout(1_000);
  const length = await page.evaluate(() => document.body.innerText.length);
  if (length < 10) {
    return { ok: false as const, error_key: 'page_blank' as ErrorKey, message: \`page body length \${length}\` };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  ${j(stepId)}: verifyPageReachable,
};

test(${j(title + ` — ${stepId} 진입+reachable mirror`)}, async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
`;
}

const generated = [];
const skipped = [];
const failed = [];

for (const domain of readdirSync(ATCS)) {
  const ddir = join(ATCS, domain);
  if (!statSync(ddir).isDirectory()) continue;
  if (domainFilter && domain !== domainFilter) continue;
  for (const f of readdirSync(ddir)) {
    if (!f.endsWith('.atc.yml')) continue;
    const stubBase = f.slice(0, -'.atc.yml'.length);
    if (bundleFilter && !stubBase.includes(bundleFilter)) continue;
    const specPath = join(TESTS, domain, stubBase + '.spec.ts');
    if (existsSync(specPath)) continue; // 이미 구현됨 (번들 자신 포함)

    const stubPath = join(ddir, f);
    const raw = readFileSync(stubPath, 'utf8');
    let atc;
    try {
      atc = parse(raw);
    } catch (e) {
      failed.push({ f, reason: `yaml parse: ${e.message}` });
      continue;
    }
    const steps = Array.isArray(atc?.steps) ? atc.steps : [];
    if (steps.length !== 1) {
      // 이 스크립트는 1-step stub 전용 (다단계는 수동 구현 대상)
      skipped.push({ f, reason: `step 수 ${steps.length} (1-step stub 아님)` });
      continue;
    }
    const stepId = steps[0]?.id;
    if (typeof stepId !== 'string') {
      failed.push({ f, reason: 'step id 없음' });
      continue;
    }
    const bundleSpecPath = bundleSpecFor(raw);
    if (!bundleSpecPath) {
      failed.push({ f, reason: '원본 번들 주석 없음' });
      continue;
    }
    const entry = bundleEntry(bundleSpecPath);
    if (!entry) {
      failed.push({ f, reason: `번들 진입(URL/헬퍼) 추출 실패 (${relative(ROOT, bundleSpecPath)})` });
      continue;
    }
    const title = typeof atc.title === 'string' ? atc.title : stubBase;
    const spec = specTemplate({
      domain,
      stubBase,
      title,
      stepId,
      entry,
      bundleSpecRel: relative(ROOT, bundleSpecPath),
    });
    const manifestPath = join(TESTS, domain, stubBase + '.handlerKeys.json');
    if (!dry) {
      writeFileSync(specPath, spec, 'utf8');
      writeFileSync(manifestPath, JSON.stringify([stepId], null, 2) + '\n', 'utf8');
    }
    generated.push({ spec: relative(ROOT, specPath), stepId, entry: `${entry.kind}:${entry.value}` });
  }
}

console.log(`${dry ? '[DRY] ' : ''}generated: ${generated.length}`);
for (const g of generated) console.log(`  + ${g.spec}  (${g.stepId})`);
if (skipped.length) {
  console.log(`\nskipped: ${skipped.length}`);
  for (const s of skipped) console.log(`  ~ ${s.f}  ${s.reason}`);
}
if (failed.length) {
  console.log(`\nfailed: ${failed.length}`);
  for (const x of failed) console.log(`  ✗ ${x.f}  ${x.reason}`);
}
