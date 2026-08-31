/**
 * Orchestrates Yahoo fetch + pillar scores + optional Groq rationale.
 * Research labels stay Robust…Fragile. Client action (Buy/Hold/Sell) is derived from orbitScore.
 */

import { GuidanceSchema, StockAnalysisSchema, type StockAnalysis } from '../ai/schemas';
import { GroqClient } from '../ai/core/groq-client';
import { getStockAnalysisPrompt } from '../ai/prompts/stock-analysis';
import { computeTechnicals } from './technicals';
import { computeFundamentals } from './fundamentals';
import { scoreAnalystConsensus } from './analyst';
import { buildTemplateRationale, combineRating, healthRatingFromScore } from './rating';
import {
    ANALYSIS_TTL_SECONDS,
    QUOTE_TTL_SECONDS,
    STALE_ANALYSIS_TTL_SECONDS,
    STALE_QUOTE_TTL_SECONDS,
    analysisCacheKey,
    cacheGet,
    cacheSet,
    quoteCacheKey,
    quotesCacheKey,
    rationaleCacheKey,
    staleAnalysisCacheKey,
    staleQuoteCacheKey,
} from './cache';
import {
    fetchChart,
    fetchQuoteSummary,
    fetchQuotes,
    normalizeSymbol,
    type ChartResult,
    type QuoteSummaryBits,
    type YahooQuote,
} from './yahoo';
import {
    applyOfflineMark,
    applyStaleMark,
    chooseAnalysisFallback,
    OFFLINE_NOTE,
    type AnalysisMeta,
} from './fallback';
import { getOfflineSeed, quoteFromSeed, scaleBarsToPrice } from './offline-seed';

export interface HoldingAnalysisView {
    analysis: StockAnalysis;
    quote: YahooQuote;
    technicals: {
        rsi14: number | null;
        macd: number | null;
        macdSignal: number | null;
        macdHistogram: number | null;
        sma50: number | null;
        sma200: number | null;
        mom12_1: number | null;
        adx14: number | null;
        volumeRatio: number | null;
        week52HighRatio: number | null;
        components?: Record<string, number | null>;
        weightsUsed?: Record<string, number>;
    };
    fundamentals: {
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
        usedFields: string[];
        groupScores?: Record<string, number | null>;
        weightsUsed?: Record<string, number>;
    };
    rationaleSource: 'groq' | 'template';
    meta?: AnalysisMeta;
}

function groqEnabled(): boolean {
    return Boolean(process.env.GROQ_API_KEY);
}

function rationaleHasBannedLanguage(text: string, action: string): boolean {
    if (/\b(trim|accumulate)\b/i.test(text)) return true;
    const allowed = action.toLowerCase();
    const verbs = text.match(/\b(buy|sell|hold)\b/gi) ?? [];
    return verbs.some((v) => v.toLowerCase() !== allowed);
}

async function maybeRationale(input: {
    symbol: string;
    label: string;
    action: 'Buy' | 'Hold' | 'Sell';
    orbitScore: number;
    technical: number;
    fundamental: number;
    analystConsensus: number;
    analystAvailable: boolean;
    rsi: number | null;
    pe: number | null;
    financialBlob: string;
}): Promise<{ text: string; source: 'groq' | 'template' }> {
    const fallback = buildTemplateRationale({
        symbol: input.symbol,
        label: input.label as 'Robust' | 'Constructive' | 'Mixed' | 'Cautious' | 'Fragile',
        action: input.action,
        orbitScore: input.orbitScore,
        technical: input.technical,
        fundamental: input.fundamental,
        analystConsensus: input.analystConsensus,
        analystAvailable: input.analystAvailable,
        rsi: input.rsi,
        pe: input.pe,
    });

    if (!groqEnabled()) return { text: fallback, source: 'template' };

    const cacheKey = rationaleCacheKey(input.symbol, input.orbitScore);
    const cached = await cacheGet<string>(cacheKey);
    if (cached) return { text: cached, source: 'groq' };

    try {
        const client = new GroqClient({
            model: 'llama-3.3-70b-versatile',
            temperature: 0.3,
            maxTokens: 400,
        });
        const prompt = getStockAnalysisPrompt(input.symbol, input.financialBlob);
        const response = await client.simpleComplete(
            prompt,
            `Respond with JSON only. You may mention the client action ${input.action} if it matches the computed action. Do not invent trim/accumulate or a different Buy/Hold/Sell.`
        );
        if (!response.content) return { text: fallback, source: 'template' };
        let parsed: { rationale?: string } | null = null;
        try {
            parsed = JSON.parse(response.content);
        } catch {
            parsed = null;
        }
        const text =
            parsed?.rationale && typeof parsed.rationale === 'string'
                ? parsed.rationale
                : fallback;
        const safe = rationaleHasBannedLanguage(text, input.action) ? fallback : text;
        await cacheSet(cacheKey, safe, ANALYSIS_TTL_SECONDS);
        return { text: safe, source: 'groq' };
    } catch (err) {
        console.warn('[analyze] Groq rationale failed, using template', err);
        return { text: fallback, source: 'template' };
    }
}

