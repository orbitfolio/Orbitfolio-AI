"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * One-off: score AAPL, SHOP.TO, RELIANCE.NS with OLD vs NEW engines on the same Yahoo snapshot.
 */
const yahoo_1 = require("./lib/market/yahoo");
const technicals_1 = require("./lib/market/technicals");
const fundamentals_1 = require("./lib/market/fundamentals");
const analyst_1 = require("./lib/market/analyst");
const rating_1 = require("./lib/market/rating");
function clamp(n, min = 0, max = 10) {
    return Math.min(max, Math.max(min, n));
}
function oldLabel(score) {
    if (score >= 7.5)
        return 'Robust';
    if (score >= 6.0)
        return 'Constructive';
    if (score >= 4.5)
        return 'Mixed';
    if (score >= 3.0)
        return 'Cautious';
    return 'Fragile';
}
function oldCombine(tech, fund, analyst) {
    const hasA = analyst != null && Number.isFinite(analyst);
    let wF = 0.4, wT = 0.35, wA = hasA ? 0.25 : 0;
    const s = wF + wT + wA;
    wF /= s;
    wT /= s;
    wA /= s;
    const raw = fund * wF + tech * wT + (hasA ? analyst * wA : 0);
    const orbitScore = Math.round(clamp(raw) * 10) / 10;
    return { orbitScore, label: oldLabel(orbitScore), wF, wT, wA, tech: Math.round(tech * 10) / 10, fund: Math.round(fund * 10) / 10, analyst: hasA ? Math.round(analyst * 10) / 10 : null };
}
function oldScoreTechnicals(bars) {
    const closes = bars.map((b) => b.close).filter((c) => Number.isFinite(c));
    const lastClose = closes.at(-1) ?? null;
    const rsi14 = (0, technicals_1.rsi)(closes, 14);
    const macdVal = (0, technicals_1.macd)(closes, 12, 26, 9);
    const sma50 = (0, technicals_1.sma)(closes, 50);
    const sma200 = (0, technicals_1.sma)(closes, 200);
    const parts = [];
    if (lastClose != null && sma50 != null && sma200 != null) {
        let trend = 5;
        if (lastClose > sma50)
            trend += 1.5;
        else
            trend -= 1.5;
        if (lastClose > sma200)
            trend += 1.5;
        else
            trend -= 1.5;
        if (sma50 > sma200)
            trend += 1;
        else
            trend -= 1;
        parts.push(clamp(trend));
    }
    else if (lastClose != null && sma50 != null) {
        parts.push(lastClose > sma50 ? 6.5 : 3.5);
    }
    if (rsi14 != null) {
        const r = rsi14;
        let rsiScore;
        if (r >= 40 && r <= 60)
            rsiScore = 8;
        else if (r >= 30 && r < 40)
            rsiScore = 6.5;
        else if (r > 60 && r <= 70)
            rsiScore = 6.5;
        else if (r >= 20 && r < 30)
            rsiScore = 4;
        else if (r > 70 && r <= 80)
            rsiScore = 4;
        else
            rsiScore = 2.5;
        parts.push(rsiScore);
    }
    if (macdVal) {
        const h = macdVal.histogram;
        let macdScore;
        if (h > 0 && macdVal.macd > macdVal.signal)
            macdScore = 8;
        else if (h > 0)
            macdScore = 7;
        else if (h === 0)
            macdScore = 5;
        else if (macdVal.macd < macdVal.signal)
            macdScore = 3;
        else
            macdScore = 3.5;
        parts.push(macdScore);
    }
    const score = parts.length ? Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 10) / 10 : 5;
    return { score, rsi14, sma50, sma200, lastClose, macdHist: macdVal?.histogram ?? null };
}
function scorePE(pe) {
    if (pe <= 0)
        return 2;
    if (pe <= 15)
        return 8.5;
    if (pe <= 25)
        return 7;
    if (pe <= 40)
        return 5;
    if (pe <= 60)
        return 3.5;
    return 2.5;
}
function scorePB(pb) {
    if (pb <= 0)
        return 2;
    if (pb <= 1)
        return 8.5;
    if (pb <= 3)
        return 7;
    if (pb <= 8)
        return 5;
    return 3;
}
function scoreROE(roe) {
    const pct = Math.abs(roe) <= 1.5 ? roe * 100 : roe;
    if (pct >= 20)
        return 9;
    if (pct >= 10)
        return 7;
    if (pct >= 5)
        return 5.5;
    if (pct >= 0)
        return 3.5;
    return 2;
}
function scoreMargins(m) {
    const pct = Math.abs(m) <= 1.5 ? m * 100 : m;
    if (pct >= 20)
        return 9;
    if (pct >= 10)
        return 7;
    if (pct >= 0)
        return 5;
    return 2;
}
function scoreDE(de) {
    const ratio = de > 10 ? de / 100 : de;
    if (ratio < 0)
        return 4;
    if (ratio <= 0.5)
        return 8.5;
    if (ratio <= 1)
        return 7;
    if (ratio <= 2)
        return 5;
    return 3;
}
function score52w(pos) {
    if (pos >= 0.3 && pos <= 0.7)
        return 7.5;
    if (pos > 0.7 && pos <= 0.85)
        return 6;
    if (pos > 0.85)
        return 4.5;
    if (pos >= 0.15)
        return 6;
    return 4.5;
}
function oldScoreFundamentals(summary, bars) {
    const parts = [];
    const used = [];
    const pe = summary.trailingPE;
    const pb = summary.priceToBook;
    const roe = summary.returnOnEquity;
    const pm = summary.profitMargins;
    const de = summary.debtToEquity;
    let week52 = null;
    const last = summary.lastPrice ?? bars.at(-1)?.close;
    const hi = summary.fiftyTwoWeekHigh ?? Math.max(...bars.slice(-252).map((b) => b.high));
    const lo = summary.fiftyTwoWeekLow ?? Math.min(...bars.slice(-252).map((b) => b.low));
    if (Number.isFinite(last) && Number.isFinite(hi) && Number.isFinite(lo) && hi > lo) {
        week52 = (last - lo) / (hi - lo);
    }
    if (Number.isFinite(pe)) {
        parts.push(scorePE(pe));
        used.push('trailingPE');
    }
    if (Number.isFinite(pb)) {
        parts.push(scorePB(pb));
        used.push('priceToBook');
    }
    if (Number.isFinite(roe)) {
        parts.push(scoreROE(roe));
        used.push('returnOnEquity');
    }
    if (Number.isFinite(pm)) {
        parts.push(scoreMargins(pm));
        used.push('profitMargins');
    }
    if (Number.isFinite(de)) {
        parts.push(scoreDE(de));
        used.push('debtToEquity');
    }
    if (week52 != null) {
        parts.push(score52w(week52));
        used.push('week52Position');
    }
    const score = parts.length ? Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 10) / 10 : 5;
    return { score, used, week52, pe, pb, roe };
}
function oldAnalyst(summary) {
    const snap = (0, analyst_1.scoreAnalystConsensus)(summary.recommendationTrend, {
        targetMean: summary.targetMean,
        recommendationKey: summary.recommendationKey,
        numberOfAnalystOpinions: summary.numberOfAnalystOpinions,
    });
    // Old engine used trend mix only
    const counts = snap.counts;
    if (!counts)
        return { score: null, available: false };
    const total = counts.strongBuy + counts.buy + counts.hold + counts.sell + counts.strongSell;
    if (total <= 0)
        return { score: null, available: false };
    const weighted = (counts.strongBuy * 10 + counts.buy * 7.5 + counts.hold * 5 + counts.sell * 2.5 + counts.strongSell * 0) / total;
    return { score: Math.round(clamp(weighted) * 10) / 10, available: true, key: summary.recommendationKey };
}
async function one(symbol, market) {
    const chart = await (0, yahoo_1.fetchChart)(symbol, '1y', '1d');
    let summary = null;
    try {
        summary = await (0, yahoo_1.fetchQuoteSummary)(symbol);
    }
    catch (e) {
        summary = {};
    }
    const bars = chart.bars;
    const oldT = oldScoreTechnicals(bars);
    const oldF = oldScoreFundamentals(summary ?? {}, bars);
    const oldA = oldAnalyst(summary ?? {});
    const oldC = oldCombine(oldT.score, oldF.score, oldA.available ? oldA.score : null);
    const newT = (0, technicals_1.computeTechnicals)(bars);
    const newF = (0, fundamentals_1.computeFundamentals)({
        trailingPE: summary?.trailingPE,
        forwardPE: summary?.forwardPE,
        priceToBook: summary?.priceToBook,
        returnOnEquity: summary?.returnOnEquity,
        returnOnAssets: summary?.returnOnAssets,
        profitMargins: summary?.profitMargins,
        operatingMargins: summary?.operatingMargins,
        grossMargins: summary?.grossMargins,
        debtToEquity: summary?.debtToEquity,
        currentRatio: summary?.currentRatio,
        freeCashflow: summary?.freeCashflow,
        operatingCashflow: summary?.operatingCashflow,
        netIncomeToCommon: summary?.netIncomeToCommon,
        enterpriseToEbitda: summary?.enterpriseToEbitda,
        marketCap: summary?.marketCap,
        earningsGrowth: summary?.earningsGrowth,
        revenueGrowth: summary?.revenueGrowth,
        name: summary?.shortName || summary?.longName,
        symbol,
    });
    const newA = (0, analyst_1.scoreAnalystConsensus)(summary?.recommendationTrend, {
        targetMean: summary?.targetMean,
        recommendationKey: summary?.recommendationKey,
        numberOfAnalystOpinions: summary?.numberOfAnalystOpinions,
        recommendationMean: summary?.recommendationMean,
        lastPrice: summary?.lastPrice ?? chart.quote.price,
    });
    const newC = (0, rating_1.combineRating)({
        technical: newT.score,
        fundamental: newF.score,
        analystConsensus: newA.available ? newA.score : null,
    });
    return {
        symbol,
        market,
        name: summary?.shortName || summary?.longName || chart.quote.name,
        price: chart.quote.price,
        currency: chart.quote.currency,
        source: chart.source,
        old: {
            orbitScore: oldC.orbitScore,
            label: oldC.label,
            pillars: { technical: oldC.tech, fundamental: oldC.fund, analyst: oldC.analyst },
            weights: { technical: 0.35, fundamental: 0.4, analyst: oldA.available ? 0.25 : 0 },
            notes: {
                rsi: oldT.rsi14,
                macdHist: oldT.macdHist,
                usedFund: oldF.used,
                analystKey: oldA.key ?? null,
            },
        },
        neu: {
            orbitScore: newC.orbitScore,
            label: newC.label,
            action: newC.action,
            pillars: newC.pillars,
            weights: newC.weightsUsed,
            notes: {
                mom12_1: newT.mom12_1,
                adx14: newT.adx14,
                rsi14: newT.rsi14,
                week52HighRatio: newT.week52HighRatio,
                fundGroups: newF.groupScores,
                usedFund: newF.usedFields,
                analystMean: newA.recommendationMean,
            },
        },
    };
}
async function main() {
    const rows = [];
    for (const [sym, mkt] of [['AAPL', 'USA'], ['SHOP.TO', 'Canada'], ['RELIANCE.NS', 'India']]) {
        try {
            rows.push(await one(sym, mkt));
        }
        catch (e) {
            rows.push({ symbol: sym, market: mkt, error: e instanceof Error ? e.message : String(e) });
        }
    }
    console.log(JSON.stringify(rows, null, 2));
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
