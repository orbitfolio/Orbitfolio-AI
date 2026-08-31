/**
 * Server-side Yahoo Finance client (public query1/query2).
 * Next.js/undici strips User-Agent on fetch(); use node:https so UA is actually sent.
 * Global spacing queue + in-flight coalesce to avoid 429 bursts.
 */

import https from 'node:https';
import type { IncomingHttpHeaders } from 'node:http';
import type { OhlcvBar } from './technicals';
import type { RecommendationTrendPeriod } from './analyst';
import { fetchStooqChart } from './stooq';
import { isSearchableQuote } from './ticker-suggest';

const USER_AGENT =
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';

const QUERY1 = 'https://query1.finance.yahoo.com';
const QUERY2 = 'https://query2.finance.yahoo.com';
const TIMEOUT_MS = 8000;
const MIN_SPACING_MS = 320;

const STATIC_FX: Record<string, { price: number; currency: string; name: string }> = {
    'INR=X': { price: 83.5, currency: 'INR', name: 'USD/INR' },
    'CAD=X': { price: 1.36, currency: 'CAD', name: 'USD/CAD' },
};

export interface YahooQuote {
    symbol: string;
    name: string;
    price: number | null;
    previousClose: number | null;
    change: number | null;
    changePercent: number | null;
    currency: string;
    exchange: string;
    marketState: string;
    fiftyTwoWeekHigh: number | null;
    fiftyTwoWeekLow: number | null;
}

export interface YahooSearchResult {
    symbol: string;
    name: string;
    exchange: string;
    quoteType: string;
    typeDisp: string;
}

export interface QuoteSummaryBits {
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
    earningsGrowth: number | null;
    revenueGrowth: number | null;
    enterpriseToEbitda: number | null;
    enterpriseValue: number | null;
    netIncomeToCommon: number | null;
    payoutRatio: number | null;
    ebitda: number | null;
    fiftyTwoWeekHigh: number | null;
    fiftyTwoWeekLow: number | null;
    lastPrice: number | null;
    currency: string | null;
    shortName: string | null;
    longName: string | null;
    quoteType: string | null;
    recommendationKey: string | null;
    recommendationMean: number | null;
    targetMean: number | null;
    numberOfAnalystOpinions: number | null;
    recommendationTrend: RecommendationTrendPeriod[] | null;
    averageAnalystRating: string | null;
    beta: number | null;
    marketCap: number | null;
}

export interface ChartResult {
    bars: OhlcvBar[];
    quote: YahooQuote;
    source?: 'yahoo' | 'stooq' | 'offline' | 'cache';
}

function rawNumber(v: unknown): number | null {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (v && typeof v === 'object' && 'raw' in (v as Record<string, unknown>)) {
        const raw = (v as { raw?: unknown }).raw;
        if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    }
    return null;
}

function rawString(v: unknown): string | null {
    if (typeof v === 'string' && v.length) return v;
    return null;
}

export function normalizeSymbol(symbol: string): string {
    return symbol.trim().toUpperCase();
}

function logPath(url: string): string {
    try {
        return new URL(url).pathname;
    } catch {
        return 'yahoo';
    }
}

function emptyQuote(sym: string): YahooQuote {
    return {
        symbol: sym,
        name: sym,
        price: null,
        previousClose: null,
        change: null,
        changePercent: null,
        currency: 'USD',
        exchange: '',
        marketState: 'UNKNOWN',
        fiftyTwoWeekHigh: null,
        fiftyTwoWeekLow: null,
    };
}

interface HttpsResult {
    status: number;
    body: string;
    headers: IncomingHttpHeaders;
}

function httpsGet(
    url: string,
    headers: Record<string, string>,
    timeoutMs: number,
    redirects: number
): Promise<HttpsResult> {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const req = https.request(
            {
                protocol: 'https:',
                hostname: u.hostname,
                port: 443,
                path: `${u.pathname}${u.search}`,
                method: 'GET',
                headers: { Host: u.hostname, ...headers },
                timeout: timeoutMs,
            },
            (res) => {
                const loc = res.headers.location;
                if (
                    res.statusCode &&
                    res.statusCode >= 300 &&
                    res.statusCode < 400 &&
                    loc &&
                    redirects > 0
                ) {
                    res.resume();
                    const next = loc.startsWith('http') ? loc : `${u.protocol}//${u.host}${loc}`;
                    resolve(httpsGet(next, headers, timeoutMs, redirects - 1));
                    return;
                }
                const chunks: Buffer[] = [];
                res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
                res.on('end', () => {
                    resolve({
                        status: res.statusCode || 0,
                        body: Buffer.concat(chunks).toString('utf8'),
                        headers: res.headers,
                    });
                });
            }
        );
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Yahoo request timeout'));
        });
        req.on('error', reject);
        req.end();
    });
}