function hasPrice(q: YahooQuote | null | undefined): q is YahooQuote {
    return Boolean(q && q.price != null && Number.isFinite(q.price));
}

async function rememberQuote(sym: string, quote: YahooQuote): Promise<void> {
    if (!hasPrice(quote)) return;
    await cacheSet(quoteCacheKey(sym), quote, QUOTE_TTL_SECONDS);
    await cacheSet(staleQuoteCacheKey(sym), quote, STALE_QUOTE_TTL_SECONDS);
}

export async function getCachedQuotes(symbols: string[]): Promise<YahooQuote[]> {
    const unique = [...new Set(symbols.map(normalizeSymbol).filter(Boolean))];
    if (unique.length === 0) return [];
    const batchKey = quotesCacheKey(unique);
    const cachedBatch = await cacheGet<YahooQuote[]>(batchKey);
    if (cachedBatch && cachedBatch.some(hasPrice)) return cachedBatch;

    const out: YahooQuote[] = [];
    const missing: string[] = [];
    for (const sym of unique) {
        const one =
            (await cacheGet<YahooQuote>(quoteCacheKey(sym))) ??
            (await cacheGet<YahooQuote>(staleQuoteCacheKey(sym)));
        if (hasPrice(one)) out.push(one);
        else missing.push(sym);
    }
    if (missing.length) {
        const fetched = await fetchQuotes(missing);
        for (const q of fetched) {
            if (hasPrice(q)) {
                await rememberQuote(q.symbol, q);
            }
            out.push(q);
        }
    }
    if (out.some(hasPrice)) {
        await cacheSet(batchKey, out, QUOTE_TTL_SECONDS);
    }
    return out;
}

async function persistAnalysis(sym: string, view: HoldingAnalysisView): Promise<void> {
    await cacheSet(analysisCacheKey(sym), view, ANALYSIS_TTL_SECONDS);
    await cacheSet(staleAnalysisCacheKey(sym), view, STALE_ANALYSIS_TTL_SECONDS);
    if (view.quote) await rememberQuote(sym, view.quote);
}

