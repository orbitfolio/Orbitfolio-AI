/**
 * Pure technicals from 1y daily OHLCV → 0-10 technical pillar.
 *
 * SMA+MACD overlap and mean-reversion RSI were insufficient. MACD stays on the
 * snapshot for charts only and is NOT scored. 12-1 momentum, price vs SMA200,
 * 52w-high continuation, ADX-gated RSI, and relative volume are scored instead.
 *
 * Phase 5 (A2/A3) additions, all from bars already fetched (plus one cached
 * benchmark chart for relative strength):
 * - relMomentum: 12-1 momentum vs the same-window market return ( Jegadeesh-
 *   Titman momentum is relative by construction; absolute return alone
 *   rewards every holder of a rising market).
 * - volatility: realized vol of daily returns over the window; steady gainers
 *   score above wild ones.
 * - drawdown: worst peak-to-trough fall; deep drawdowns cap the score.
 * - week52Range: position within the 52-week range (complements week52High's
 *   distance-from-high with distance-from-low).
 * - betaRiskAdjustment (A3, lib/market/fundamentals.ts): capped ±1.25
 *   adjustment (~12% of a full pillar) — risk-adjusting momentum has mixed
 *   evidence, so it must not dominate.
 */

export interface OhlcvBar {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface TechnicalSnapshot {
    rsi14: number | null;
    macd: number | null;
    macdSignal: number | null;
    macdHistogram: number | null;
    sma50: number | null;
    sma200: number | null;
    lastClose: number | null;
    mom12_1: number | null;
    adx14: number | null;
    volumeRatio: number | null;
    week52HighRatio: number | null;
    week52Range: number | null;
    realizedVol: number | null;
    maxDrawdown: number | null;
    relMomentum: number | null;
    score: number;
    components: {
        mom12_1: number | null;
        relMomentum: number | null;
        priceVsSma200: number | null;
        smaCross: number | null;
        week52High: number | null;
        week52Range: number | null;
        rsi: number | null;
        volume: number | null;
        volatility: number | null;
        drawdown: number | null;
    };
    weightsUsed: {
        mom12_1: number;
        relMomentum: number;
        priceVsSma200: number;
        smaCross: number;
        week52High: number;
        week52Range: number;
        rsi: number;
        volume: number;
        volatility: number;
        drawdown: number;
    };
}

export const TECH_WEIGHTS = {
    mom12_1: 0.24,
    relMomentum: 0.1,
    priceVsSma200: 0.2,
    smaCross: 0.1,
    week52High: 0.14,
    week52Range: 0.04,
    rsi: 0.1,
    volume: 0.06,
    volatility: 0.015,
    drawdown: 0.005,
} as const;

/** Compounded return over the same window for the benchmark series. */
export function windowReturn(closes: number[], bars = 252): number | null {
    const n = closes.length;
    if (n < 2) return null;
    const startIdx = n >= bars ? n - bars : 0;
    const start = closes[startIdx];
    const end = closes[n - 1];
    if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0) return null;
    return end / start - 1;
}

/** Scores the momentum gap vs the market (stock 12-1 minus market return), bounded to [-2, 2]. */
export function scoreRelMomentum(rel: number | null): number | null {
    if (rel == null || !Number.isFinite(rel)) return null;
    const bounded = Math.max(-2, Math.min(2, rel));
    if (bounded >= 0.2) return 8.5;
    if (bounded >= 0.08) return 7;
    if (bounded >= 0) return 5.5;
    if (bounded >= -0.1) return 4;
    return 2.5;
}

/** Simple moving average over the last `period` values. */
export function sma(values: number[], period: number): number | null {
    if (values.length < period || period <= 0) return null;
    const slice = values.slice(-period);
    const sum = slice.reduce((a, b) => a + b, 0);
    return sum / period;
}

