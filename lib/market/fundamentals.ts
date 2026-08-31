/**
 * Fundamental pillar — grouped weights, skip missing, never equal-weight 52w.
 * 52w lives in technicals (continuation). Quality/value/growth/cash/safety
 * come from Yahoo modules already fetched.
 */

export const FUND_GROUP_WEIGHTS = {
    value: 0.3,
    profitability: 0.35,
    cash: 0.15,
    safety: 0.12,
    growth: 0.08,
} as const;

export interface FundamentalInputs {
    trailingPE?: number | null;
    forwardPE?: number | null;
    priceToBook?: number | null;
    returnOnEquity?: number | null;
    returnOnAssets?: number | null;
    profitMargins?: number | null;
    operatingMargins?: number | null;
    grossMargins?: number | null;
    debtToEquity?: number | null;
    currentRatio?: number | null;
    freeCashflow?: number | null;
    operatingCashflow?: number | null;
    netIncomeToCommon?: number | null;
    enterpriseToEbitda?: number | null;
    marketCap?: number | null;
    earningsGrowth?: number | null;
    revenueGrowth?: number | null;
    name?: string | null;
    quoteType?: string | null;
    symbol?: string | null;
}

export interface FundamentalSnapshot {
    trailingPE: number | null;
    forwardPE: number | null;
    priceToBook: number | null;
    returnOnEquity: number | null;
    returnOnAssets: number | null;
    profitMargins: number | null;
    operatingMargins: number | null;
    grossMargins: number | null;
    debtToEquity: number | null;
    currentRatio: number | null;
    freeCashflow: number | null;
    operatingCashflow: number | null;
    fcfYield: number | null;
    enterpriseToEbitda: number | null;
    earningsGrowth: number | null;
    revenueGrowth: number | null;
    score: number;
    usedFields: string[];
    groupScores: {
        value: number | null;
        profitability: number | null;
        cash: number | null;
        safety: number | null;
        growth: number | null;
    };
    weightsUsed: {
        value: number;
        profitability: number;
        cash: number;
        safety: number;
        growth: number;
    };
}

function clamp(n: number, min = 0, max = 10): number {
    return Math.min(max, Math.max(min, n));
}

function finite(n: unknown): n is number {
    return typeof n === 'number' && Number.isFinite(n);
}

function winsor(n: number, lo: number, hi: number): number {
    return Math.min(hi, Math.max(lo, n));
}

function asPct(n: number): number {
    return Math.abs(n) <= 1.5 ? n * 100 : n;
}

function scorePE(pe: number): number {
    const w = winsor(pe, 0, 80);
    if (w <= 0) return 2;
    if (w <= 15) return 8.5;
    if (w <= 25) return 7;
    if (w <= 40) return 5;
    if (w <= 60) return 3.5;
    return 2.5;
}

function scorePB(pb: number): number {
    const w = winsor(pb, 0, 20);
    if (w <= 0) return 2;
    if (w <= 1) return 8.5;
    if (w <= 3) return 7;
    if (w <= 8) return 5;
    return 3;
}

function scoreEVEBITDA(ev: number): number {
    const w = winsor(ev, 0.1, 80);
    if (w <= 10) return 8.5;
    if (w <= 15) return 7;
    if (w <= 25) return 5;
    return 3;
}

function scoreROE(roe: number): number {
    const pct = asPct(roe);
    if (pct >= 20) return 9;
    if (pct >= 10) return 7;
    if (pct >= 5) return 5.5;
    if (pct >= 0) return 3.5;
    return 2;
}

function scoreROA(roa: number): number {
    return scoreROE(roa);
}

function scoreMargins(m: number): number {
    const pct = asPct(m);
    if (pct >= 20) return 9;
    if (pct >= 10) return 7;
    if (pct >= 0) return 5;
    return 2;
}

function scoreDE(de: number): number {
    const ratio = de > 10 ? de / 100 : de;
    if (ratio < 0) return 4;
    if (ratio <= 0.5) return 8.5;
    if (ratio <= 1) return 7;
    if (ratio <= 2) return 5;
    return 3;
}

function scoreCurrentRatio(cr: number): number {
    if (cr >= 1.5) return 8;
    if (cr >= 1) return 6.5;
    if (cr >= 0.8) return 4;
    return 2.5;
}

