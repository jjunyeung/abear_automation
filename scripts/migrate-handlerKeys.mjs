#!/usr/bin/env node
// T4 — handlerKeys manifest 생성기 (R-U4.1 / INV-9).
//
// 입력: tests 하위 모든 *.spec.ts (현재 51개).
// 출력: 각 spec 옆에 <name>.handlerKeys.json (flat string array of step.id).
//
// 제약: spec.ts 본체는 단 한 글자도 수정하지 않는다 (R-U4.1, INV-9).
//
// 추출 패턴 (3가지 — 코드베이스 grep 으로 확인):
//   A. `const handlers: StepHandlers = { id1: ..., id2: ... };` (인라인, 49개)
//   B. `runATC({ ..., handlers: makeXxx(), ... })` (factory, 2개 — url-collect*.spec.ts)
//      factory 정의는 같은 디렉토리의 `_url-collect-handlers.ts` 안에서
//      `export function makeXxx(): ... { return { id1: ..., id2: ... } }` 형태.
//
// AST: TypeScript compiler API (이미 devDependency 로 설치된 typescript@6).

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TESTS_DIR = join(ROOT, 'tests');

/** 재귀로 *.spec.ts 모두 수집. */
function findSpecFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...findSpecFiles(full));
    } else if (st.isFile() && name.endsWith('.spec.ts')) {
      out.push(full);
    }
  }
  return out;
}

/** AST 노드가 ObjectLiteralExpression 일 때 property 이름 (string) 들을 뽑는다. */
function extractKeysFromObjectLiteral(node) {
  if (!ts.isObjectLiteralExpression(node)) return null;
  const keys = [];
  for (const prop of node.properties) {
    let nameNode = null;
    if (
      ts.isPropertyAssignment(prop) ||
      ts.isShorthandPropertyAssignment(prop) ||
      ts.isMethodDeclaration(prop)
    ) {
      nameNode = prop.name;
    }
    if (nameNode === null || nameNode === undefined) continue;
    if (ts.isIdentifier(nameNode)) {
      keys.push(nameNode.text);
    } else if (ts.isStringLiteral(nameNode) || ts.isNoSubstitutionTemplateLiteral(nameNode)) {
      keys.push(nameNode.text);
    }
    // computed property: 스킵 (코드베이스엔 안 쓰임)
  }
  return keys;
}

