/**
 * Third-party analyst consensus as INPUT data, not Orbitfolio advice.
 * 70% inverted recommendationMean (1=strong buy → ~10, 5=sell → ~0),
 * 20% target upside capped ±40%, 10% shrink toward 5 if n < 5.
 */

export interface RecommendationTrendPeriod {
    period?: string;
    strongBuy?: number;
    buy?: number;
    hold?: number;
    sell?: number;
    strongSell?: number;
}

export interface AnalystSnapshot {
    score: number | null;
    meanScore: number | undefined;
    recommendationMean: number | undefined;
    targetMean: number | undefined;
    targetUpside: number | undefined;
    recommendationKey: string | undefined;
    numberOfAnalysts: number | undefined;
    counts: {
        strongBuy: number;
        buy: number;
        hold: number;
        sell: number;
        strongSell: number;
    } | null;
    available: boolean;
}

function clamp(n: number, min = 0, max = 10): number {
    return Math.min(max, Math.max(min, n));
}

export function pickCurrentTrend(
    trend: RecommendationTrendPeriod[] | undefined | null
): RecommendationTrendPeriod | null {
    if (!trend || trend.length === 0) return null;
    const current = trend.find((t) => t.period === '0m') ?? trend[0];
    return current ?? null;
}

function invertRecommendationMean(mean: number): number {
    // Yahoo 1 = strong buy, 5 = sell.
    const m = Math.min(5, Math.max(1, mean));
    return ((5 - m) / 4) * 10;
}

function scoreFromKey(key: string | undefined): number | null {
    if (!key) return null;
    const k = key.trim().toLowerCase().replace(/[\s-]+/g, '_');
    const map: Record<string, number> = {
        strong_buy: 10,
        buy: 7.5,
        outperform: 8,
        overweight: 8,
        accumulate: 7.5,
        long: 7.5,
        hold: 5,
        neutral: 5,
        equal_weight: 5,
        market_perform: 5,
        sector_perform: 5,
        underperform: 2.5,
        underweight: 2.5,
        reduce: 2.5,
        sell: 2.5,
        strong_sell: 0,
    };
    return map[k] ?? null;
}

export function parseAverageAnalystRating(raw: string | null | undefined): {
    mean: number | undefined;
    key: string | undefined;
} {
    if (!raw) return { mean: undefined, key: undefined };
    const m = raw.trim().match(/^([0-9]+(?:\.[0-9]+)?)\s*[-–]\s*(.+)$/);
    if (m) {
        const n = Number(m[1]);
        const key = m[2].trim().toLowerCase().replace(/\s+/g, '_');
        return { mean: Number.isFinite(n) ? n : undefined, key };
    }
    const key = raw.trim().toLowerCase().replace(/\s+/g, '_');
    return { mean: undefined, key: key || undefined };
}

function trendToScore(counts: {
    strongBuy: number;
    buy: number;
    hold: number;
    sell: number;
    strongSell: number;
}): number | null {
    const total = counts.strongBuy + counts.buy + counts.hold + counts.sell + counts.strongSell;
    if (total <= 0) return null;
    const weighted =
        (counts.strongBuy * 10 + counts.buy * 7.5 + counts.hold * 5 + counts.sell * 2.5 + counts.strongSell * 0) /
        total;
    return clamp(weighted);
}

export function scoreAnalystConsensus(
    trend: RecommendationTrendPeriod[] | undefined | null,
    extras?: {
        targetMean?: number | null;
        recommendationKey?: string | null;
        numberOfAnalystOpinions?: number | null;
        recommendationMean?: number | null;
        lastPrice?: number | null;
        averageAnalystRating?: string | null;
    }
): AnalystSnapshot {
    const current = pickCurrentTrend(trend);
    const counts = current
        ? {
              strongBuy: current.strongBuy ?? 0,
              buy: current.buy ?? 0,
              hold: current.hold ?? 0,
              sell: current.sell ?? 0,
              strongSell: current.strongSell ?? 0,
          }
        : null;

    const total = counts
        ? counts.strongBuy + counts.buy + counts.hold + counts.sell + counts.strongSell
        : 0;

    const numberOfAnalysts =
        extras?.numberOfAnalystOpinions != null && Number.isFinite(extras.numberOfAnalystOpinions)
            ? extras.numberOfAnalystOpinions
            : total > 0
              ? total
              : undefined;

    const targetMean =
        extras?.targetMean != null && Number.isFinite(extras.targetMean) ? extras.targetMean : undefined;

    const parsedAvg = parseAverageAnalystRating(extras?.averageAnalystRating);
    const recommendationKey = extras?.recommendationKey || parsedAvg.key || undefined;
    let recommendationMean =
        extras?.recommendationMean != null && Number.isFinite(extras.recommendationMean)
            ? extras.recommendationMean
            : undefined;
    if (recommendationMean == null && parsedAvg.mean != null) {
        recommendationMean = parsedAvg.mean;
    }

    const lastPrice = extras?.lastPrice != null && Number.isFinite(extras.lastPrice) ? extras.lastPrice : null;

    let meanComponent: number | null = null;
    if (recommendationMean != null) {
        meanComponent = invertRecommendationMean(recommendationMean);
    }
    if (meanComponent == null && total > 0 && counts) {
        meanComponent = trendToScore(counts);
    }
    if (meanComponent == null) {
        meanComponent = scoreFromKey(recommendationKey);
    }

    let upside: number | undefined;
    let upsideComponent: number | null = null;
    if (targetMean != null && lastPrice != null && lastPrice > 0) {
        upside = (targetMean - lastPrice) / lastPrice;
        const capped = Math.max(-0.4, Math.min(0.4, upside));
        upsideComponent = clamp(5 + (capped / 0.4) * 5);
    }

    const coverageComponent = numberOfAnalysts != null ? (numberOfAnalysts < 5 ? 5 : 7) : null;

    const parts: { score: number; weight: number }[] = [];
    if (meanComponent != null) parts.push({ score: meanComponent, weight: 0.7 });
    if (upsideComponent != null) parts.push({ score: upsideComponent, weight: 0.2 });
    if (coverageComponent != null) parts.push({ score: coverageComponent, weight: 0.1 });

    let score: number | null = null;
    if (parts.length) {
        const sumW = parts.reduce((a, p) => a + p.weight, 0);
        const raw = parts.reduce((a, p) => a + p.score * (p.weight / sumW), 0);
        score = Math.round(clamp(raw) * 10) / 10;
    }

    const meanScore = meanComponent != null ? Math.round(meanComponent * 10) / 10 : undefined;

    return {
        score,
        meanScore,
        recommendationMean,
        targetMean,
        targetUpside: upside != null ? Math.round(upside * 1000) / 1000 : undefined,
        recommendationKey,
        numberOfAnalysts,
        counts,
        available: score != null,
    };
}
