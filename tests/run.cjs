#!/usr/bin/env node
/**
 * Node 20 test runner: transpile the small TS unit-test graph to CJS, then run node:test.
 */
const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const outDir = path.join(root, '.tmp-tests');

const files = [
  'tests/technicals.test.ts',
  'tests/rating.test.ts',
  'tests/guidance.test.ts',
  'tests/fundamentals.test.ts',
  'tests/csv.test.ts',
  'tests/stooq.test.ts',
  'tests/fallback.test.ts',
  'tests/analyst.test.ts',
  'tests/search.test.ts',
  'lib/market/technicals.ts',
  'lib/market/fundamentals.ts',
  'lib/market/rating.ts',
  'lib/market/stooq.ts',
  'lib/market/fallback.ts',
  'lib/market/offline-seed.ts',
  'lib/market/analyst.ts',
  'lib/market/ticker-suggest.ts',
  'lib/market/cache-keys.ts',
  'lib/ai/schemas.ts',
  'lib/holdings/csv.ts',
];

fs.rmSync(outDir, { recursive: true, force: true });

for (const rel of files) {
  const srcPath = path.join(root, rel);
  const src = fs.readFileSync(srcPath, 'utf8');
  const { outputText } = ts.transpileModule(src, {
    fileName: srcPath,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      isolatedModules: true,
    },
  });
  const dest = path.join(outDir, rel.replace(/\.ts$/, '.js'));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, outputText);
}

const result = spawnSync(
  process.execPath,
  [
    '--test',
    path.join(outDir, 'tests/technicals.test.js'),
    path.join(outDir, 'tests/rating.test.js'),
    path.join(outDir, 'tests/guidance.test.js'),
    path.join(outDir, 'tests/fundamentals.test.js'),
    path.join(outDir, 'tests/csv.test.js'),
    path.join(outDir, 'tests/stooq.test.js'),
    path.join(outDir, 'tests/fallback.test.js'),
    path.join(outDir, 'tests/analyst.test.js'),
    path.join(outDir, 'tests/search.test.js'),
  ],
  { stdio: 'inherit', cwd: root }
);

process.exit(result.status ?? 1);
