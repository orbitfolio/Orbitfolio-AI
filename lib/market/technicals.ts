/**
 * Pure technicals from 1y daily OHLCV → 0-10 technical pillar.
 *
 * SMA+MACD overlap and mean-reversion RSI were insufficient. MACD stays on the
 * snapshot for charts only and is NOT scored. 12-1 momentum, price vs SMA200,
 * 52w-high continuation, ADX-gated RSI, and relative volume are scored instead.
 */

export interface OhlcvBar {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export const TECH_WEIGHTS = {
    mom12_1: 0.28,
    priceVsSma200: 0.22,
    smaCross: 0.12,
    week52High: 0.18,
    rsi: 0.12,
    volume: 0.08,
} as const;

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
    score: number;
    components: {
        mom12_1: number | null;
        priceVsSma200: number | null;
        smaCross: number | null;
        week52High: number | null;
        rsi: number | null;
        volume: number | null;
    };
    weightsUsed: {
        mom12_1: number;
        priceVsSma200: number;
        smaCross: number;
        week52High: number;
        rsi: number;
        volume: number;
    };
}

export function sma(values: number[], period: number): number | null {
    if (values.length < period || period <= 0) return null;
    const slice = values.slice(-period);
    const sum = slice.reduce((a, b) => a + b, 0);
    return sum / period;
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

/** Wilder RSI(period). Returns the last RSI or null if insufficient data. */
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
    return { mom12_1: 0, priceVsSma200: 0, smaCross: 0, week52High: 0, rsi: 0, volume: 0 };
}

/**
 * Weighted technical pillar. MACD is ignored even if passed (chart only).
 * Missing components renormalize.
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
        priceVsSma200: scorePriceVsSma200(input.lastClose, input.sma200),
        smaCross: scoreSmaCross(input.sma50, input.sma200),
        week52High: scoreWeek52HighRatio(input.week52HighRatio ?? null),
        rsi: scoreRsiRegime(input.rsi14, input.adx14 ?? null, input.lastClose, input.sma200),
        volume: scoreRelVolume(input.volumeRatio ?? null),
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

export function computeTechnicals(bars: OhlcvBar[]): TechnicalSnapshot {
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
    const detailed = scoreTechnicalsDetailed({
        lastClose,
        sma50,
        sma200,
        rsi14,
        mom12_1,
        adx14,
        volumeRatio,
        week52HighRatio: w52,
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
        score: detailed.score,
        components: detailed.components,
        weightsUsed: detailed.weightsUsed,
    };
}
