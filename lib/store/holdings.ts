'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Market = 'US' | 'IN' | 'CA';
export type AssetType = 'STOCK' | 'ETF' | 'OTHER';

export interface Holding {
    id: string;
    symbol: string;
    name: string;
    quantity: number;
    averagePrice: number;
    currency: string;
    market: Market;
    assetType: AssetType;
}

export interface QuoteView {
    symbol: string;
    name: string;
    price: number | null;
    previousClose: number | null;
    change: number | null;
    changePercent: number | null;
    currency: string;
    exchange: string;
    marketState: string;
}

export interface AnalysisView {
    analysis: {
        symbol: string;
        orbitScore: number;
        guidance: {
            orbitScore: number;
            label: 'Robust' | 'Constructive' | 'Mixed' | 'Cautious' | 'Fragile';
            action?: 'Buy' | 'Hold' | 'Sell';
            pillars: { technical: number; fundamental: number; analystConsensus: number };
            rationale: string;
            analystRaw?: {
                meanScore?: number;
                recommendationMean?: number;
                targetMean?: number;
                recommendationKey?: string;
                numberOfAnalysts?: number;
            };
            weightsUsed?: { technical: number; fundamental: number; analystConsensus: number };
            analystAvailable?: boolean;
        };
        generatedAt: string;
    };
    quote: QuoteView;
    technicals: {
        rsi14: number | null;
        macd: number | null;
        macdSignal: number | null;
        macdHistogram: number | null;
        sma50: number | null;
        sma200: number | null;
        mom12_1?: number | null;
        adx14?: number | null;
        volumeRatio?: number | null;
        week52HighRatio?: number | null;
        components?: Record<string, number | null>;
        weightsUsed?: Record<string, number>;
    };
    fundamentals: {
        trailingPE: number | null;
        forwardPE?: number | null;
        priceToBook: number | null;
        returnOnEquity: number | null;
        returnOnAssets?: number | null;
        profitMargins: number | null;
        operatingMargins?: number | null;
        grossMargins?: number | null;
        debtToEquity: number | null;
        currentRatio?: number | null;
        freeCashflow?: number | null;
        operatingCashflow?: number | null;
        fcfYield?: number | null;
        enterpriseToEbitda?: number | null;
        earningsGrowth?: number | null;
        revenueGrowth?: number | null;
        week52Position?: number | null;
        usedFields: string[];
        groupScores?: Record<string, number | null>;
        weightsUsed?: Record<string, number>;
    };
    rationaleSource: 'groq' | 'template';
    meta?: { stale?: boolean; source?: string };
}

const DEMO_SEED: Holding[] = [
    { id: 'demo-aapl', symbol: 'AAPL', name: 'Apple Inc.', quantity: 12, averagePrice: 178.5, currency: 'USD', market: 'US', assetType: 'STOCK' },
    { id: 'demo-msft', symbol: 'MSFT', name: 'Microsoft Corp.', quantity: 8, averagePrice: 390, currency: 'USD', market: 'US', assetType: 'STOCK' },
    { id: 'demo-nvda', symbol: 'NVDA', name: 'NVIDIA Corp.', quantity: 15, averagePrice: 112, currency: 'USD', market: 'US', assetType: 'STOCK' },
    { id: 'demo-rel', symbol: 'RELIANCE.NS', name: 'Reliance Industries', quantity: 20, averagePrice: 2450, currency: 'INR', market: 'IN', assetType: 'STOCK' },
    { id: 'demo-infy', symbol: 'INFY.NS', name: 'Infosys Ltd', quantity: 40, averagePrice: 1480, currency: 'INR', market: 'IN', assetType: 'STOCK' },
    { id: 'demo-shop', symbol: 'SHOP.TO', name: 'Shopify Inc.', quantity: 10, averagePrice: 95, currency: 'CAD', market: 'CA', assetType: 'STOCK' },
];