let yahooChain: Promise<unknown> = Promise.resolve();
let lastYahooAt = 0;

function enqueueYahoo<T>(fn: () => Promise<T>): Promise<T> {
    const run = yahooChain.then(async () => {
        const wait = MIN_SPACING_MS - (Date.now() - lastYahooAt);
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        lastYahooAt = Date.now();
        return fn();
    });
    yahooChain = run.then(
        () => undefined,
        () => undefined
    );
    return run;
}

const inflight = new Map<string, Promise<unknown>>();

function coalesce<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = inflight.get(key);
    if (existing) return existing as Promise<T>;
    const p = fn().finally(() => inflight.delete(key));
    inflight.set(key, p);
    return p;
}

/**
 * Yahoo rejects Next.js undici fetch() because it strips User-Agent.
 * node:https sends the Mozilla UA as-is. All Yahoo HTTPS calls share one spacing queue.
 */
async function fetchWithRetry(
    url: string,
    init: RequestInit = {},
    extraHeaders: Record<string, string> = {}
): Promise<Response> {
    const headers: Record<string, string> = {
        'User-Agent': USER_AGENT,
        Accept: 'application/json,text/plain,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        Origin: 'https://finance.yahoo.com',
        Referer: 'https://finance.yahoo.com/',
        ...(init.headers as Record<string, string> | undefined),
        ...extraHeaders,
    };

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const raw = await enqueueYahoo(() => httpsGet(url, headers, TIMEOUT_MS, 3));
            if (raw.status >= 200 && raw.status < 300) {
                return new Response(raw.body, { status: raw.status });
            }
            lastError = new Error(`Yahoo HTTP ${raw.status} for ${logPath(url)}`);
            console.error('[yahoo] http error', { status: raw.status, path: logPath(url) });
            if (raw.status === 429 && attempt < 2) {
                const backoff = 1000 * Math.pow(2, attempt);
                await new Promise((r) => setTimeout(r, backoff));
                continue;
            }
            if (raw.status >= 400 && raw.status < 500 && raw.status !== 429) {
                throw lastError;
            }
        } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            console.error('[yahoo] request failed', {
                path: logPath(url),
                message: lastError.message,
            });
            if (attempt === 2) throw lastError;
        }
    }
    throw lastError ?? new Error('Yahoo fetch failed');
}

let crumb: string | null = null;
let cookieHeader: string | null = null;
let crumbFetchedAt = 0;

async function ensureCrumb(): Promise<{ crumb: string; cookie: string } | null> {
    const fresh = Date.now() - crumbFetchedAt < 30 * 60 * 1000;
    if (fresh && crumb && cookieHeader) return { crumb, cookie: cookieHeader };

    try {
        const headers = {
            'User-Agent': USER_AGENT,
            Accept: 'text/html,application/json',
            'Accept-Language': 'en-US,en;q=0.9',
        };
        const fc = await enqueueYahoo(() => httpsGet('https://fc.yahoo.com', headers, TIMEOUT_MS, 0));
        const setCookies = fc.headers['set-cookie'];
        const list = Array.isArray(setCookies) ? setCookies : setCookies ? [setCookies] : [];
        const cookie = list
            .map((c) => c.split(';')[0])
            .filter(Boolean)
            .join('; ');
        const crumbRes = await fetchWithRetry(
            `${QUERY1}/v1/test/getcrumb`,
            {},
            cookie ? { Cookie: cookie } : {}
        );
        const text = (await crumbRes.text()).trim();
        if (text && text.length < 80 && !text.startsWith('<')) {
            crumb = text;
            cookieHeader = cookie;
            crumbFetchedAt = Date.now();
            return { crumb: text, cookie };
        }
    } catch (err) {
        console.warn(
            '[yahoo] crumb fetch failed, continuing without crumb',
            err instanceof Error ? err.message : 'error'
        );
    }
    return null;
}

type YahooChartJson = {
    chart?: {
        result?: Array<{
            meta?: Record<string, unknown>;
            timestamp?: number[];
            indicators?: { quote?: Array<Record<string, Array<number | null>>> };
        }>;
        error?: { description?: string };
    };
};