async function buildViewFromChart(
    sym: string,
    chart: ChartResult,
    summary: QuoteSummaryBits | null,
    opts: { skipGroq?: boolean; rationalePrefix?: string; source?: string; stale?: boolean }
): Promise<HoldingAnalysisView> {
    const technicals = computeTechnicals(chart.bars);
    const fundamentals = computeFundamentals({
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
        name: summary?.shortName || summary?.longName || chart.quote.name,
        quoteType: summary?.quoteType,
        symbol: sym,
    });
    const analyst = scoreAnalystConsensus(summary?.recommendationTrend, {
        targetMean: summary?.targetMean,
        recommendationKey: summary?.recommendationKey,
        numberOfAnalystOpinions: summary?.numberOfAnalystOpinions,
        recommendationMean: summary?.recommendationMean,
        lastPrice: summary?.lastPrice ?? chart.quote.price,
        averageAnalystRating: summary?.averageAnalystRating,
    });

    const combined = combineRating({
        technical: technicals.score,
        fundamental: fundamentals.score,
        analystConsensus: analyst.available ? analyst.score : null,
    });

    const quote: YahooQuote = {
        ...chart.quote,
        name: summary?.shortName || summary?.longName || chart.quote.name,
        fiftyTwoWeekHigh: summary?.fiftyTwoWeekHigh ?? chart.quote.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: summary?.fiftyTwoWeekLow ?? chart.quote.fiftyTwoWeekLow,
        price: chart.quote.price ?? summary?.lastPrice ?? null,
    };

    let rationale: string;
    let source: 'groq' | 'template';
    if (opts.skipGroq) {
        rationale = buildTemplateRationale({
            symbol: sym,
            label: combined.label,
            action: combined.action,
            orbitScore: combined.orbitScore,
            technical: combined.pillars.technical,
            fundamental: combined.pillars.fundamental,
            analystConsensus: combined.pillars.analystConsensus,
            analystAvailable: analyst.available,
            rsi: technicals.rsi14,
            pe: fundamentals.trailingPE,
        });
        source = 'template';
    } else {
        const r = await maybeRationale({
            symbol: sym,
            label: combined.label,
            action: combined.action,
            orbitScore: combined.orbitScore,
            technical: combined.pillars.technical,
            fundamental: combined.pillars.fundamental,
            analystConsensus: combined.pillars.analystConsensus,
            analystAvailable: analyst.available,
            rsi: technicals.rsi14,
            pe: fundamentals.trailingPE,
            financialBlob: JSON.stringify({
                quote,
                technicals: {
                    rsi14: technicals.rsi14,
                    macd: technicals.macd,
                    sma50: technicals.sma50,
                    sma200: technicals.sma200,
                    mom12_1: technicals.mom12_1,
                    adx14: technicals.adx14,
                    volumeRatio: technicals.volumeRatio,
                    week52HighRatio: technicals.week52HighRatio,
                    score: technicals.score,
                    note: 'MACD is chart-only and not in the technical score',
                },
                fundamentals,
                analyst: {
                    score: analyst.score,
                    recommendationKey: analyst.recommendationKey,
                    numberOfAnalysts: analyst.numberOfAnalysts,
                    targetMean: analyst.targetMean,
                    note: 'Third-party analyst consensus — not Orbitfolio advice',
                },
                guidance: combined,
            }),
        });
        rationale = r.text;
        source = r.source;
    }

    if (opts.rationalePrefix && !rationale.toLowerCase().includes(opts.rationalePrefix.toLowerCase())) {
        rationale = `${opts.rationalePrefix}. ${rationale}`;
    }

    const guidance = GuidanceSchema.parse({
        orbitScore: combined.orbitScore,
        label: combined.label,
        action: combined.action,
        pillars: combined.pillars,
        rationale,
        analystRaw: {
            meanScore: analyst.meanScore,
            recommendationMean: analyst.recommendationMean,
            targetMean: analyst.targetMean,
            recommendationKey: analyst.recommendationKey,
            numberOfAnalysts: analyst.numberOfAnalysts,
        },
        weightsUsed: combined.weightsUsed,
        analystAvailable: combined.analystAvailable,
    });

    const analysis = StockAnalysisSchema.parse({
        symbol: sym,
        orbitScore: combined.orbitScore,
        breakdown: {
            technical: combined.pillars.technical,
            fundamental: combined.pillars.fundamental,
            sentiment: 5,
            risk: Math.round((10 - combined.orbitScore) * 10) / 10,
        },
        guidance,
        opportunities: [],
        risks: [],
        generatedAt: new Date().toISOString(),
    });

    return {
        analysis,
        quote,
        technicals: {
            rsi14: technicals.rsi14,
            macd: technicals.macd,
            macdSignal: technicals.macdSignal,
            macdHistogram: technicals.macdHistogram,
            sma50: technicals.sma50,
            sma200: technicals.sma200,
            mom12_1: technicals.mom12_1,
            adx14: technicals.adx14,
            volumeRatio: technicals.volumeRatio,
            week52HighRatio: technicals.week52HighRatio,
            components: technicals.components,
            weightsUsed: technicals.weightsUsed,
        },
        fundamentals: {
            trailingPE: fundamentals.trailingPE,
            forwardPE: fundamentals.forwardPE,
            priceToBook: fundamentals.priceToBook,
            returnOnEquity: fundamentals.returnOnEquity,
            returnOnAssets: fundamentals.returnOnAssets,
            profitMargins: fundamentals.profitMargins,
            operatingMargins: fundamentals.operatingMargins,
            grossMargins: fundamentals.grossMargins,
            debtToEquity: fundamentals.debtToEquity,
            currentRatio: fundamentals.currentRatio,
            freeCashflow: fundamentals.freeCashflow,
            operatingCashflow: fundamentals.operatingCashflow,
            fcfYield: fundamentals.fcfYield,
            enterpriseToEbitda: fundamentals.enterpriseToEbitda,
            earningsGrowth: fundamentals.earningsGrowth,
            revenueGrowth: fundamentals.revenueGrowth,
            usedFields: fundamentals.usedFields,
            groupScores: fundamentals.groupScores,
            weightsUsed: fundamentals.weightsUsed,
        },
        rationaleSource: source,
        meta: {
            stale: Boolean(opts.stale),
            source: opts.source ?? chart.source ?? 'yahoo',
        },
    };
}

