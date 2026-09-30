#!/usr/bin/env node
/**
 * Before/after harness for the A2/A3 change (Phase 5).
 *
 * Transpiles the real engine files on the fly (same trick as tests/run.cjs)
 * and runs six deterministic demo-stock profiles through computeTechnicals
 * and computeFundamentals. Run BEFORE the change and AFTER, then diff:
 *
 *   node scripts/technicals-audit.cjs > .tmp-score-audit/t-before.txt
 *   node scripts/technicals-audit.cjs > .tmp-score-audit/t-after.txt
 *
 * Inputs are sine-generated series with fixed constants, so any diff comes
 * from the engine, not the data. NVDA-like profile carries a beta and a
 * payout ratio to exercise the A3 risk adjustment and dividend scoring.
 */
const ts = require('typescript');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// Point these at alternative engine files (e.g. git-show'd HEAD versions)
// to capture a true BEFORE run of the same harness.
const TECH_FILE = process.env.TECH_FILE || 'lib/market/technicals.ts';
const FUND_FILE = process.env.FUND_FILE || 'lib/market/fundamentals.ts';

function loadEngine(rel) {
  const src = fs.readFileSync(path.isAbsolute(rel) ? rel : path.join(root, rel), 'utf8');
  const { outputText } = ts.transpileModule(src, {
    fileName: rel,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      isolatedModules: true,
    },
  });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(require, mod, mod.exports);
  return mod.exports;
}

const T = loadEngine(TECH_FILE);
const F = loadEngine(FUND_FILE);
const hasRiskAdj = typeof F.betaRiskAdjustment === 'function';

const N = 260;

/** Deterministic sine-plus-trend series, scaled so last close ≈ lastPrice. */
function series({ drift, wave, wavePhase = 0, lastPrice, shockAt = null, shockPct = 0 }) {
  const closes = [];
  for (let i = 0; i < N; i++) {
    let v = 100 * (1 + drift * (i / N) + wave * Math.sin(i / 9 + wavePhase));
    if (shockAt != null && i >= shockAt) v *= 1 - shockPct * ((i - shockAt) / (N - shockAt));
    closes.push(v);
  }
  const scale = lastPrice / closes[N - 1];
  return closes.map((c) => c * scale);
}

const PROFILES = {
  AAPL: { label: 'strong_up', drift: 0.28, wave: 0.03, lastPrice: 316 },
  MSFT: { label: 'mild_up', drift: 0.12, wave: 0.025, lastPrice: 428 },
  NVDA: { label: 'volatile_up', drift: 0.3, wave: 0.09, lastPrice: 126 },
  'RELIANCE.NS': { label: 'sideways', drift: 0.0, wave: 0.045, lastPrice: 2450 },
  'INFY.NS': { label: 'mild_down', drift: -0.2, wave: 0.035, lastPrice: 1480 },
  'SHOP.TO': { label: 'recovery_then_up', drift: 0.18, wave: 0.06, wavePhase: 2, shockAt: 150, shockPct: 0.18, lastPrice: 95 },
};

// Market benchmark: modest drift, small wave (same for every run).
const MARKET = series({ drift: 0.09, wave: 0.02, lastPrice: 5000 });

function bars(closes) {
  return closes.map((close, i) => ({
    time: i * 86400000,
    open: close,
    high: close * 1.005,
    low: close * 0.995,
    close,
    volume: 1000 + Math.round(Math.sin(i / 5) * 200),
  }));
}

// Fixed fundamentals fixture shared by all rows (A3 fields on NVDA-like row).
function fundFixture(extra) {
  return {
    trailingPE: 30,
    priceToBook: 8,
    returnOnEquity: 0.3,
    operatingMargins: 0.28,
    freeCashflow: 80e9,
    operatingCashflow: 100e9,
    netIncomeToCommon: 80e9,
    marketCap: 3e12,
    earningsGrowth: 0.12,
    ...extra,
  };
}

const fmt = (v, d = 1) => (v == null ? '  — ' : Number(v).toFixed(d));

console.log('=== TECHNICALS (pillar) ===');
console.log(
  'symbol'.padEnd(13) + 'tech'.padEnd(6) + 'relMom'.padEnd(7) + 'vol'.padEnd(6) + 'maxDD'.padEnd(6) + 'w52r'.padEnd(6) + 'betaAdj'.padEnd(8) + 'riskAdjTech'
);
for (const [symbol, p] of Object.entries(PROFILES)) {
  const closes = series(p);
  const snap = T.computeTechnicals(bars(closes), { benchmarkCloses: MARKET });
  const beta = symbol === 'NVDA' ? 1.7 : symbol === 'RELIANCE.NS' ? 0.9 : 1.1;
  const risk = hasRiskAdj ? F.betaRiskAdjustment(beta, snap.score) : null;
  console.log(
    symbol.padEnd(13) +
      String(snap.score).padEnd(6) +
      fmt(snap.components.relMomentum).padEnd(7) +
      fmt(snap.components.volatility).padEnd(6) +
      fmt(snap.components.drawdown).padEnd(6) +
      fmt(snap.components.week52Range).padEnd(6) +
      fmt(risk, 2).padEnd(8) +
      fmt(risk != null ? Math.round((snap.score + risk) * 10) / 10 : null)
  );
}

console.log('\n=== FUNDAMENTALS (dividends group) ===');
console.log('symbol'.padEnd(13) + 'fund'.padEnd(6) + 'div'.padEnd(5) + 'safety'.padEnd(7) + 'usedFields');
const FUND_ROWS = {
  MSFT: fundFixture({ payoutRatio: 0.25 }),
  'RELIANCE.NS': fundFixture({ payoutRatio: 0.45 }),
  'INFY.NS': fundFixture({ payoutRatio: 0.85 }),
  AAPL: fundFixture({}), // no payout ratio
  NVDA: fundFixture({ payoutRatio: 0.011 }),
  'SHOP.TO': fundFixture({ payoutRatio: null }),
};
for (const [symbol, input] of Object.entries(FUND_ROWS)) {
  const snap = F.computeFundamentals(input);
  console.log(
    symbol.padEnd(13) +
      String(snap.score).padEnd(6) +
      fmt(snap.dividendSustainability).padEnd(5) +
      fmt(snap.groupScores.safety).padEnd(7) +
      JSON.stringify(snap.usedFields.filter((u) => u === 'dividendSustainability'))
  );
}