/** 파일 안에서 `const <name>: StepHandlers = { ... }` 형태의 객체 리터럴을 찾는다. */
function findHandlersConstObjectLiteral(sourceFile, identifierName) {
  let found = null;
  function visit(node) {
    if (found !== null) return;
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (
          ts.isIdentifier(decl.name) &&
          decl.name.text === identifierName &&
          decl.initializer !== undefined &&
          ts.isObjectLiteralExpression(decl.initializer)
        ) {
          found = decl.initializer;
          return;
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return found;
}

/** 파일 안에서 `export function <name>(...) { return { ... } }` 형태 factory 의 리턴 객체 리터럴을 찾는다. */
function findFactoryReturnObjectLiteral(sourceFile, factoryName) {
  let found = null;
  function visit(node) {
    if (found !== null) return;
    if (
      ts.isFunctionDeclaration(node) &&
      node.name !== undefined &&
      node.name.text === factoryName &&
      node.body !== undefined
    ) {
      for (const stmt of node.body.statements) {
        if (
          ts.isReturnStatement(stmt) &&
          stmt.expression !== undefined &&
          ts.isObjectLiteralExpression(stmt.expression)
        ) {
          found = stmt.expression;
          return;
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return found;
}

/** spec source 안에서 import { x } from './foo' 의 './foo' 경로를 찾아 반환. */
function resolveImportPath(sourceFile, identifierName, specFilePath) {
  for (const stmt of sourceFile.statements) {
    if (!ts.isImportDeclaration(stmt)) continue;
    if (
      stmt.importClause === undefined ||
      stmt.importClause.namedBindings === undefined ||
      !ts.isNamedImports(stmt.importClause.namedBindings)
    ) {
      continue;
    }
    for (const imp of stmt.importClause.namedBindings.elements) {
      if (imp.name.text === identifierName) {
        const modSpec = stmt.moduleSpecifier;
        if (!ts.isStringLiteral(modSpec)) continue;
        let rel = modSpec.text;
        if (!rel.startsWith('.')) return null;
        let resolved = join(dirname(specFilePath), rel);
        if (!resolved.endsWith('.ts')) resolved += '.ts';
        return resolved;
      }
    }
  }
  return null;
}

/** 메인 추출: spec.ts → step.id 배열. */
function extractHandlerKeysForSpec(specPath) {
  const src = readFileSync(specPath, 'utf8');
  const sf = ts.createSourceFile(specPath, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

  // 1) runATC({ ..., handlers: <expr>, ... }) 호출 찾기.
  let handlersArg = null;
  function visit(node) {
    if (handlersArg !== null) return;
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'runATC' &&
      node.arguments.length >= 1 &&
      ts.isObjectLiteralExpression(node.arguments[0])
    ) {
      for (const prop of node.arguments[0].properties) {
        if (
          ts.isPropertyAssignment(prop) &&
          ts.isIdentifier(prop.name) &&
          prop.name.text === 'handlers'
        ) {
          handlersArg = prop.initializer;
          return;
        }
        // ShorthandPropertyAssignment: `{ handlers }` — 변수 이름 = 'handlers'
        if (
          ts.isShorthandPropertyAssignment(prop) &&
          prop.name.text === 'handlers'
        ) {
          // local const handlers 를 찾아야 함.
          handlersArg = prop.name; // Identifier
          return;
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);

  if (handlersArg === null) {
    throw new Error(`runATC({ handlers: ... }) call not found in ${specPath}`);
  }

  // 2) handlersArg 유형별 처리.
  // 2a) Object literal — 바로 키 추출.
  if (ts.isObjectLiteralExpression(handlersArg)) {
    return extractKeysFromObjectLiteral(handlersArg);
  }

  // 2b) Identifier (shorthand 또는 명시) — 같은 파일의 const 정의 찾기.
  if (ts.isIdentifier(handlersArg)) {
    const literal = findHandlersConstObjectLiteral(sf, handlersArg.text);
    if (literal === null) {
      throw new Error(
        `Identifier '${handlersArg.text}' used as handlers but no const ${handlersArg.text} = { ... } in ${specPath}`,
      );
    }
    return extractKeysFromObjectLiteral(literal);
  }

  // 2c) CallExpression — factory. e.g. makeCollectHandlers()
  if (ts.isCallExpression(handlersArg)) {
    const callee = handlersArg.expression;
    if (!ts.isIdentifier(callee)) {
      throw new Error(`Non-identifier factory in ${specPath}`);
    }
    const factoryName = callee.text;
    const importedFrom = resolveImportPath(sf, factoryName, specPath);
    if (importedFrom === null) {
      // 같은 파일 안에 정의된 factory 일 수도.
      const literal = findFactoryReturnObjectLiteral(sf, factoryName);
      if (literal === null) {
        throw new Error(
          `Factory ${factoryName}() not imported and not defined in ${specPath}`,
        );
      }
      return extractKeysFromObjectLiteral(literal);
    }
    const factorySrc = readFileSync(importedFrom, 'utf8');
    const factorySf = ts.createSourceFile(
      importedFrom,
      factorySrc,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const literal = findFactoryReturnObjectLiteral(factorySf, factoryName);
    if (literal === null) {
      throw new Error(
        `Factory ${factoryName}() return-object-literal not found in ${importedFrom}`,
      );
    }
    return extractKeysFromObjectLiteral(literal);
  }

  throw new Error(
    `Unsupported handlers arg kind in ${specPath}: ${ts.SyntaxKind[handlersArg.kind]}`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

const specFiles = findSpecFiles(TESTS_DIR).filter((p) => !p.endsWith('auth.setup.ts'));
console.log(`Found ${specFiles.length} spec.ts files`);

let okCount = 0;
const failures = [];
for (const spec of specFiles) {
  try {
    const keys = extractHandlerKeysForSpec(spec);
    if (keys === null || keys.length === 0) {
      failures.push({ spec, reason: 'empty handler keys' });
      continue;
    }
    const manifestPath = spec.replace(/\.spec\.ts$/, '.handlerKeys.json');
    writeFileSync(manifestPath, JSON.stringify(keys, null, 2) + '\n', 'utf8');
    okCount += 1;
    console.log(`  ✓ ${relative(ROOT, manifestPath)}  (${keys.length} keys)`);
  } catch (e) {
    failures.push({ spec, reason: e instanceof Error ? e.message : String(e) });
  }
}

console.log(`\nGenerated: ${okCount}/${specFiles.length}`);
if (failures.length > 0) {
  console.log(`\nFailures (${failures.length}):`);
  for (const f of failures) {
    console.log(`  ✗ ${relative(ROOT, f.spec)}`);
    console.log(`      ${f.reason}`);
  }
  process.exit(1);
}