function newId(): string {
    return `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

interface HoldingsState {
    holdings: Holding[];
    seeded: boolean;
    quotes: Record<string, QuoteView>;
    analyses: Record<string, AnalysisView>;
    fx: Record<string, number>;
    displayCurrency: 'USD' | 'INR' | 'CAD';
    healthRating: string | null;
    loadingQuotes: boolean;
    loadingAnalysis: boolean;
    ratingDone: number;
    ratingTotal: number;
    seedIfNeeded: () => void;
    addHolding: (input: Omit<Holding, 'id'>) => void;
    updateHolding: (id: string, patch: Partial<Omit<Holding, 'id'>>) => void;
    removeHolding: (id: string) => void;
    replaceHoldings: (next: Omit<Holding, 'id'>[] | Holding[]) => void;
    clearHoldings: () => void;
    setDisplayCurrency: (c: 'USD' | 'INR' | 'CAD') => void;
    refreshQuotes: () => Promise<void>;
    rateSymbol: (symbol: string) => Promise<AnalysisView | null>;
    rateAll: (force?: boolean) => Promise<void>;
}

const FRESH_MS = 6 * 60 * 60 * 1000;
const ANALYSES_CAP = 40;

function capAnalyses(map: Record<string, AnalysisView>, keep = ANALYSES_CAP): Record<string, AnalysisView> {
    const entries = Object.entries(map);
    if (entries.length <= keep) return map;
    entries.sort((a, b) => {
        const ta = Date.parse(a[1]?.analysis?.generatedAt || '') || 0;
        const tb = Date.parse(b[1]?.analysis?.generatedAt || '') || 0;
        return tb - ta;
    });
    return Object.fromEntries(entries.slice(0, keep));
}

export const useHoldingsStore = create<HoldingsState>()(
    persist(
        (set, get) => ({
            holdings: DEMO_SEED,
            seeded: true,
            quotes: {},
            analyses: {},
            fx: {},
            displayCurrency: 'USD',
            healthRating: null,
            loadingQuotes: false,
            loadingAnalysis: false,
            ratingDone: 0,
            ratingTotal: 0,
            seedIfNeeded: () => {
                const { holdings, seeded } = get();
                if (!seeded && holdings.length === 0) {
                    set({ holdings: DEMO_SEED, seeded: true });
                }
            },
            addHolding: (input) => {
                set({
                    holdings: [...get().holdings, { ...input, id: newId(), symbol: input.symbol.toUpperCase() }],
                });
            },
            updateHolding: (id, patch) => {
                set({
                    holdings: get().holdings.map((h) => (h.id === id ? { ...h, ...patch } : h)),
                });
            },
            removeHolding: (id) => {
                set({ holdings: get().holdings.filter((h) => h.id !== id) });
            },
            replaceHoldings: (next) => {
                const holdings = next.map((h) => ({
                    ...h,
                    id: 'id' in h && h.id ? h.id : newId(),
                    symbol: h.symbol.toUpperCase(),
                }));
                set({
                    holdings,
                    seeded: true,
                    analyses: {},
                    quotes: {},
                    healthRating: null,
                });
            },
            clearHoldings: () => {
                set({
                    holdings: [],
                    seeded: true,
                    analyses: {},
                    quotes: {},
                    healthRating: null,
                });
            },
            setDisplayCurrency: (c) => set({ displayCurrency: c }),
            refreshQuotes: async () => {
                const symbols = get().holdings.map((h) => h.symbol);
                if (symbols.length === 0) return;
                set({ loadingQuotes: true });
                try {
                    const fxSymbols = ['INR=X', 'CAD=X'];
                    const all = [...symbols, ...fxSymbols];
                    const res = await fetch(`/api/quotes?symbols=${encodeURIComponent(all.join(','))}`);
                    const json = await res.json();
                    if (!json.success) return;
                    const quotes: Record<string, QuoteView> = { ...get().quotes };
                    const fx: Record<string, number> = { ...get().fx };
                    for (const q of json.data as QuoteView[]) {
                        if (q.symbol === 'INR=X' && q.price) fx.INR = q.price;
                        else if (q.symbol === 'CAD=X' && q.price) fx.CAD = q.price;
                        else quotes[q.symbol] = q;
                    }
                    set({ quotes, fx });
                } catch (err) {
                    console.error('[store] quotes failed', err);
                } finally {
                    set({ loadingQuotes: false });
                }
            },
            rateSymbol: async (symbol) => {
                const key = symbol.toUpperCase();
                try {
                    const res = await fetch(`/api/analysis?symbol=${encodeURIComponent(key)}`);
                    const json = await res.json();
                    if (!json.success) return get().analyses[key] ?? null;
                    const view = {
                        ...(json.data as AnalysisView),
                        meta: json.meta ?? (json.data as AnalysisView).meta,
                    };
                    const analyses = capAnalyses({
                        ...get().analyses,
                        [key]: view,
                        [view.analysis.symbol]: view,
                    });
                    set({ analyses });
                    if (view.quote) {
                        set({
                            quotes: {
                                ...get().quotes,
                                [key]: { ...view.quote, symbol: key },
                                [view.quote.symbol]: view.quote,
                            },
                        });
                    }
                    return view;
                } catch (err) {
                    console.error('[store] analysis failed', err);
                    return get().analyses[key] ?? null;
                }
            },
            rateAll: async (force = false) => {
                const symbols = get().holdings.map((h) => h.symbol);
                if (symbols.length === 0) return;
                if (get().loadingAnalysis) return;
                set({ loadingAnalysis: true, ratingDone: 0, ratingTotal: symbols.length });
                try {
                    let cursor = 0;
                    const worker = async () => {
                        while (cursor < symbols.length) {
                            const idx = cursor++;
                            const sym = symbols[idx];
                            const existing = get().analyses[sym];
                            const ts = existing?.analysis?.generatedAt;
                            const age = ts ? Date.now() - Date.parse(ts) : Infinity;
                            const isOffline = existing?.meta?.source === 'offline' || existing?.meta?.stale;
                            if (!force && existing && !isOffline && Number.isFinite(age) && age < FRESH_MS) {
                                set({ ratingDone: Math.min(symbols.length, get().ratingDone + 1) });
                                continue;
                            }
                            const view = await get().rateSymbol(sym);
                            if (view) {
                                set({
                                    analyses: capAnalyses({ ...get().analyses, [sym]: view }),
                                    quotes: view.quote
                                        ? { ...get().quotes, [sym]: view.quote }
                                        : get().quotes,
                                });
                            }
                            set({ ratingDone: Math.min(symbols.length, get().ratingDone + 1) });
                        }
                    };
                    const n = Math.min(3, symbols.length);
                    await Promise.all(Array.from({ length: n }, () => worker()));
                    const scores = get()
                        .holdings.map((h) => get().analyses[h.symbol]?.analysis.orbitScore)
                        .filter((n): n is number => typeof n === 'number');
                    const avg = scores.length
                        ? scores.reduce((a, b) => a + b, 0) / scores.length
                        : 0;
                    let health: string | null = null;
                    if (scores.length) {
                        if (avg >= 8) health = 'A+';
                        else if (avg >= 7) health = 'A';
                        else if (avg >= 6) health = 'B';
                        else if (avg >= 5) health = 'C';
                        else if (avg >= 3.5) health = 'D';
                        else health = 'F';
                    }
                    set({ healthRating: health });
                } catch (err) {
                    console.error('[store] portfolio analysis failed', err);
                } finally {
                    set({ loadingAnalysis: false });
                }
            },
        }),
        {
            name: 'orbitfolio-holdings-v8',
            skipHydration: true,
            partialize: (state) => ({
                holdings: state.holdings,
                seeded: state.seeded,
                displayCurrency: state.displayCurrency,
                analyses: capAnalyses(state.analyses),
                quotes: state.quotes,
                healthRating: state.healthRating,
            }),
        }
    )
);

if (typeof window !== 'undefined') {
    void useHoldingsStore.persist.rehydrate();
}

export function convertTo(amount: number, from: string, to: string, fx: Record<string, number>): number {
    if (from === to) return amount;
    const toUsd = (value: number, ccy: string): number => {
        if (ccy === 'USD') return value;
        const rate = fx[ccy];
        if (!rate) return value;
        return value / rate;
    };
    const fromUsd = (usd: number, ccy: string): number => {
        if (ccy === 'USD') return usd;
        const rate = fx[ccy];
        if (!rate) return usd;
        return usd * rate;
    };
    return fromUsd(toUsd(amount, from), to);
}