/** Annualized realized volatility of daily log returns. Steady ≈ 0.15-0.3. */
export function realizedVolatility(closes: number[], bars = 252): number | null {
    if (closes.length < 21) return null;
    const slice = closes.slice(-bars);
    const rets: number[] = [];
    for (let i = 1; i < slice.length; i++) {
        if (slice[i - 1] > 0 && slice[i] > 0) rets.push(Math.log(slice[i] / slice[i - 1]));
    }
    if (rets.length < 20) return null;
    const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
    const variance = rets.reduce((a, r) => a + (r - mean) ** 2, 0) / (rets.length - 1);
    return Math.sqrt(variance) * Math.sqrt(252);
}

export function scoreVolatility(vol: number | null): number | null {
    if (vol == null || !Number.isFinite(vol)) return null;
    if (vol <= 0.2) return 8;
    if (vol <= 0.35) return 7;
    if (vol <= 0.55) return 5.5;
    if (vol <= 0.8) return 4;
    return 2.5;
}

/** Worst peak-to-trough decline over the window, as a negative fraction. */
export function maxDrawdown(closes: number[], bars = 252): number | null {
    if (closes.length < 2) return null;
    const slice = closes.slice(-bars);
    let peak = slice[0];
    let mdd = 0;
    for (const c of slice) {
        if (c > peak) peak = c;
        const dd = c / peak - 1;
        if (dd < mdd) mdd = dd;
    }
    return mdd;
}

export function scoreDrawdown(mdd: number | null): number | null {
    if (mdd == null || !Number.isFinite(mdd)) return null;
    if (mdd >= -0.15) return 8;
    if (mdd >= -0.3) return 6.5;
    if (mdd >= -0.5) return 4.5;
    return 2.5;
}

/** Position within the 52-week range: 1 = at the high, 0 = at the low. */
export function week52RangePosition(bars: OhlcvBar[]): number | null {
    if (bars.length < 22) return null;
    const slice = bars.slice(-252);
    let high = -Infinity;
    let low = Infinity;
    for (const b of slice) {
        if (Number.isFinite(b.high) && b.high > high) high = b.high;
        if (Number.isFinite(b.low) && b.low < low) low = b.low;
    }
    const last = bars[bars.length - 1]?.close;
    if (!Number.isFinite(last) || !Number.isFinite(high) || !Number.isFinite(low) || !(high > low)) return null;
    return Math.max(0, Math.min(1, (last - low) / (high - low)));
}

export function scoreWeek52Range(pos: number | null): number | null {
    if (pos == null || !Number.isFinite(pos)) return null;
    if (pos >= 0.9) return 8;
    if (pos >= 0.7) return 7;
    if (pos >= 0.4) return 5.5;
    if (pos >= 0.2) return 4;
    return 2.5;
}

export function rsi(values: number[], period = 14): number | null {
    if (values.length < period + 1) return null;
    let gain = 0;
    let loss = 0;
    for (let i = 1; i <= period; i++) {
        const delta = values[i] - values[i - 1];
        if (delta >= 0) gain += delta;
        else loss -= delta;
    }
    let avgGain = gain / period;
    let avgLoss = loss / period;
    for (let i = period + 1; i < values.length; i++) {
        const delta = values[i] - values[i - 1];
        const g = delta > 0 ? delta : 0;
        const l = delta < 0 ? -delta : 0;
        avgGain = (avgGain * (period - 1) + g) / period;
        avgLoss = (avgLoss * (period - 1) + l) / period;
    }
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
}

export function macd(
    values: number[],
    fast = 12,
    slow = 26,
    signalPeriod = 9
): { macd: number; signal: number; histogram: number } | null {
    if (values.length < slow + signalPeriod) return null;
    const emaFast = emaSeries(values, fast);
    const emaSlow = emaSeries(values, slow);
    const macdLine = emaFast.map((v, i) => v - emaSlow[i]);
    const signalLine = emaSeries(macdLine, signalPeriod);
    const last = macdLine.length - 1;
    const macdVal = macdLine[last];
    const signalVal = signalLine[last];
    return {
        macd: macdVal,
        signal: signalVal,
        histogram: macdVal - signalVal,
    };
}

