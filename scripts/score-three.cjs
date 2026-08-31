const fs = require('fs');
const { computeTechnicals, rsi, macd, sma } = require('/workspace/orbitfolio/scripts/lib/market/technicals.js');
const { computeFundamentals } = require('/workspace/orbitfolio/scripts/lib/market/fundamentals.js');
const { scoreAnalystConsensus } = require('/workspace/orbitfolio/scripts/lib/market/analyst.js');
const { combineRating } = require('/workspace/orbitfolio/scripts/lib/market/rating.js');

function clamp(n, min = 0, max = 10) {
  return Math.min(max, Math.max(min, n));
}
function oldLabel(score) {
  if (score >= 7.5) return 'Robust';
  if (score >= 6) return 'Constructive';
  if (score >= 4.5) return 'Mixed';
  if (score >= 3) return 'Cautious';
  return 'Fragile';
}
function oldCombine(tech, fund, analyst) {
  const hasA = analyst != null && Number.isFinite(analyst);
  let wF = 0.4, wT = 0.35, wA = hasA ? 0.25 : 0;
  const s = wF + wT + wA;
  wF /= s; wT /= s; wA /= s;
  const raw = fund * wF + tech * wT + (hasA ? analyst * wA : 0);
  const orbitScore = Math.round(clamp(raw) * 10) / 10;
  return {
    orbitScore,
    label: oldLabel(orbitScore),
    tech: Math.round(tech * 10) / 10,
    fund: Math.round(fund * 10) / 10,
    analyst: hasA ? Math.round(analyst * 10) / 10 : null,
    wF, wT, wA,
  };
}
function oldScoreTechnicals(bars) {
  const closes = bars.map((b) => b.close).filter(Number.isFinite);
  const lastClose = closes.length ? closes[closes.length - 1] : null;
  const rsi14 = rsi(closes, 14);
  const macdVal = macd(closes, 12, 26, 9);
  const sma50v = sma(closes, 50);
  const sma200v = sma(closes, 200);
  const parts = [];
  if (lastClose != null && sma50v != null && sma200v != null) {
    let trend = 5;
    if (lastClose > sma50v) trend += 1.5; else trend -= 1.5;
    if (lastClose > sma200v) trend += 1.5; else trend -= 1.5;
    if (sma50v > sma200v) trend += 1; else trend -= 1;
    parts.push(clamp(trend));
  }
  if (rsi14 != null) {
    const r = rsi14;
    let rsiScore;
    if (r >= 40 && r <= 60) rsiScore = 8;
    else if (r >= 30 && r < 40) rsiScore = 6.5;
    else if (r > 60 && r <= 70) rsiScore = 6.5;
    else if (r >= 20 && r < 30) rsiScore = 4;
    else if (r > 70 && r <= 80) rsiScore = 4;
    else rsiScore = 2.5;
    parts.push(rsiScore);
  }
  if (macdVal) {
    const h = macdVal.histogram;
    let macdScore;
    if (h > 0 && macdVal.macd > macdVal.signal) macdScore = 8;
    else if (h > 0) macdScore = 7;
    else if (h === 0) macdScore = 5;
    else if (macdVal.macd < macdVal.signal) macdScore = 3;
    else macdScore = 3.5;
    parts.push(macdScore);
  }
  const score = parts.length ? Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 10) / 10 : 5;
  return { score, rsi14, sma50: sma50v, sma200: sma200v, lastClose, macdHist: macdVal ? macdVal.histogram : null };
}
function scorePE(pe) {
  if (pe <= 0) return 2;
  if (pe <= 15) return 8.5;
  if (pe <= 25) return 7;
  if (pe <= 40) return 5;
  if (pe <= 60) return 3.5;
  return 2.5;
}
function scorePB(pb) {
  if (pb <= 0) return 2;
  if (pb <= 1) return 8.5;
  if (pb <= 3) return 7;
  if (pb <= 8) return 5;
  return 3;
}
function scoreROE(roe) {
  const pct = Math.abs(roe) <= 1.5 ? roe * 100 : roe;
  if (pct >= 20) return 9;
  if (pct >= 10) return 7;
  if (pct >= 5) return 5.5;
  if (pct >= 0) return 3.5;
  return 2;
}
function scoreMargins(m) {
  const pct = Math.abs(m) <= 1.5 ? m * 100 : m;
  if (pct >= 20) return 9;
  if (pct >= 10) return 7;
  if (pct >= 0) return 5;
  return 2;
}
function scoreDE(de) {
  const ratio = de > 10 ? de / 100 : de;
  if (ratio < 0) return 4;
  if (ratio <= 0.5) return 8.5;
  if (ratio <= 1) return 7;
  if (ratio <= 2) return 5;
  return 3;
}
function score52w(pos) {
  if (pos >= 0.3 && pos <= 0.7) return 7.5;
  if (pos > 0.7 && pos <= 0.85) return 6;
  if (pos > 0.85) return 4.5;
  if (pos >= 0.15) return 6;
  return 4.5;
}
function oldFund(input) {
  const parts = [];
  const used = [];
  if (Number.isFinite(input.trailingPE)) { parts.push(scorePE(input.trailingPE)); used.push('trailingPE'); }
  if (Number.isFinite(input.priceToBook)) { parts.push(scorePB(input.priceToBook)); used.push('priceToBook'); }
  if (Number.isFinite(input.returnOnEquity)) { parts.push(scoreROE(input.returnOnEquity)); used.push('returnOnEquity'); }
  if (Number.isFinite(input.profitMargins)) { parts.push(scoreMargins(input.profitMargins)); used.push('profitMargins'); }
  if (Number.isFinite(input.debtToEquity)) { parts.push(scoreDE(input.debtToEquity)); used.push('debtToEquity'); }
  let week52 = null;
  if (Number.isFinite(input.lastPrice) && Number.isFinite(input.hi) && Number.isFinite(input.lo) && input.hi > input.lo) {
    week52 = (input.lastPrice - input.lo) / (input.hi - input.lo);
    parts.push(score52w(week52));
    used.push('week52Position');
  }
  const score = parts.length ? Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 10) / 10 : 5;
  return { score, used, week52 };
}
function barsFromChart(file) {
  let raw = fs.readFileSync(file);
  if (raw[0] === 0xEF && raw[1] === 0xBB && raw[2] === 0xBF) raw = raw.slice(3);
  const d = JSON.parse(raw.toString('utf8'));
  const r = d.chart.result[0];
  const ts = r.timestamp;
  const q = r.indicators.quote[0];
  const bars = [];
  for (let i = 0; i < ts.length; i++) {
    if (!Number.isFinite(q.close[i])) continue;
    bars.push({
      time: ts[i] * 1000,
      open: q.open[i],
      high: q.high[i],
      low: q.low[i],
      close: q.close[i],
      volume: q.volume[i] || 0,
    });
  }
  return { bars, meta: r.meta };
}
function oldAnalyst(counts) {
  const total = counts.strongBuy + counts.buy + counts.hold + counts.sell + counts.strongSell;
  if (!total) return null;
  const weighted =
    (counts.strongBuy * 10 + counts.buy * 7.5 + counts.hold * 5 + counts.sell * 2.5 + counts.strongSell * 0) / total;
  return Math.round(clamp(weighted) * 10) / 10;
}