function parseYahooChart(json: YahooChartJson, sym: string): ChartResult | null {
    const result = json.chart?.result?.[0];
    if (!result) return null;
    const meta = result.meta ?? {};
    const timestamps = result.timestamp ?? [];
    const q = result.indicators?.quote?.[0] ?? {};
    const opens = q.open ?? [];
    const highs = q.high ?? [];
    const lows = q.low ?? [];
    const closes = q.close ?? [];
    const volumes = q.volume ?? [];
    const bars: OhlcvBar[] = [];
    for (let i = 0; i < timestamps.length; i++) {
        const close = closes[i];
        if (close == null || !Number.isFinite(close)) continue;
        bars.push({
            time: timestamps[i] * 1000,
            open: opens[i] ?? close,
            high: highs[i] ?? close,
            low: lows[i] ?? close,
            close,
            volume: volumes[i] ?? 0,
        });
    }
    if (!bars.length) return null;
    const price = rawNumber(meta.regularMarketPrice) ?? (bars.length ? bars[bars.length - 1].close : null);
    const previousClose =
        rawNumber(meta.regularMarketPreviousClose) ??
        rawNumber(meta.chartPreviousClose) ??
        rawNumber(meta.previousClose) ??
        (bars.length >= 2 ? bars[bars.length - 2].close : null);
    const change = price != null && previousClose != null ? price - previousClose : null;
    const changePercent = change != null && previousClose ? (change / previousClose) * 100 : null;

    const quote: YahooQuote = {
        symbol: rawString(meta.symbol) ?? sym,
        name: rawString(meta.shortName) || rawString(meta.longName) || sym,
        price,
        previousClose,
        change,
        changePercent,
        currency: rawString(meta.currency) || 'USD',
        exchange: rawString(meta.exchangeName) || rawString(meta.fullExchangeName) || '',
        marketState: rawString(meta.marketState) || 'UNKNOWN',
        fiftyTwoWeekHigh: rawNumber(meta.fiftyTwoWeekHigh),
        fiftyTwoWeekLow: rawNumber(meta.fiftyTwoWeekLow),
    };
    return { bars, quote, source: 'yahoo' };
}

async function fetchYahooChartHost(host: string, path: string, sym: string): Promise<ChartResult | null> {
    try {
        const res = await fetchWithRetry(`${host}${path}`);
        const json = (await res.json()) as YahooChartJson;
        return parseYahooChart(json, sym);
    } catch (err) {
        console.warn(
            '[yahoo] chart host failed',
            host,
            err instanceof Error ? err.message : 'error'
        );
        return null;
    }
}

async function fetchChartOnce(sym: string, range: string, interval: string): Promise<ChartResult> {
    const path = `/v8/finance/chart/${encodeURIComponent(sym)}?interval=${interval}&range=${range}&includePrePost=false&events=div%7Csplit`;
    const fromQ1 = await fetchYahooChartHost(QUERY1, path, sym);
    if (fromQ1?.bars.length) return fromQ1;
    const fromQ2 = await fetchYahooChartHost(QUERY2, path, sym);
    if (fromQ2?.bars.length) return fromQ2;
    try {
        const stooq = await fetchStooqChart(sym);
        if (stooq?.bars.length) return stooq;
    } catch (err) {
        console.warn(
            '[yahoo] stooq fallback skipped',
            sym,
            err instanceof Error ? err.message : 'error'
        );
    }
    throw new Error(`No chart data for ${sym}`);
}

export async function fetchChart(symbol: string, range = '1y', interval = '1d'): Promise<ChartResult> {
    const sym = normalizeSymbol(symbol);
    return coalesce(`chart:${sym}:${range}:${interval}`, () => fetchChartOnce(sym, range, interval));
}

export async function fetchQuoteSummary(symbol: string): Promise<QuoteSummaryBits> {
    const sym = normalizeSymbol(symbol);
    return coalesce(`summary:${sym}`, () => fetchQuoteSummaryOnce(sym));
}


function gradeToBucket(grade: string | undefined | null): keyof NonNullable<RecommendationTrendPeriod> | null {
    if (!grade) return null;
    const g = grade.trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (['strong_buy'].includes(g)) return 'strongBuy';
    if (['buy', 'outperform', 'overweight', 'accumulate', 'long', 'positive', 'add'].includes(g)) return 'buy';
    if (['hold', 'neutral', 'equal_weight', 'market_perform', 'sector_perform', 'in_line'].includes(g)) return 'hold';
    if (['sell', 'underperform', 'underweight', 'reduce', 'negative'].includes(g)) return 'sell';
    if (['strong_sell'].includes(g)) return 'strongSell';
    return null;
}

