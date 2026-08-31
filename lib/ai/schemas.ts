import { z } from 'zod';

/**
 * Research labels (guidance.label) stay descriptive: Robust…Fragile.
 * Client action (guidance.action) IS Buy/Hold/Sell, derived from orbitScore.
 * Third-party analyst consensus is displayed as input data, not Orbitfolio advice.
 */

// --- PRIMITIVES ---

export const SentimentSchema = z.object({
    score: z.number().min(0).max(10),
    label: z.enum(['BULLISH', 'BEARISH', 'NEUTRAL']),
    summary: z.string(),
    sources: z.array(z.string()).optional()
});

export const RiskSchema = z.object({
    score: z.number().min(0).max(10), // 10 = High Risk
    level: z.enum(['LOW', 'MEDIUM', 'HIGH', 'EXTREME']),
    factors: z.array(z.string())
});

/**
 * Guidance ratings: research labels describe setup quality.
 * They are NOT buy/sell/hold advice — that lives on the separate `action` field.
 */
export const GuidanceLabelSchema = z.enum([
    'Robust',
    'Constructive',
    'Mixed',
    'Cautious',
    'Fragile',
]);

export const ClientActionSchema = z.enum(['Buy', 'Hold', 'Sell']);

export const AnalystRawSchema = z.object({
    meanScore: z.number().optional(),
    recommendationMean: z.number().optional(),
    targetMean: z.number().optional(),
    recommendationKey: z.string().optional(),
    numberOfAnalysts: z.number().optional(),
});

export const GuidanceSchema = z.object({
    orbitScore: z.number().min(0).max(10),
    label: GuidanceLabelSchema,
    action: ClientActionSchema,
    pillars: z.object({
        technical: z.number().min(0).max(10),
        fundamental: z.number().min(0).max(10),
        analystConsensus: z.number().min(0).max(10),
    }),
    rationale: z.string(),
    analystRaw: AnalystRawSchema.optional(),
    weightsUsed: z.object({
        technical: z.number(),
        fundamental: z.number(),
        analystConsensus: z.number(),
    }).optional(),
    analystAvailable: z.boolean().optional(),
});

/** @deprecated Replaced by GuidanceSchema. Kept as a type alias so old imports compile. */
export const SignalSchema = GuidanceSchema;

// --- CORE ANALYSIS ---

export const StockAnalysisSchema = z.object({
    symbol: z.string(),
    orbitScore: z.number().min(0).max(10),
    breakdown: z.object({
        technical: z.number(),
        fundamental: z.number(),
        sentiment: z.number(),
        risk: z.number()
    }),
    guidance: GuidanceSchema,
    sentiment: SentimentSchema.optional(),
    opportunities: z.array(z.string()),
    risks: z.array(z.string()),
    generatedAt: z.string()
});

export const PortfolioAnalysisSchema = z.object({
    totalScore: z.number().min(0).max(10),
    // Portfolio-level guidance grade, not a trade recommendation.
    healthRating: z.enum(['A+', 'A', 'B', 'C', 'D', 'F']),
    diversificationScore: z.number().min(0).max(100),
    topHoldings: z.array(StockAnalysisSchema),
    recommendations: z.array(z.object({
        action: z.string(),
        impact: z.string(),
        priority: z.enum(['HIGH', 'MEDIUM', 'LOW'])
    })),
    summary: z.string()
});

// --- CHAT & AGENTS ---

export const ChatActionSchema = z.object({
    label: z.string(),
    type: z.enum(['NAVIGATE', 'EXECUTE', 'SEARCH']),
    payload: z.any()
});

export const ChatResponseSchema = z.object({
    message: z.string(), // The markdown response
    relevantTickers: z.array(z.string()).optional(),
    suggestedActions: z.array(ChatActionSchema).optional(),
    sentiment: z.enum(['POSITIVE', 'NEGATIVE', 'NEUTRAL']).optional()
});

export const GemHunterResultSchema = z.object({
    symbol: z.string(),
    companyName: z.string(),
    currentPrice: z.number(),
    dipPercentage: z.number(), // e.g., -15%
    reasonForDip: z.string(),
    piotroskiScore: z.number().min(0).max(9),
    verdict: z.enum(['OPPORTUNITY', 'TRAP', 'WATCH']),
    entryZone: z.string().optional()
});

// Types
export type Guidance = z.infer<typeof GuidanceSchema>;
export type GuidanceLabel = z.infer<typeof GuidanceLabelSchema>;
export type ClientAction = z.infer<typeof ClientActionSchema>;
export type StockAnalysis = z.infer<typeof StockAnalysisSchema>;
export type PortfolioAnalysis = z.infer<typeof PortfolioAnalysisSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
export type GemHunterResult = z.infer<typeof GemHunterResultSchema>;

// --- INVESTMENT PERSONAS ---

export const InvestmentPersonaSchema = z.enum(['CONSERVATIVE', 'BALANCED', 'GROWTH']);

export const PersonaCriteriaSchema = z.object({
    maxPE: z.number().optional(),
    minDividend: z.number().optional(),
    maxBeta: z.number().optional(),
    minPiotroski: z.number().optional(),
    minRevenueGrowth: z.number().optional(),
    acceptHighPE: z.boolean().optional()
});

export type InvestmentPersona = z.infer<typeof InvestmentPersonaSchema>;

// --- ADVANCED RISK METRICS ---

export const AdvancedRiskMetricsSchema = z.object({
    sharpeRatio: z.number(),
    sortinoRatio: z.number(),
    maxDrawdown: z.number(), // Percentage
    calmarRatio: z.number(),
    beta: z.number(),
    alpha: z.number(),
    volatility: z.number() // Annualized %
});

export type AdvancedRiskMetrics = z.infer<typeof AdvancedRiskMetricsSchema>;

/**
 * Words that must not appear as guidance.label.
 * Client action (Buy/Hold/Sell) is a separate field and is allowed there.
 * guidance.label must remain Robust, Constructive, Mixed, Cautious, Fragile.
 */
export const FORBIDDEN_TRADE_ACTIONS = ['BUY', 'SELL', 'HOLD', 'TRIM', 'ACCUMULATE'] as const;