async function lastKnownQuote(sym: string): Promise<YahooQuote | null> {
    return (
        (await cacheGet<YahooQuote>(quoteCacheKey(sym))) ??
        (await cacheGet<YahooQuote>(staleQuoteCacheKey(sym)))
    );
}

async function buildOfflineView(sym: string): Promise<HoldingAnalysisView | null> {
    const seed = getOfflineSeed(sym);
    if (!seed) return null;
    const last = await lastKnownQuote(sym);
    const bars = last?.price != null ? scaleBarsToPrice(seed.bars, last.price) : seed.bars;
    const quote = quoteFromSeed(seed, bars, last);
    const chart: ChartResult = { bars, quote, source: 'offline' };
    const view = await buildViewFromChart(sym, chart, null, {
        skipGroq: true,
        rationalePrefix: OFFLINE_NOTE,
        source: 'offline',
        stale: true,
    });
    return applyOfflineMark(view);
}

function isOfflineView(view: HoldingAnalysisView | null | undefined): boolean {
    return view?.meta?.source === 'offline';
}

export async function analyzeSymbol(symbol: string): Promise<HoldingAnalysisView> {
    const sym = normalizeSymbol(symbol);
    const cacheKey = analysisCacheKey(sym);
    const cached = await cacheGet<HoldingAnalysisView>(cacheKey);
    const cachedLive = cached && !cached.meta?.stale && !isOfflineView(cached);
    if (cachedLive) {
        return {
            ...cached,
            meta: {
                stale: false,
                source: cached.meta?.source ?? 'cache',
            },
        };
    }

    const chartP = fetchChart(sym, '1y', '1d').catch((err) => {
        console.warn('[analyze] chart failed', sym, err instanceof Error ? err.message : 'error');
        return null as ChartResult | null;
    });
    const summaryP = fetchQuoteSummary(sym).catch((err) => {
        console.warn('[analyze] quoteSummary failed', sym, err);
        return null as QuoteSummaryBits | null;
    });
    const [chart, summary] = await Promise.all([chartP, summaryP]);

    const hasLiveChart = Boolean(chart && chart.bars.length);

    if (hasLiveChart && chart) {
        const view = await buildViewFromChart(sym, chart, summary, {
            source: chart.source ?? 'yahoo',
            stale: false,
        });
        await persistAnalysis(sym, view);
        return view;
    }

    const staleRaw = await cacheGet<HoldingAnalysisView>(staleAnalysisCacheKey(sym));
    const stale = isOfflineView(staleRaw) ? null : staleRaw;
    const offline = await buildOfflineView(sym);
    const choice = chooseAnalysisFallback({
        hasLiveChart: false,
        stale,
        offline,
    });
    if (choice.kind === 'stale') {
        const marked = applyStaleMark(choice.view);
        await cacheSet(analysisCacheKey(sym), marked, QUOTE_TTL_SECONDS);
        return marked;
    }
    if (choice.kind === 'offline') {
        // Never write demo seeds into the 30-day stale cache.
        await cacheSet(analysisCacheKey(sym), choice.view, 120);
        return choice.view;
    }

    throw new Error(`No market data for ${sym}`);
}

export async function mapLimit<T, R>(
    items: T[],
    limit: number,
    fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
    const ret: R[] = new Array(items.length);
    let i = 0;
    async function worker() {
        while (i < items.length) {
            const idx = i++;
            ret[idx] = await fn(items[idx], idx);
        }
    }
    const n = Math.max(1, Math.min(limit, items.length));
    await Promise.all(Array.from({ length: n }, () => worker()));
    return ret;
}

export async function analyzePortfolio(symbols: string[]): Promise<{
    totalScore: number;
    healthRating: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
    holdings: HoldingAnalysisView[];
    errors: { symbol: string; message: string }[];
}> {
    const unique = [...new Set(symbols.map(normalizeSymbol).filter(Boolean))];
    const errors: { symbol: string; message: string }[] = [];
    const holdings = (
        await mapLimit(unique, 3, async (sym) => {
            try {
                return await analyzeSymbol(sym);
            } catch (err) {
                errors.push({
                    symbol: sym,
                    message: err instanceof Error ? err.message : 'Analysis failed',
                });
                return null;
            }
        })
    ).filter((h): h is HoldingAnalysisView => h != null);

    const totalScore =
        holdings.length === 0
            ? 0
            : Math.round(
                  (holdings.reduce((s, h) => s + h.analysis.orbitScore, 0) / holdings.length) * 10
              ) / 10;

    return {
        totalScore,
        healthRating: healthRatingFromScore(totalScore),
        holdings,
        errors,
    };
}