const stocks = [
  {
    symbol: 'AAPL',
    market: 'USA',
    name: 'Apple Inc.',
    currency: 'USD',
    chart: '/workspace/uploads/AAPL.chart.json',
    fund: {
      trailingPE: 36.08, forwardPE: 33.0, priceToBook: 42.7, returnOnEquity: 1.4875, returnOnAssets: 0.2708,
      profitMargins: 0.2762, operatingMargins: 0.3262, grossMargins: 0.4865, debtToEquity: 78.44, currentRatio: 1.0,
      freeCashflow: 107.72e9, operatingCashflow: 146.72e9, netIncomeToCommon: 128.93e9, enterpriseToEbitda: 27.46,
      marketCap: 4.59e12, earningsGrowth: 0.271, revenueGrowth: 0.164, lastPrice: 316.85, hi: 344.57, lo: 225.95, symbol: 'AAPL',
    },
    analyst: {
      counts: { strongBuy: 1, buy: 22, hold: 12, sell: 4, strongSell: 0 },
      recommendationMean: 97 / 39,
      targetMean: 324.45,
      numberOfAnalystOpinions: 39,
      recommendationKey: 'buy',
      lastPrice: 316.85,
    },
    analystSource: 'MarketBeat mix 1/22/12/4 + Yahoo 1y target $324.45',
  },
  {
    symbol: 'SHOP.TO',
    market: 'Canada',
    name: 'Shopify Inc.',
    currency: 'CAD',
    chart: '/workspace/uploads/SHOP.TO.chart.json',
    fund: {
      trailingPE: 104.31, forwardPE: 80.65, priceToBook: 15.66, returnOnEquity: 0.1554, returnOnAssets: 0.1019,
      profitMargins: 0.1453, operatingMargins: 0.1755, debtToEquity: 1.4, currentRatio: 5.35,
      freeCashflow: 1.59e9, operatingCashflow: 2.38e9, netIncomeToCommon: 1.93e9, enterpriseToEbitda: 81.02,
      marketCap: 275.54e9, earningsGrowth: 0.658, revenueGrowth: 0.337, lastPrice: 204.27, hi: 253.1, lo: 129.01, symbol: 'SHOP.TO',
    },
    analyst: {
      counts: { strongBuy: 0, buy: 27, hold: 12, sell: 1, strongSell: 0 },
      recommendationMean: (27 * 2 + 12 * 3 + 1 * 4) / 40,
      targetMean: 204.27 * 1.1831,
      numberOfAnalystOpinions: 40,
      recommendationKey: 'buy',
      lastPrice: 204.27,
    },
    analystSource: 'Financhill SHOP.TO 27 buy / 12 hold / 1 sell; 18.3% implied upside applied to CAD last',
  },
  {
    symbol: 'RELIANCE.NS',
    market: 'India',
    name: 'Reliance Industries',
    currency: 'INR',
    chart: null,
    sma50: 1304.35,
    sma200: 1388.92,
    mom12: -0.0494,
    fund: {
      trailingPE: 23.22, forwardPE: 24.63, priceToBook: 1.92, profitMargins: 0.0661, operatingMargins: 0.1233,
      debtToEquity: 36.65, netIncomeToCommon: 747.27e9, enterpriseToEbitda: 13.07, marketCap: 17.35e12,
      earningsGrowth: -0.224, revenueGrowth: 0.297, lastPrice: 1277, hi: 1611.8, lo: 1249.8, symbol: 'RELIANCE.NS',
    },
    analyst: {
      counts: { strongBuy: 21, buy: 5, hold: 0, sell: 1, strongSell: 0 },
      recommendationMean: (21 * 1 + 5 * 2 + 1 * 4) / 27,
      targetMean: 1678,
      numberOfAnalystOpinions: 27,
      recommendationKey: 'strong_buy',
      lastPrice: 1277,
    },
    analystSource: 'stockanalysis.com Aug 2026: 21 strong buy / 5 buy / 1 sell, target ₹1678',
  },
];

