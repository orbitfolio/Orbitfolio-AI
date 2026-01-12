/**
 * Portfolio Analysis Prompts
 * 
 * Centralized prompt templates for portfolio analysis.
 * Benefits:
 * - Version control prompts like code
 * - A/B test variations
 * - Consistent analysis across app
 * - Easy to update without touching routes
 */

export interface HoldingData {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice?: number;
  type: string;
  sector?: string;
}

/**
 * Replace template variables
 */
function fillTemplate(template: string, vars: Record<string, any>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder, 'g'), String(value));
  }
  return result;
}

/**
 * Portfolio diversification analysis prompt
 */
export function getPortfolioDiversificationPrompt(holdings: HoldingData[]): string {
  const template = `You are a professional portfolio analyst.

Analyze this portfolio for diversification:

{{holdings}}

Provide analysis for:
1. **Diversification Score** (0-100, where 100 is perfectly diversified)
2. **Risk Level** (Low/Medium/High)
3. **Sector Concentration** (any sectors > 30%?)
4. **Top 3 Recommendations** for improving diversification

**Format your response as JSON**:
{
  "diversificationScore": number,
  "riskLevel": "Low" | "Medium" | "High",
  "sectorConcentration": {
    "highest": { "sector": string, "percentage": number },
    "concerns": string[]
  },
  "recommendations": [
    { "priority": number, "action": string, "reason": string }
  ]
}`;

  return fillTemplate(template, {
    holdings: JSON.stringify(holdings, null, 2)
  });
}

/**
 * Individual holding analysis prompt
 */
export function getHoldingAnalysisPrompt(holding: HoldingData): string {
  const template = `Analyze this stock holding:

Symbol: {{symbol}}
Quantity: {{quantity}}
Average Price: {{avgPrice}}
Current Price: {{currentPrice}}
Type: {{type}}
Sector: {{sector}}

Provide:
1. **Quick Assessment** (1-2 sentences)
2. **Risk Factors** (top 2-3)
3. **Opportunity Score** (0-10, where 10 = strong buy)
4. **Action** (HOLD, BUY_MORE, TRIM, SELL)

**Format as JSON**:
{
  "assessment": string,
  "riskFactors": string[],
  "opportunityScore": number,
  "action": "HOLD" | "BUY_MORE" | "TRIM" | "SELL",
  "reasoning": string
}`;

  return fillTemplate(template, {
    symbol: holding.symbol,
    quantity: holding.quantity,
    avgPrice: holding.avgPrice,
    currentPrice: holding.currentPrice || 'N/A',
    type: holding.type,
    sector: holding.sector || 'Unknown'
  });
}

/**
 * Portfolio risk assessment prompt
 */
export function getPortfolioRiskPrompt(holdings: HoldingData[]): string {
  const template = `You are a risk management specialist.

Assess portfolio risk:

{{holdings}}

Analyze:
1. **Overall Risk Score** (0-100, where 100 is extremely risky)
2. **Volatility Concerns** (top 3 volatile holdings)
3. **Concentration Risk** (any single holding > 20%?)
4. **Market Correlation** (how correlated are holdings?)

**Format as JSON**:
{
  "overallRiskScore": number,
  "riskLevel": "Low" | "Medium" | "High",
  "volatilityWarnings": [
    { "symbol": string, "concern": string }
  ],
  "concentrationRisk": {
    "maxConcentration": number,
    "concerningHoldings": string[]
  },
  "marketCorrelation": "Low" | "Medium" | "High",
  "recommendations": string[]
}`;

  return fillTemplate(template, {
    holdings: JSON.stringify(holdings, null, 2)
  });
}

/**
 * Chat response prompt (for interactive Q&A)
 */
export function getChatResponsePrompt(
  userQuestion: string,
  holdings: HoldingData[],
  conversationHistory?: string[]
): string {
  const template = `You are OrbitFolio AI, a helpful portfolio analysis assistant.

User's Portfolio:
{{holdings}}

{{history}}

User Question: {{question}}

Provide a helpful, concise response. Be friendly but professional.
If the question is about specific holdings, reference the portfolio data.
If you need more information, ask clarifying questions.

**Respond in plain text** (not JSON for chat).`;

  const history = conversationHistory && conversationHistory.length > 0
    ? `Previous conversation:\n${conversationHistory.join('\n')}\n`
    : '';

  return fillTemplate(template, {
    holdings: JSON.stringify(holdings, null, 2),
    history,
    question: userQuestion
  });
}

/**
 * Performance summary prompt
 */