export function emaSeries(values: number[], period: number): number[] {
    if (values.length === 0 || period <= 0) return [];
    const k = 2 / (period + 1);
    const out: number[] = [];
    let prev = values[0];
    out.push(prev);
    for (let i = 1; i < values.length; i++) {
        prev = values[i] * k + prev * (1 - k);
        out.push(prev);
    }
    return out;
}

function clamp(n: number, min = 0, max = 10): number {
    return Math.min(max, Math.max(min, n));
}

function avg(xs: number[]): number {
    return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** 12-1 momentum: skip the most recent month (Jegadeesh-Titman). */
export function momentum12_1(closes: number[]): number | null {
    const n = closes.length;
    if (n < 22) return null;
    const recent = closes[n - 21];
    const startIdx = n >= 252 ? n - 252 : 0;
    if (startIdx >= n - 21) return null;
    const start = closes[startIdx];
    if (!Number.isFinite(recent) || !Number.isFinite(start) || start === 0) return null;
    return recent / start - 1;
}

/** Wilder ADX(14) from high/low/close. Not a directional vote. */
export function adxWilder(bars: OhlcvBar[], period = 14): number | null {
    if (bars.length < period * 2 + 1) return null;
    const tr: number[] = [];
    const plusDM: number[] = [];
    const minusDM: number[] = [];
    for (let i = 1; i < bars.length; i++) {
        const h = bars[i].high;
        const l = bars[i].low;
        const prevC = bars[i - 1].close;
        const prevH = bars[i - 1].high;
        const prevL = bars[i - 1].low;
        const upMove = h - prevH;
        const downMove = prevL - l;
        tr.push(Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC)));
        plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
        minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    }
    if (tr.length < period) return null;
    let atr = avg(tr.slice(0, period));
    let smPlus = avg(plusDM.slice(0, period));
    let smMinus = avg(minusDM.slice(0, period));
    const dx: number[] = [];
    const pushDx = () => {
        const pdi = atr ? (100 * smPlus) / atr : 0;
        const mdi = atr ? (100 * smMinus) / atr : 0;
        const den = pdi + mdi;
        dx.push(den ? (100 * Math.abs(pdi - mdi)) / den : 0);
    };
    pushDx();
    for (let i = period; i < tr.length; i++) {
        atr = (atr * (period - 1) + tr[i]) / period;
        smPlus = (smPlus * (period - 1) + plusDM[i]) / period;
        smMinus = (smMinus * (period - 1) + minusDM[i]) / period;
        pushDx();
    }
    if (dx.length < period) return null;
    let adx = avg(dx.slice(0, period));
    for (let i = period; i < dx.length; i++) {
        adx = (adx * (period - 1) + dx[i]) / period;
    }
    return adx;
}

export function week52HighRatio(bars: OhlcvBar[]): number | null {
    if (!bars.length) return null;
    const slice = bars.slice(-252);
    let high = -Infinity;
    for (const b of slice) {
        if (Number.isFinite(b.high) && b.high > high) high = b.high;
    }
    const last = bars[bars.length - 1]?.close;
    if (!Number.isFinite(last) || !(high > 0)) return null;
    return last / high;
}

export function scoreMom12_1(mom: number | null): number | null {
    if (mom == null || !Number.isFinite(mom)) return null;
    if (mom >= 0.2) return 8.5;
    if (mom >= 0.08) return 7;
    if (mom >= 0) return 5.5;
    if (mom >= -0.1) return 4;
    return 2.5;
}

export function scorePriceVsSma200(last: number | null, sma200: number | null): number | null {
    if (last == null || sma200 == null || !Number.isFinite(last) || !Number.isFinite(sma200) || sma200 === 0) {
        return null;
    }
    const dist = Math.max(-0.2, Math.min(0.2, last / sma200 - 1));
    return clamp(5 + (dist / 0.2) * 4);
}

export function scoreSmaCross(sma50: number | null, sma200: number | null): number | null {
    if (sma50 == null || sma200 == null || !Number.isFinite(sma50) || !Number.isFinite(sma200)) return null;
    return sma50 > sma200 ? 8 : 3;
}

