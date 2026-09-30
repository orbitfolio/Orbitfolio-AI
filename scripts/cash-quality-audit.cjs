#!/usr/bin/env node
/**
 * Before/after harness for the A1 cash-quality change (Phase 2).
 *
 * Transpiles lib/market/fundamentals.ts on the fly (same trick as tests/run.cjs),
 * runs six fixed demo-book fundamentals fixtures through computeFundamentals,
 * and prints one row per ticker. Run it BEFORE the change and AFTER, then diff:
 *
 *   node scripts/cash-quality-audit.cjs > .tmp-score-audit/before-fund.txt
 *   node scripts/cash-quality-audit.cjs > .tmp-score-audit/after-fund.txt
 *
 * Fixtures are synthetic-but-plausible annual figures in the ticker's local
 * currency, held constant across runs, so any diff comes from the engine —
 * not from the data. A1 only touches the CASH group (fcfYield stays,
 * the binary accrual check is replaced by graded conversion + accruals).
 */
const ts = require('typescript');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'lib', 'market', 'fundamentals.ts'), 'utf8');
const { outputText } = ts.transpileModule(src, {
  fileName: 'fundamentals.ts',
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
    isolatedModules: true,
  },
});
const mod = { exports: {} };
new Function('module', 'exports', outputText)(mod, mod.exports);
const { computeFundamentals } = mod.exports;

/**
 * Local-currency annual figures (approximate magnitudes, deterministic):
 * NI = netIncomeToCommon, OCF = operatingCashflow, FCF = freeCashflow,
 * MC = marketCap. Extra fields keep the other groups realistic.
 */
const DEMO_BOOK = {
  AAPL: { trailingPE: 31, priceToBook: 55, returnOnEquity: 1.5, operatingMargins: 0.29, NI: 97e9, OCF: 118e9, FCF: 105e9, MC: 3.3e12, earningsGrowth: 0.1 },
  MSFT: { trailingPE: 34, priceToBook: 11, returnOnEquity: 0.35, operatingMargins: 0.44, NI: 88e9, OCF: 118e9, FCF: 74e9, MC: 3.0e12, earningsGrowth: 0.2 },
  NVDA: { trailingPE: 48, priceToBook: 35, returnOnEquity: 0.9, operatingMargins: 0.62, NI: 60e9, OCF: 64e9, FCF: 60e9, MC: 2.9e12, earningsGrowth: 0.6 },
  'RELIANCE.NS': { trailingPE: 24, priceToBook: 2.1, returnOnEquity: 0.09, operatingMargins: 0.17, NI: 7.0e11, OCF: 1.34e12, FCF: 6.0e11, MC: 1.66e13, earningsGrowth: 0.07 },
  'INFY.NS': { trailingPE: 24, priceToBook: 7.5, returnOnEquity: 0.31, operatingMargins: 0.21, NI: 2.5e11, OCF: 2.7e11, FCF: 2.2e11, MC: 6.2e12, earningsGrowth: 0.05 },
  'SHOP.TO': { trailingPE: 0, priceToBook: 12, returnOnEquity: -0.04, operatingMargins: 0.02, NI: -2.9e9, OCF: 1.4e9, FCF: 1.1e9, MC: 1.2e11, revenueGrowth: 0.25 },
};

function toInput(f) {
  return {
    trailingPE: f.trailingPE || null,
    priceToBook: f.priceToBook,
    returnOnEquity: f.returnOnEquity,
    operatingMargins: f.operatingMargins,
    freeCashflow: f.FCF,
    operatingCashflow: f.OCF,
    netIncomeToCommon: f.NI,
    marketCap: f.MC,
    earningsGrowth: f.earningsGrowth ?? null,
    revenueGrowth: f.revenueGrowth ?? null,
    name: 'fixture',
    symbol: 'FIX',
    quoteType: 'EQUITY',
  };
}

const fmt = (v, d = 2) => (v == null ? '—' : Number(v).toFixed(d));

console.log('symbol'.padEnd(13) + 'fund'.padEnd(7) + 'cash'.padEnd(7) + 'cc'.padEnd(7) + 'fcc'.padEnd(7) + 'accr'.padEnd(7) + 'usedFields');
for (const [symbol, f] of Object.entries(DEMO_BOOK)) {
  const snap = computeFundamentals(toInput(f));
  const cashFields = snap.usedFields.filter((u) =>
    ['fcfYield', 'cashConversion', 'fcfConversion', 'accrual'].includes(u)
  );
  console.log(
    symbol.padEnd(13) +
      String(snap.score).padEnd(7) +
      fmt(snap.groupScores.cash, 1).padEnd(7) +
      fmt(snap.cashConversion).padEnd(7) +
      fmt(snap.fcfConversion).padEnd(7) +
      fmt(snap.accrualsCheck, 1).padEnd(7) +
      JSON.stringify(cashFields)
  );
}