function scoreRelianceTechPartial(s) {
  const last = s.fund.lastPrice;
  const sma50v = s.sma50;
  const sma200v = s.sma200;
  let trend = 5;
  if (last > sma50v) trend += 1.5; else trend -= 1.5;
  if (last > sma200v) trend += 1.5; else trend -= 1.5;
  if (sma50v > sma200v) trend += 1; else trend -= 1;
  const oldScore = Math.round(clamp(trend) * 10) / 10;
  // New: only SMA200, SMA cross, 52w high, 12m change. Skip RSI/ADX/volume.
  const w52 = last / s.fund.hi;
  const { scoreMom12_1, scorePriceVsSma200, scoreSmaCross, scoreWeek52HighRatio } = require('/workspace/orbitfolio/scripts/lib/market/technicals.js');
  const parts = [
    { s: scoreMom12_1(s.mom12), w: 0.28 },
    { s: scorePriceVsSma200(last, sma200v), w: 0.22 },
    { s: scoreSmaCross(sma50v, sma200v), w: 0.12 },
    { s: scoreWeek52HighRatio(w52), w: 0.18 },
  ].filter((p) => p.s != null);
  const sw = parts.reduce((a, p) => a + p.w, 0);
  const newScore = Math.round(clamp(parts.reduce((a, p) => a + p.s * (p.w / sw), 0)) * 10) / 10;
  return {
    old: { score: oldScore, rsi14: null, sma50: sma50v, sma200: sma200v, lastClose: last, macdHist: null, note: 'SMA-only (no 1y bars on this machine)' },
    neu: { score: newScore, mom12_1: s.mom12, sma50: sma50v, sma200: sma200v, week52HighRatio: w52, rsi14: null, adx14: null, note: 'partial: 12m change, SMA200, SMA cross, 52w high; RSI/ADX/volume skipped' },
  };
}

