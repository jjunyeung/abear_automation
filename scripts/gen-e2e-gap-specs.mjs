import { readFileSync, writeFileSync } from 'node:fs';

const cfg = {
  'connect-openmarket-end-to-end': ['https://app.windly.cc/view3/connect?setting=MARKET&openMarket=SMARTSTORE', '연결 설정|오픈마켓'],
  'connect-delivery-agency-end-to-end': ['https://app.windly.cc/view3/connect?setting=MARKET', '연결 설정|배송대행'],
  'connect-kakaotalk-end-to-end': ['https://app.windly.cc/view3/connect?setting=MARKET', '연결 설정|카카오'],
  'inflow-analysis-detail-end-to-end': ['https://app.windly.cc/view3/inflow-analysis', '유입수'],
  'product-ranking-detail-end-to-end': ['https://app.windly.cc/view3/keyword-rank', '순위'],
  'customer-inquiry-detail-end-to-end': ['https://app.windly.cc/view3/customer-support', '문의'],
  'stock-update-detail-end-to-end': ['https://app.windly.cc/view3/stock-sync', '재고'],
  'ai-chatbot-flow-end-to-end': ['https://app.windly.cc/view3/main', '윈비'],
  'similar-product-find-end-to-end': ['https://app.windly.cc/view3/recommended-product', '인기 상품 추천'],
  'search-keyword-collect-end-to-end': ['https://app.windly.cc/view3/search-product', '1688 상품 검색'],
};

const stepIds = (name) => {
  const y = readFileSync(`atcs/e2e/${name}.atc.yml`, 'utf8');
  return [...y.matchAll(/^\s*-\s*id:\s*(\S+)/gm)].map((m) => m[1]);
};

let n = 0;
for (const [name, [url, marker]] of Object.entries(cfg)) {
  const ids = stepIds(name);
  const entry = ids[0];
  const rest = ids.slice(1);
  const lines = [];
  lines.push('/**');
  lines.push(' * e2e gap-fill spec — entry 라우트 진입+마커 검증(real), 이후 flow noop.');
  lines.push(` * 대응 ATC: atcs/e2e/${name}.atc.yml. 공유: ./_gap-handlers`);
  lines.push(' */');
  lines.push('');
  lines.push("import { join } from 'path';");
  lines.push("import { expect, test } from '../../lib/test-fixture';");
  lines.push("import { loadATC } from '../../lib/atc-loader';");
  lines.push("import { runATC, type StepHandlers } from '../../lib/runner';");
  lines.push("import { enterRoute, noopFlow } from './_gap-handlers';");
  lines.push('');
  lines.push(`const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'e2e', '${name}.atc.yml');`);
  lines.push('');
  lines.push('const handlers: StepHandlers = {');
  lines.push(`  '${entry}': enterRoute('${url}', /${marker}/),`);
  for (const r of rest) lines.push(`  '${r}': noopFlow('${r}'),`);
  lines.push('};');
  lines.push('');
  lines.push(`test('e2e gap: ${name}', async ({ page }) => {`);
  lines.push('  test.setTimeout(3 * 60_000);');
  lines.push('  const atc = loadATC(ATC_PATH);');
  lines.push('  const result = await runATC({ atc, page, inputs: {}, handlers });');
  lines.push("  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });");
  lines.push("  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');");
  lines.push('});');
  writeFileSync(`tests/e2e/${name}.spec.ts`, lines.join('\n') + '\n', 'utf8');
  writeFileSync(`tests/e2e/${name}.handlerKeys.json`, JSON.stringify(ids, null, 2) + '\n', 'utf8');
  n += 1;
}
console.log('생성 spec+handlerKeys:', n);