export function getPerformanceSummaryPrompt(
  holdings: HoldingData[],
  timeframe: 'day' | 'week' | 'month' | 'year'
): string {
  const template = `Generate a performance summary for this portfolio over {{timeframe}}.

Holdings:
{{holdings}}

Provide:
1. **Overall Performance** (gain/loss estimate)
2. **Top Performers** (best 3 holdings)
3. **Underperformers** (worst 3 holdings)
4. **Key Insights** (2-3 observations)

**Format as JSON**:
{
  "timeframe": string,
  "overallPerformance": {
    "direction": "up" | "down" | "flat",
    "summary": string
  },
  "topPerformers": [
    { "symbol": string, "reason": string }
  ],
  "underperformers": [
    { "symbol": string, "reason": string }
  ],
  "insights": string[]
}`;

  return fillTemplate(template, {
    holdings: JSON.stringify(holdings, null, 2),
    timeframe
  });
}


/**
 * ============================================================================
 * HISTORICAL PROMPT LIBRARY (Dec 2, 2025 - Jan 8, 2026)
 * ============================================================================
 * 
 * This library preserves the "Key Discovery" prompts that defined OrbitFolio's 
 * intelligence during Phases 1-13.
 */

export const HISTORICAL_PROMPTS = {
  // ===========================================================================
  // Phase 0: Project Genesis (Dec 2, 2025)
  // ===========================================================================
  /** PH-00: "The Zero-Budget Vision" */
  PH_00_INCEPTION: `Build a comprehensive portfolio analyzer for US, CA, and IN markets.
Must be "Zero Budget" using free-tier services (Vercel, Supabase, Yahoo Finance).
Design for a non-technical user with a premium, creative UI.`,

  /** PH-00.1: "Authentication Discovery" */
  PH_00_1_AUTH: `Setup Supabase Auth with Email/Password and Google OAuth.
Protected routes must require authentication.
Session must persist across page refreshes.`,

  /** PH-00.2: "Data Schema Discovery" */
  PH_00_2_SCHEMA: `Design a PostgreSQL schema:
- Portfolios (user_id, name, description)
- Holdings (portfolio_id, symbol, quantity, avg_cost, currency)
Implement Row Level Security (RLS) from Day 1 for data isolation.
Support multi-currency per holding (INR, USD, CAD).`,

  /** PH-00.3: "UI & Data Integration Discovery" */
  PH_00_3_UI_DATA: `Integrate yahoo-finance2 for 15-min delayed stock prices.
Build a premium dashboard with Glassmorphism and Vanilla CSS.
Support dark/light mode based on system preferences.
Implement smart search with ticker autocompletion.`,

  // ===========================================================================
  // Phase 1: Core Scoring Engine (Dec 4-25, 2025)
  // ===========================================================================
  /** PH-01: "The Orbit AI Score Formula" */
  PH_01_SCORING_LOGIC: `Define a 0-10 Orbit AI Score:
- 45% Technical (RSI, MACD, SMA)
- 25% Fundamental (Piotroski F-Score)
- 20% Risk (Altman Z-Score / Bank Z-Score)
- 10% Sentiment (News feed analysis)
Adjust final score for market fear using VIX index.`,

  /** PH-01 Detail: "Piotroski F-Score Integration" */
  PH_01_PIOTROSKI: `Calculate Piotroski F-Score (0-9) for fundamental strength.
Check 9 binary signals from cash flow, profitability, and leverage.
Higher F-Score (6+) signals strong fundamentals.`,

  /** PH-01 Detail: "VIX Fear Gauge" */
  PH_01_VIX_ADJUSTMENT: `Fetch VIX (^VIX) from Yahoo Finance.
VIX < 15: Add +0.5 bonus (bullish market).
VIX > 20: Apply -1.0 penalty (market fear).`,

  // ===========================================================================
  // Phase 2-3: Sentiment & Macro v1 (Dec 28-29, 2025)
  // ===========================================================================
  /** PH-02: "India News Integration" */
  PH_02_INDIA_NEWS: `Fetch RSS feeds from Economic Times, Moneycontrol, and Mint.
Filter by stock-specific keywords.
Pass relevant headlines to sentiment engine.`,

  /** PH-02 Detail: "7-Dimension NLP v1 (Gemini)" */
  PH_02_7D_GEMINI: `Perform 7-Dimension sentiment analysis using Gemini:
Relevance, Tone, Price Impact, Catalyst Clarity,
Temporal Signal, Investor Confidence, Risk Profile Change.`,

  /** PH-03: "Macro Regime HUD v1" */
  PH_03_MACRO_HUD: `Calculate Macro Regime Score from -4 to +4:
- VIX Pillar: < 15 bullish, > 20 bearish.
- Index 50-DMA Pillar: Above 50-DMA = bullish.
- RSI Breadth Proxy: 40-75 = healthy market.
Apply +0.5 bonus for Regime >= 2, -1.0 penalty for <= -2.`,

  // ===========================================================================
  // Phase 4-6: Backtesting & NLP Upgrade (Dec 2025)
  // ===========================================================================
  /** PH-04: "Backtesting Framework" */
  PH_04_BACKTEST: `Build a 125-stock backtesting framework.
Detect scoring anomalies ("red flags").
Apply aggressive penalties for poor historical performers.`,

  /** PH-05: "India News Sources" */
  PH_05_RSS_SOURCES: `Extend news sources to cover India-specific stocks:
- Economic Times
- Livemint
- Moneycontrol
Use keyword filtering for relevance before scoring.`,

  /** PH-06: "7-Feature NLP Scorer (Pre-Groq)" */
  PH_06_7D_SCORER: `Implement 7-dimension sentiment scoring:
Output a weighted average for final sentiment contribution.
Note: Rate-limited by Gemini (429 errors), later upgraded to Groq.`,

  // ===========================================================================
  // Phase 7-9: VaR, Kelly, Risk Adapter (Dec 2025)
  // ===========================================================================
  /** PH-07/08: "VaR & Kelly Criterion" */
  PH_07_08_RISK_MATH: `Integrate Finnhub for analyst recommendations and price targets.
Calculate Value at Risk (VaR) for portfolio volatility.
Implement Kelly Criterion for optimal position sizing.
Balance API limits: Finnhub (60/min), TwelveData (800/day).`,

  /** PH-09: "Sector-Aware Risk Adapter" */
  PH_09_RISK_ADAPTER: `Create a RiskSectorAdapter for dynamic model selection:
- Banks (TD.TO, RY.TO): Use Bank Z-Score.
- Tech (MSFT, NVDA): Use Altman Z'' (double-prime).
- Manufacturing: Use Altman Z (original).
Calibrate "Oven Dial": Weight reduced from 1.5 to 1.2.
Technical Base reduced from 5.0 to 4.5.`,

  // ===========================================================================
  // Phase 10: Symbol Resolution (Dec 25, 2025)
  // ===========================================================================
  /** PH-10: "Dynamic Symbol Resolver" */
  PH_10_SYMBOL_RESOLVER: `Implement ticker recovery via Yahoo Search API.
Handle corporate actions: demergers, name changes, ticker migrations.
Example: TATAMOTORS.NS demerger -> TMCV.NS (Commercial), TMPV.NS (Passenger).`,

  // ===========================================================================
  // Phase 11-12: Groq Upgrade & Fibonacci (Dec 28 - Jan 1, 2026)
  // ===========================================================================
  /** PH-11: "Groq NLP Upgrade" */
  PH_11_GROQ_UPGRADE: `Migrate 7D Sentiment from Gemini to Groq (llama-3.3-70b).
Add FinBERT pre-filter (threshold 0.6) to reduce noise.
Implement TradeTrap-inspired Title+Summary double-filtering.
Result: < 500ms scoring with 14K RPD free tier.`,

  /** PH-12: "Macro HUD v2 & Fibonacci" */
  PH_12_MACRO_FIBONACCI: `Add Fibonacci level verification:
Check 0.382, 0.5, 0.618 retracement levels for entry/exit signals.
Upgrade Macro HUD:
- VIX Index (Volatility).
- Yield Curve (Economic health).
- Dollar Index (DXY).`,

  // ===========================================================================
  // Phase 13: Enterprise Security Audit (Jan 4-7, 2026)
  // ===========================================================================
  /** PH-13: "dafqnumb Protocol Security Audit" */
  PH_13_SECURITY_AUDIT: `Perform enterprise-grade security audit:
- Fix CWE-502 (Next.js RCE vulnerability).
- Create auth middleware for /dashboard and /api.
- Add security headers (CSP, X-Frame-Options, etc.).
- Install zod for input validation.
- Install eslint-plugin-security.
Enforce: "NO CODE UNTIL IMPLEMENTATION PLAN IS APPROVED."`,

  /** PH-13 Detail: "Security Documentation Suite" */
  PH_13_SECURITY_DOCS: `Create docs/security/ framework:
- 01_security_strategy.md (Threat model, governance)
- 02_security_architecture.md (Defense layers, RLS flows)
- 04_incident_response_playbook.md (P0-P3 procedures)
- 05_runbooks/ (Audit workflows)
- 06_compliance_evidence.md (Audit trail)`
};

/**
 * System prompt for all portfolio-related interactions
 */
export const PORTFOLIO_SYSTEM_PROMPT = `You are a professional financial analyst and portfolio advisor...`;
  