export function scoreWeek52HighRatio(ratio: number | null): number | null {
    if (ratio == null || !Number.isFinite(ratio)) return null;
    if (ratio >= 0.95) return 8.5;
    if (ratio >= 0.8) return 7;
    if (ratio >= 0.6) return 5;
    return 3;
}

export function scoreRsiRegime(rsi14: number | null, adx14: number | null, last: number | null, sma200: number | null): number | null {
    if (rsi14 == null || !Number.isFinite(rsi14)) return null;
    const above200 = last != null && sma200 != null && last > sma200;
    const trendMode = (adx14 != null && adx14 >= 25) || above200;
    const r = rsi14;
    if (trendMode) {
        if (r > 80) return 3.5;
        if (r >= 75) return 6;
        if (r >= 50) return 7.5;
        if (r >= 40) return 5;
        return 3;
    }
    if (r >= 40 && r <= 60) return 8;
    if (r > 70 || r < 30) return 3.5;
    if (r > 60) return 5;
    return 5;
}

export function scoreRelVolume(ratio: number | null): number | null {
    if (ratio == null || !Number.isFinite(ratio)) return null;
    if (ratio > 1.2) return 7.5;
    if (ratio > 1) return 6.5;
    if (ratio > 0.8) return 5;
    return 3.5;
}

function emptyTechWeights() {
    return {
        mom12_1: 0,
        relMomentum: 0,
        priceVsSma200: 0,
        smaCross: 0,
        week52High: 0,
        week52Range: 0,
        rsi: 0,
        volume: 0,
        volatility: 0,
        drawdown: 0,
    };
}

/**
 * Weighted technical pillar. MACD is ignored even if passed (chart only).
 * Missing components renormalize — including the new ones, so a missing
 * benchmark degrades to the pre-A2 component set.
 */
export function scoreTechnicals(input: {
    lastClose: number | null;
    sma50: number | null;
    sma200: number | null;
    rsi14: number | null;
    mom12_1?: number | null;
    adx14?: number | null;
    volumeRatio?: number | null;
    week52HighRatio?: number | null;
    relMomentum?: number | null;
    volatility?: number | null;
    maxDrawdown?: number | null;
    week52Range?: number | null;
    macdHistogram?: number | null;
    macd?: number | null;
    macdSignal?: number | null;
}): number {
    return scoreTechnicalsDetailed(input).score;
}

export function scoreTechnicalsDetailed(input: {
    lastClose: number | null;
    sma50: number | null;
    sma200: number | null;
    rsi14: number | null;
    mom12_1?: number | null;
    adx14?: number | null;
    volumeRatio?: number | null;
    week52HighRatio?: number | null;
    relMomentum?: number | null;
    volatility?: number | null;
    maxDrawdown?: number | null;
    week52Range?: number | null;
    macdHistogram?: number | null;
    macd?: number | null;
    macdSignal?: number | null;
}): {
    score: number;
    components: TechnicalSnapshot['components'];
    weightsUsed: TechnicalSnapshot['weightsUsed'];
} {
    void input.macdHistogram;
    void input.macd;
    void input.macdSignal;
    const components: TechnicalSnapshot['components'] = {
        mom12_1: scoreMom12_1(input.mom12_1 ?? null),
        relMomentum: scoreRelMomentum(input.relMomentum ?? null),
        priceVsSma200: scorePriceVsSma200(input.lastClose, input.sma200),
        smaCross: scoreSmaCross(input.sma50, input.sma200),
        week52High: scoreWeek52HighRatio(input.week52HighRatio ?? null),
        week52Range: scoreWeek52Range(input.week52Range ?? null),
        rsi: scoreRsiRegime(input.rsi14, input.adx14 ?? null, input.lastClose, input.sma200),
        volume: scoreRelVolume(input.volumeRatio ?? null),
        volatility: scoreVolatility(input.volatility ?? null),
        drawdown: scoreDrawdown(input.maxDrawdown ?? null),
    };
    const parts: { key: keyof typeof TECH_WEIGHTS; score: number; weight: number }[] = [];
    (Object.keys(TECH_WEIGHTS) as (keyof typeof TECH_WEIGHTS)[]).forEach((key) => {
        const s = components[key];
        if (s != null && Number.isFinite(s)) parts.push({ key, score: s, weight: TECH_WEIGHTS[key] });
    });
    const weightsUsed = emptyTechWeights();
    if (!parts.length) return { score: 5, components, weightsUsed };
    const sumW = parts.reduce((a, p) => a + p.weight, 0);
    let raw = 0;
    for (const p of parts) {
        const w = p.weight / sumW;
        weightsUsed[p.key] = Math.round(w * 1000) / 1000;
        raw += p.score * w;
    }
    return { score: Math.round(clamp(raw) * 10) / 10, components, weightsUsed };
}