function scoreFcfYield(y: number): number {
    if (y < 0) return 2.5;
    if (y >= 0.08) return 9;
    if (y >= 0.04) return 7.5;
    if (y >= 0.02) return 6;
    return 4.5;
}

function scoreGrowth(g: number): number {
    const pct = asPct(g);
    if (pct >= 20) return 9;
    if (pct >= 10) return 7.5;
    if (pct >= 0) return 5.5;
    return 2.5;
}

export function isBankLike(input: {
    name?: string | null;
    quoteType?: string | null;
    symbol?: string | null;
    currentRatio?: number | null;
    debtToEquity?: number | null;
}): boolean {
    const name = (input.name || '').toLowerCase();
    const qt = (input.quoteType || '').toLowerCase();
    const sym = (input.symbol || '').toLowerCase();
    if (/\bbank\b/.test(name) || qt.includes('bank') || /(^|\.)(jpm|bac|wfc|c|td|ry|hdb|sbi)(\.|$)/.test(sym)) {
        return true;
    }
    const crMissing = !finite(input.currentRatio);
    const de = input.debtToEquity;
    if (crMissing && finite(de)) {
        const ratio = de > 10 ? de / 100 : de;
        if (de > 200 || ratio > 5) return true;
    }
    return false;
}

function mean(xs: number[]): number | null {
    if (!xs.length) return null;
    return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function computeFundamentals(input: FundamentalInputs): FundamentalSnapshot {
    const used: string[] = [];
    const trailingPE = finite(input.trailingPE) ? input.trailingPE : null;
    const forwardPE = finite(input.forwardPE) ? input.forwardPE : null;
    const priceToBook = finite(input.priceToBook) ? input.priceToBook : null;
    const returnOnEquity = finite(input.returnOnEquity) ? input.returnOnEquity : null;
    const returnOnAssets = finite(input.returnOnAssets) ? input.returnOnAssets : null;
    const profitMargins = finite(input.profitMargins) ? input.profitMargins : null;
    const operatingMargins = finite(input.operatingMargins) ? input.operatingMargins : null;
    const grossMargins = finite(input.grossMargins) ? input.grossMargins : null;
    const debtToEquity = finite(input.debtToEquity) ? input.debtToEquity : null;
    const currentRatio = finite(input.currentRatio) ? input.currentRatio : null;
    const freeCashflow = finite(input.freeCashflow) ? input.freeCashflow : null;
    const operatingCashflow = finite(input.operatingCashflow) ? input.operatingCashflow : null;
    const netIncomeToCommon = finite(input.netIncomeToCommon) ? input.netIncomeToCommon : null;
    const enterpriseToEbitda = finite(input.enterpriseToEbitda) ? input.enterpriseToEbitda : null;
    const marketCap = finite(input.marketCap) ? input.marketCap : null;
    const earningsGrowth = finite(input.earningsGrowth) ? input.earningsGrowth : null;
    const revenueGrowth = finite(input.revenueGrowth) ? input.revenueGrowth : null;

    const fcfYield =
        freeCashflow != null && marketCap != null && marketCap > 0 ? freeCashflow / marketCap : null;

    // --- Value 30% ---
    const valueParts: number[] = [];
    const evOk = enterpriseToEbitda != null && enterpriseToEbitda > 0;
    const peOk = trailingPE != null && trailingPE > 0;
    if (evOk) {
        valueParts.push(scoreEVEBITDA(enterpriseToEbitda));
        used.push('enterpriseToEbitda');
    } else if (peOk) {
        valueParts.push(scorePE(trailingPE));
        used.push('trailingPE');
    }
    if (priceToBook != null && priceToBook > 0) {
        valueParts.push(scorePB(priceToBook));
        used.push('priceToBook');
    }
    let valueScore: number | null = null;
    if (valueParts.length === 1) valueScore = valueParts[0];
    else if (valueParts.length >= 2) {
        // P/B is 1/3 of value; primary multiple is 2/3.
        const pb = priceToBook != null && priceToBook > 0 ? scorePB(priceToBook) : null;
        const primary = evOk ? scoreEVEBITDA(enterpriseToEbitda!) : peOk ? scorePE(trailingPE!) : null;
        if (primary != null && pb != null) valueScore = (2 / 3) * primary + (1 / 3) * pb;
        else valueScore = mean(valueParts);
    }

    // --- Profitability 35% ---
    const profitParts: number[] = [];
    if (returnOnEquity != null) {
        profitParts.push(scoreROE(returnOnEquity));
        used.push('returnOnEquity');
    }
    if (returnOnAssets != null) {
        profitParts.push(scoreROA(returnOnAssets));
        used.push('returnOnAssets');
    }
    if (operatingMargins != null) {
        profitParts.push(scoreMargins(operatingMargins));
        used.push('operatingMargins');
    } else if (grossMargins != null) {
        profitParts.push(scoreMargins(grossMargins));
        used.push('grossMargins');
    } else if (profitMargins != null) {
        profitParts.push(scoreMargins(profitMargins));
        used.push('profitMargins');
    }
    const profitabilityScore = mean(profitParts);

    // --- Cash 15% ---
    const cashParts: number[] = [];
    if (fcfYield != null) {
        cashParts.push(scoreFcfYield(fcfYield));
        used.push('fcfYield');
    }
    if (operatingCashflow != null && netIncomeToCommon != null) {
        cashParts.push(operatingCashflow >= netIncomeToCommon ? 8 : 4);
        used.push('accrual');
    }
    const cashScore = mean(cashParts);

    // --- Safety 12% (skip banks) ---
    let safetyScore: number | null = null;
    if (!isBankLike(input)) {
        const safetyParts: number[] = [];
        if (debtToEquity != null) {
            safetyParts.push(scoreDE(debtToEquity));
            used.push('debtToEquity');
        }
        if (currentRatio != null) {
            safetyParts.push(scoreCurrentRatio(currentRatio));
            used.push('currentRatio');
        }
        safetyScore = mean(safetyParts);
    }

    // --- Growth 8%: earnings else revenue ---
    let growthScore: number | null = null;
    if (earningsGrowth != null) {
        growthScore = scoreGrowth(earningsGrowth);
        used.push('earningsGrowth');
    } else if (revenueGrowth != null) {
        growthScore = scoreGrowth(revenueGrowth);
        used.push('revenueGrowth');
    }

    const groupScores = {
        value: valueScore,
        profitability: profitabilityScore,
        cash: cashScore,
        safety: safetyScore,
        growth: growthScore,
    };

    const parts: { key: keyof typeof FUND_GROUP_WEIGHTS; score: number; weight: number }[] = [];
    (Object.keys(FUND_GROUP_WEIGHTS) as (keyof typeof FUND_GROUP_WEIGHTS)[]).forEach((key) => {
        const s = groupScores[key];
        if (s != null && Number.isFinite(s)) parts.push({ key, score: s, weight: FUND_GROUP_WEIGHTS[key] });
    });

    const weightsUsed = { value: 0, profitability: 0, cash: 0, safety: 0, growth: 0 };
    let score = 5;
    if (parts.length) {
        const sumW = parts.reduce((a, p) => a + p.weight, 0);
        let raw = 0;
        for (const p of parts) {
            const w = p.weight / sumW;
            weightsUsed[p.key] = Math.round(w * 1000) / 1000;
            raw += p.score * w;
        }
        score = Math.round(clamp(raw) * 10) / 10;
    }

    return {
        trailingPE,
        forwardPE,
        priceToBook,
        returnOnEquity,
        returnOnAssets,
        profitMargins,
        operatingMargins,
        grossMargins,
        debtToEquity,
        currentRatio,
        freeCashflow,
        operatingCashflow,
        fcfYield: fcfYield != null ? Math.round(fcfYield * 10000) / 10000 : null,
        enterpriseToEbitda,
        earningsGrowth,
        revenueGrowth,
        score,
        usedFields: used,
        groupScores: {
            value: valueScore != null ? Math.round(valueScore * 10) / 10 : null,
            profitability: profitabilityScore != null ? Math.round(profitabilityScore * 10) / 10 : null,
            cash: cashScore != null ? Math.round(cashScore * 10) / 10 : null,
            safety: safetyScore != null ? Math.round(safetyScore * 10) / 10 : null,
            growth: growthScore != null ? Math.round(growthScore * 10) / 10 : null,
        },
        weightsUsed,
    };
}