const results = stocks.map((s) => {
  let oldT, newT;
  if (s.chart && fs.existsSync(s.chart)) {
    const parsed = barsFromChart(s.chart);
    oldT = oldScoreTechnicals(parsed.bars);
    newT = computeTechnicals(parsed.bars);
  } else {
    const p = scoreRelianceTechPartial(s);
    oldT = p.old;
    newT = p.neu;
  }
  const of = oldFund(s.fund);
  const nf = computeFundamentals(s.fund);
  const oa = oldAnalyst(s.analyst.counts);
  const na = scoreAnalystConsensus(
    [{ period: '0m', ...s.analyst.counts }],
    {
      recommendationMean: s.analyst.recommendationMean,
      targetMean: s.analyst.targetMean,
      numberOfAnalystOpinions: s.analyst.numberOfAnalystOpinions,
      recommendationKey: s.analyst.recommendationKey,
      lastPrice: s.analyst.lastPrice,
    }
  );
  const oldC = oldCombine(oldT.score, of.score, oa);
  const newC = combineRating({
    technical: newT.score,
    fundamental: nf.score,
    analystConsensus: na.available ? na.score : null,
  });
  return {
    symbol: s.symbol,
    market: s.market,
    name: s.name,
    last: s.fund.lastPrice,
    currency: s.currency,
    old: {
      orbitScore: oldC.orbitScore,
      label: oldC.label,
      pillars: { technical: oldC.tech, fundamental: oldC.fund, analyst: oldC.analyst },
      formula: `${oldC.fund.toFixed(1)}×${oldC.wF.toFixed(2)} + ${oldC.tech.toFixed(1)}×${oldC.wT.toFixed(2)} + ${oldC.analyst.toFixed(1)}×${oldC.wA.toFixed(2)}`,
      techBits: { rsi: oldT.rsi14, sma50: oldT.sma50, sma200: oldT.sma200, macdHist: oldT.macdHist, note: oldT.note || null },
      fundUsed: of.used,
      week52: of.week52,
    },
    neu: {
      orbitScore: newC.orbitScore,
      label: newC.label,
      action: newC.action,
      pillars: newC.pillars,
      weights: newC.weightsUsed,
      formula: `${newC.pillars.fundamental.toFixed(1)}×${newC.weightsUsed.fundamental.toFixed(2)} + ${newC.pillars.technical.toFixed(1)}×${newC.weightsUsed.technical.toFixed(2)} + ${newC.pillars.analystConsensus.toFixed(1)}×${newC.weightsUsed.analystConsensus.toFixed(2)}`,
      tech: {
        score: newT.score,
        mom12_1: newT.mom12_1 ?? null,
        adx14: newT.adx14 ?? null,
        rsi14: newT.rsi14 ?? null,
        volumeRatio: newT.volumeRatio ?? null,
        week52HighRatio: newT.week52HighRatio ?? null,
        sma50: newT.sma50 ?? s.sma50,
        sma200: newT.sma200 ?? s.sma200,
        note: newT.note || null,
        components: newT.components || null,
      },
      fundGroups: nf.groupScores,
      fundUsed: nf.usedFields,
      analyst: { score: na.score, mean: na.recommendationMean, target: na.targetMean, n: na.numberOfAnalysts },
    },
    analystSource: s.analystSource,
  };
});

console.log(JSON.stringify(results, null, 2));