function parseAverageAnalystRatingKey(raw: unknown): string | null {
    const s = rawString(raw);
    if (!s) return null;
    const m = s.match(/[-–]\s*(.+)$/);
    const word = (m ? m[1] : s).trim().toLowerCase().replace(/\s+/g, '_');
    return word || null;
}

function trendFromUpgradeHistory(
    history: Array<{ epochGradeDate?: number; firm?: string; toGrade?: string }> | undefined | null
): RecommendationTrendPeriod[] | null {
    if (!history?.length) return null;
    const cutoff = Date.now() / 1000 - 18 * 30 * 24 * 3600;
    const latest = new Map<string, { date: number; grade: string }>();
    for (const row of history) {
        const firm = (row.firm || '').trim();
        const grade = row.toGrade;
        const date = typeof row.epochGradeDate === 'number' ? row.epochGradeDate : 0;
        if (!firm || !grade || date < cutoff) continue;
        const prev = latest.get(firm);
        if (!prev || date > prev.date) latest.set(firm, { date, grade });
    }
    const counts = { strongBuy: 0, buy: 0, hold: 0, sell: 0, strongSell: 0 };
    let n = 0;
    for (const { grade } of latest.values()) {
        const bucket = gradeToBucket(grade);
        if (!bucket || bucket === 'period') continue;
        if (bucket in counts) {
            counts[bucket as keyof typeof counts] += 1;
            n += 1;
        }
    }
    if (!n) return null;
    return [{ period: '0m', ...counts }];
}

async function fetchQuoteSummaryOnce(sym: string): Promise<QuoteSummaryBits> {
    const modules = [
        'price',
        'summaryDetail',
        'defaultKeyStatistics',
        'financialData',
        'recommendationTrend',
        'upgradeDowngradeHistory',
    ].join(',');
    const auth = await ensureCrumb();
    const crumbQs = auth?.crumb ? `&crumb=${encodeURIComponent(auth.crumb)}` : '';
    const url = `${QUERY2}/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=${modules}${crumbQs}`;
    const extra: Record<string, string> = auth?.cookie ? { Cookie: auth.cookie } : {};
    const res = await fetchWithRetry(url, {}, extra);
    const json = (await res.json()) as {
        quoteSummary?: {
            result?: Array<Record<string, unknown>>;
            error?: { description?: string };
        };
    };
    const row = json.quoteSummary?.result?.[0];
    if (!row) {
        throw new Error(json.quoteSummary?.error?.description || `No quoteSummary for ${sym}`);
    }
    const price = (row.price ?? {}) as Record<string, unknown>;
    const summary = (row.summaryDetail ?? {}) as Record<string, unknown>;
    const stats = (row.defaultKeyStatistics ?? {}) as Record<string, unknown>;
    const fin = (row.financialData ?? {}) as Record<string, unknown>;
    const rec = (row.recommendationTrend ?? {}) as { trend?: RecommendationTrendPeriod[] };

    return {
        trailingPE: rawNumber(summary.trailingPE) ?? rawNumber(stats.trailingPE) ?? rawNumber(fin.trailingPE),
        forwardPE: rawNumber(fin.forwardPE) ?? rawNumber(stats.forwardPE) ?? rawNumber(summary.forwardPE),
        priceToBook: rawNumber(stats.priceToBook) ?? rawNumber(summary.priceToBook),
        returnOnEquity: rawNumber(fin.returnOnEquity),
        returnOnAssets: rawNumber(fin.returnOnAssets),
        profitMargins: rawNumber(fin.profitMargins) ?? rawNumber(summary.profitMargins),
        operatingMargins: rawNumber(fin.operatingMargins),
        grossMargins: rawNumber(fin.grossMargins) ?? rawNumber(summary.grossMargins),
        debtToEquity: rawNumber(fin.debtToEquity),
        currentRatio: rawNumber(fin.currentRatio),
        freeCashflow: rawNumber(fin.freeCashflow),
        operatingCashflow: rawNumber(fin.operatingCashflow),
        earningsGrowth: rawNumber(fin.earningsGrowth),
        revenueGrowth: rawNumber(fin.revenueGrowth),
        enterpriseToEbitda: rawNumber(stats.enterpriseToEbitda) ?? rawNumber(fin.enterpriseToEbitda),
        enterpriseValue: rawNumber(stats.enterpriseValue),
        netIncomeToCommon: rawNumber(stats.netIncomeToCommon),
        payoutRatio: rawNumber(summary.payoutRatio) ?? rawNumber(stats.payoutRatio),
        ebitda: rawNumber(fin.ebitda),
        fiftyTwoWeekHigh: rawNumber(summary.fiftyTwoWeekHigh) ?? rawNumber(price.fiftyTwoWeekHigh),
        fiftyTwoWeekLow: rawNumber(summary.fiftyTwoWeekLow) ?? rawNumber(price.fiftyTwoWeekLow),
        lastPrice: rawNumber(price.regularMarketPrice) ?? rawNumber(fin.currentPrice),
        currency: rawString(price.currency),
        shortName: rawString(price.shortName),
        longName: rawString(price.longName),
        quoteType: rawString(price.quoteType),
        recommendationKey: rawString(fin.recommendationKey) ?? parseAverageAnalystRatingKey(price.averageAnalystRating),
        recommendationMean: rawNumber(fin.recommendationMean),
        targetMean: rawNumber(fin.targetMeanPrice),
        numberOfAnalystOpinions: rawNumber(fin.numberOfAnalystOpinions),
        recommendationTrend: (rec.trend && rec.trend.length ? rec.trend : null) ?? trendFromUpgradeHistory(
            ((row.upgradeDowngradeHistory ?? {}) as { history?: Array<{ epochGradeDate?: number; firm?: string; toGrade?: string }> }).history
        ),
        averageAnalystRating: rawString(price.averageAnalystRating),
        beta: rawNumber(stats.beta),
        marketCap: rawNumber(price.marketCap) ?? rawNumber(summary.marketCap),
    };
}