export function computeTechnicals(bars: OhlcvBar[], opts: { benchmarkCloses?: number[] | null } = {}): TechnicalSnapshot {
    const closes = bars.map((b) => b.close).filter((c) => Number.isFinite(c));
    const vols = bars.map((b) => b.volume).filter((v) => Number.isFinite(v) && v > 0);
    const lastClose = closes.length ? closes[closes.length - 1] : null;
    const rsi14 = rsi(closes, 14);
    const macdVal = macd(closes, 12, 26, 9);
    const sma50 = sma(closes, 50);
    const sma200 = sma(closes, 200);
    const mom12_1 = momentum12_1(closes);
    const adx14 = adxWilder(bars, 14);
    const v5 = sma(vols, 5);
    const v20 = sma(vols, 20);
    const volumeRatio = v5 != null && v20 != null && v20 > 0 ? v5 / v20 : null;
    const w52 = week52HighRatio(bars);
    const range52 = week52RangePosition(bars);
    const vol = realizedVolatility(closes);
    const mdd = maxDrawdown(closes);
    // Relative momentum: stock 12-1 vs the benchmark's same-window return.
    // windowReturn uses the full window (not skip-month) so both sides of the
    // comparison measure the same period.
    const marketReturn = opts.benchmarkCloses?.length ? windowReturn(opts.benchmarkCloses) : null;
    const relMomentum =
        mom12_1 != null && marketReturn != null ? mom12_1 - marketReturn : null;
    const detailed = scoreTechnicalsDetailed({
        lastClose,
        sma50,
        sma200,
        rsi14,
        mom12_1,
        adx14,
        volumeRatio,
        week52HighRatio: w52,
        relMomentum,
        volatility: vol,
        maxDrawdown: mdd,
        week52Range: range52,
    });
    return {
        rsi14: rsi14 != null ? Math.round(rsi14 * 100) / 100 : null,
        macd: macdVal ? Math.round(macdVal.macd * 1000) / 1000 : null,
        macdSignal: macdVal ? Math.round(macdVal.signal * 1000) / 1000 : null,
        macdHistogram: macdVal ? Math.round(macdVal.histogram * 1000) / 1000 : null,
        sma50: sma50 != null ? Math.round(sma50 * 100) / 100 : null,
        sma200: sma200 != null ? Math.round(sma200 * 100) / 100 : null,
        lastClose,
        mom12_1: mom12_1 != null ? Math.round(mom12_1 * 1000) / 1000 : null,
        adx14: adx14 != null ? Math.round(adx14 * 100) / 100 : null,
        volumeRatio: volumeRatio != null ? Math.round(volumeRatio * 1000) / 1000 : null,
        week52HighRatio: w52 != null ? Math.round(w52 * 1000) / 1000 : null,
        week52Range: range52 != null ? Math.round(range52 * 1000) / 1000 : null,
        realizedVol: vol != null ? Math.round(vol * 1000) / 1000 : null,
        maxDrawdown: mdd != null ? Math.round(mdd * 1000) / 1000 : null,
        relMomentum: relMomentum != null ? Math.round(relMomentum * 1000) / 1000 : null,
        score: detailed.score,
        components: detailed.components,
        weightsUsed: detailed.weightsUsed,
    };
}
