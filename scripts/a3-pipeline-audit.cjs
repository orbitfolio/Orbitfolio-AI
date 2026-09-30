#!/usr/bin/env node
/**
 * A3-completion audit (Phase 6): the six demo profiles through the REAL
 * combineRating, with the capped beta adjustment applied in-pipeline —
 * so the report numbers are engine-true, not script-computed.
 *
 * Files are written to .tmp-score-audit/pipe/ with their relative import
 * specifiers flattened (rating.ts imports ./fundamentals and ../ai/schemas),
 * then required from disk so Node resolves them normally.
 */
const ts = require('typescript');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const outDir = path.join(root, '.tmp-score-audit', 'pipe');

function emit(rel) {
  const src = fs.readFileSync(path.join(root, rel), 'utf8');
  const { outputText } = ts.transpileModule(src, {
    fileName: rel,
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

emit('lib/ai/schemas.ts');
emit('lib/market/fundamentals.ts');
emit('lib/market/rating.ts');
emit('lib/market/technicals.ts');

const T = require(path.join(outDir, 'lib/market/technicals.js'));
const R = require(path.join(outDir, 'lib/market/rating.js'));

const N = 260;
function series({ drift, wave, wavePhase = 0, lastPrice, shockAt = null, shockPct = 0 }) {
  const c = [];
  for (let i = 0; i < N; i++) {
    let v = 100 * (1 + drift * (i / N) + wave * Math.sin(i / 9 + wavePhase));
    if (shockAt != null && i >= shockAt) v *= 1 - shockPct * ((i - shockAt) / (N - shockAt));
    c.push(v);
  }
  const s = lastPrice / c[N - 1];
  return c.map((x) => x * s);
}

const PROFILES = {
  AAPL: { drift: 0.28, wave: 0.03, lastPrice: 316 },
  MSFT: { drift: 0.12, wave: 0.025, lastPrice: 428 },
  NVDA: { drift: 0.3, wave: 0.09, lastPrice: 126 },
  'RELIANCE.NS': { drift: 0.0, wave: 0.045, lastPrice: 2450 },
  'INFY.NS': { drift: -0.2, wave: 0.035, lastPrice: 1480 },
  'SHOP.TO': { drift: 0.18, wave: 0.06, wavePhase: 2, shockAt: 150, shockPct: 0.18, lastPrice: 95 },
};
const MARKET = series({ drift: 0.09, wave: 0.02, lastPrice: 5000 });

function bars(c) {
  return c.map((close, i) => ({
    time: i * 86400000,
    open: close,
    high: close * 1.005,
    low: close * 0.995,
    close,
    volume: 1000 + Math.round(Math.sin(i / 5) * 200),
  }));
}

const fmt = (v, d = 1) => (v == null ? '  — ' : Number(v).toFixed(d));

console.log('symbol'.padEnd(13) + 'tech'.padEnd(6) + 'betaAdj'.padEnd(8) + 'orbitAn=5'.padEnd(10) + 'preA3'.padEnd(6) + 'noAnalyst');
for (const [sym, p] of Object.entries(PROFILES)) {
  const snap = T.computeTechnicals(bars(series(p)), { benchmarkCloses: MARKET });
  const beta = sym === 'NVDA' ? 1.7 : sym === 'RELIANCE.NS' ? 0.9 : 1.1;
  const withAn = R.combineRating({ technical: snap.score, fundamental: 6.9, analystConsensus: 5 }, { beta });
  const preA3 = R.combineRating({ technical: snap.score, fundamental: 6.9, analystConsensus: 5 });
  const noAn = R.combineRating({ technical: snap.score, fundamental: 6.9, analystConsensus: null }, { beta });
  console.log(
    sym.padEnd(13) +
      String(snap.score).padEnd(6) +
      fmt(withAn.riskAdjustment, 2).padEnd(8) +
      String(withAn.orbitScore).padEnd(10) +
      String(preA3.orbitScore).padEnd(6) +
      String(noAn.orbitScore)
  );
}