export async function searchYahoo(query: string, limit = 20): Promise<YahooSearchResult[]> {
    const q = query.trim();
    if (!q) return [];
    const count = Math.min(40, Math.max(limit * 2, 20));
    const path = `/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=${count}&newsCount=0&enableFuzzyQuery=true`;
    try {
        let res: Response;
        try {
            res = await fetchWithRetry(`${QUERY1}${path}`);
        } catch {
            res = await fetchWithRetry(`${QUERY2}${path}`);
        }
        const json = (await res.json()) as {
            quotes?: Array<{
                symbol?: string;
                shortname?: string;
                longname?: string;
                exchDisp?: string;
                exchange?: string;
                quoteType?: string;
                typeDisp?: string;
            }>;
        };
        const quotes = json.quotes ?? [];
        return quotes
            .filter((r) => r.symbol && isSearchableQuote(r))
            .slice(0, limit)
            .map((r) => ({
                symbol: r.symbol as string,
                name: r.longname || r.shortname || (r.symbol as string),
                exchange: r.exchDisp || r.exchange || '',
                quoteType: r.quoteType || '',
                typeDisp: r.typeDisp || r.quoteType || '',
            }));
    } catch (err) {
        console.warn('[yahoo] search failed', err instanceof Error ? err.message : 'error');
        return [];
    }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const ret: R[] = new Array(items.length);
    let i = 0;
    async function worker() {
        while (i < items.length) {
            const idx = i++;
            ret[idx] = await fn(items[idx]);
        }
    }
    const n = Math.max(1, Math.min(limit, items.length || 1));
    await Promise.all(Array.from({ length: items.length ? n : 0 }, () => worker()));
    return ret;
}

function staticFxQuote(sym: string): YahooQuote | null {
    const fx = STATIC_FX[sym];
    if (!fx) return null;
    return {
        ...emptyQuote(sym),
        name: fx.name,
        price: fx.price,
        previousClose: fx.price,
        change: 0,
        changePercent: 0,
        currency: fx.currency,
        marketState: 'CLOSED',
    };
}

export async function fetchQuotes(symbols: string[]): Promise<YahooQuote[]> {
    const unique = [...new Set(symbols.map(normalizeSymbol).filter(Boolean))];
    return mapLimit(unique, 3, async (sym) => {
        try {
            const { quote } = await fetchChart(sym, '5d', '1d');
            if (quote.price != null && Number.isFinite(quote.price)) {
                return { ...quote, symbol: sym };
            }
        } catch (err) {
            console.error('[yahoo] quote failed', {
                symbol: sym,
                message: err instanceof Error ? err.message : 'error',
            });
        }
        const fx = staticFxQuote(sym);
        if (fx) return fx;
        return emptyQuote(sym);
    });
}
