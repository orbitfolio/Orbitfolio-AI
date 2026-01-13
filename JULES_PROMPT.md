<instruction>You are an expert software engineer. You are working on a WIP branch. Please run `git status` and `git diff` to understand the changes and the current state of the code. Analyze the workspace context and complete the mission brief.</instruction>
<workspace_context>
<artifacts>
--- CURRENT TASK CHECKLIST ---
# OrbitFolio Development Task List

## Phase 14: The "Super-App" Upgrade 🚀

### 1. JSON Prompting Foundation 🏗️
- [ ] **Infrastructure**
  - [x] Create `lib/ai/schemas.ts` (Zod definitions for Analysis, Chat, Alert)
  - [x] Update `groq-client.ts` to enforce `json_object` mode
  - [x] Implement `validateAIResponse()` util with retry logic
  - [x] Setup Jules MCP Integration (Verified connection & First PR Merged)
- [ ] **Integration**
  - [ ] Update Stock Analysis prompt to use JSON schema
  - [ ] Update Risk Assessment prompt to use JSON schema
  - [x] Add Investment Persona types (Conservative, Balanced, Growth)
  - [x] Add Advanced Risk Metrics schema (Sharpe, Sortino, etc.)

### 2. Universal Data Router 🌐
- [ ] **Architecture**
  - [ ] Create `lib/data/router.ts` (The central price fetcher)
  - [ ] Implement `MFAPIAdapter` for India Mutual Funds
  - [ ] Implement `YahooAdapter` for stocks (US/IN)
  - [ ] Implement `CoinGeckoAdapter` for Crypto
- [ ] **UI**
  - [ ] Update "Add Holding" search to support all asset classes

### 3. Portfolio Optimization Engine 📊
- [ ] **Logic**
  - [ ] Implement `KellyCriterion` calculator
  - [ ] Implement `ValueAtRisk` (VaR) calculator
  - [ ] Implement `MinimumVariance` solver
- [ ] **Components**
  - [ ] Create `OptimizationPlayground.tsx` (Current vs. Optimized charts)
  - [ ] Add "Apply Optimization" action (simulated rebalance)

### 4. AI Chat Interface 💬
- [ ] **Backend**
  - [ ] `/api/ai/chat`: Endpoint with Portfolio Context injection
  - [ ] Persona System: 3 risk profiles (Conservative, Balanced, Growth)
  - [x] Create `lib/ai/config/personas.ts` (Persona definitions)
  - [ ] JSON Output: `{ "message": "...", "actions": ["..."] }`
- [ ] **Frontend**
  - [ ] `AIChatFloatingButton.tsx` (Global availability)
  - [ ] `ChatInterface.tsx` (Message bubbles, typing, streaming)
  - [ ] Persona selector dropdown (3 options)

### 5. Social Sentiment (Reddit) 📢
- [ ] **Scraper**
  - [ ] Client-side or Server-side fetcher for `r/wallstreetbets`, `r/IndianStreetBets`
  - [ ] Keyword filter for valid tickers
- [ ] **Analysis**
  - [ ] Apply FinBERT (via Groq) to post titles
  - [ ] Calculate "Hype Score" (0-100)
- [ ] **UI**
  - [ ] Add "Social Signal" widget to Stock Detail page

### 6. Alerts System (WhatsApp/Telegram) 🔔
- [ ] **Services**
  - [ ] Set up Twilio Client (WhatsApp) or Mock
  - [ ] Set up Telegram Bot API Client
- [ ] **Logic**
  - [ ] Create `AlertManager` service
  - [ ] Triggers: Price Targets, Score Changes, Earnings dates
- [ ] **UI**
  - [ ] User Settings: "Notification Channels"
  - [ ] "Set Alert" button on stock page

### 7. Orbit Gem Hunter 💎
- [ ] **Agent Logic**
  - [ ] Implement "Dip Finder" (Price < 52W High)
  - [ ] Implement "Reasoning Agent" (Fear vs. Fundamentals)
  - [ ] Implement "Quality Filter" (Orbit Score + Piotroski)
- [ ] **UI**
  - [ ] "Gem Hunter" Dashboard Widget
  - [ ] Result Card: "Why it's a Gem"

### 8. Experimental (LSTM + Voice) 🧪
- [ ] **Voice Interface**
  - [ ] Implement Web Speech API button (Mic icon)
  - [ ] Text-to-Speech synthesis for AI responses
- [ ] **Prediction**
  - [ ] TensorFlow.js model for simple linear regression/trend
  - [ ] "Predicted Price" cone on chart (with disclaimer)

---

## Phase 15: Growth & Onboarding 🔮
- [ ] **Demo Portfolio**: Pre-seeded data for instant value
- [ ] **Goal Tracking**
- [ ] **Peer Comparisons**

---

## Completed Phases ✅

### Phase 13: Enterprise Security Audit
- [x] Next.js security upgrade (RCE fix)
- [x] Authentication middleware
- [x] Security headers
- [x] Zod validation library
- [x] Security documentation suite

### Phase 12: Fibonacci & Macro HUD v2
- [x] Fibonacci level verification
- [x] Enhanced Macro HUD

### Phase 11: Groq Upgrade
- [x] Migrated to Llama-3-70b
- [x] Fast scoring (<500ms)

### Phase 10: Symbol Resolver
- [x] Dynamic ticker resolution
- [x] Demerger handling

### Phase 9: Risk Adapter
- [x] Sector-aware risk models

### Phase 7-8: VaR/Kelly Backtesting
- [x] VaR / Kelly logic (backend)

### Phase 6: NLP Scorer
- [x] 7-dimension sentiment

### Phase 5: India News
- [x] RSS feed integration

### Phase 1-4: Core Foundation
- [x] Orbit Score, Backtesting, Macro, Auth, DB

--- IMPLEMENTATION PLAN ---
# Phase 14: The "Super-App" Upgrade 🚀

## Goal
Transform OrbitFolio into a comprehensive AI investment assistant by implementing the **"JSON Prompting"** foundation and delivering the **6 Key Features** originally planned: Optimization, Data Routing, Chat, Social Sentiment, Predictive AI (LSTM), and Voice Interaction.

## User Review Required

> [!IMPORTANT]
> **This is a Massive Phase**: This phase combines 7 major initiatives (JSON Foundation + 6 Features). It transforms the app from a "tracker" to an "intelligent agent."
> **External Services**: Requires keys for **Twilio** (WhatsApp), **Reddit** (API), and **PortfolioOptimizer.io** (or local math fallback).

## 1. The Foundation: JSON Prompting (The "JSON Thing") 🏗️

**Goal**: Replace "chatty" AI text with strict, type-safe JSON for all intelligent features.

### Implementation
- **Schemas**: Zod definitions for `Analysis`, `Chat`, `Alert`, `Prediction`.
- **Groq Client**: Force `json_object` mode for all calls.
- **Validation**: Fail-fast pipeline (if JSON invalid -> retry -> fallback).
- **Jules Integration**: Leverage Google Jules for delegated development (tests, boilerplate) using the Jules-Antigravity MCP orchestration for automated safety reviews.
- **Benefit**: Enables reliable data piping and accelerates development through AI collaboration.

---

## 2. Portfolio Optimization Engine 📊

**Goal**: Implement "mathematically perfect" portfolio allocation.

### Implementation
- **Algorithmic Models**:
  - **Kelly Criterion**: Aggressive growth sizing.
  - **Value at Risk (VaR)**: Downside protection.
  - **Minimum Variance**: Stability focus.
- **UI**: "Optimization Playground" where users can toggle strategies and see "Current vs. Optimized" allocation charts.
- **Data Source**: Existing `RiskSectorAdapter` + new `PortfolioOptimizer.io` integration (free tier).

---

## 3. Universal Data Router 🌐

**Goal**: Seamlessly handle Indian Mutual Funds (NAV) and Global Stocks.

### Implementation
- **Unified Resolver**: `resolveSymbol(query)`
  - If `EndsWith .NS` -> Yahoo Finance (NSE)
  - If `MF ID` -> MFAPI.in (India Mutual Funds)
  - If `Crypto` -> CoinGecko
  - If `US` -> Yahoo Finance
- **Architecture**: Adapter pattern to normalize all data into `PricePoint`, `Holding`, `AssetClass` schemas.

---

## 4. AI Chat Interface 💬

**Goal**: Context-aware investment assistant with risk-filtered responses.

### Implementation
- **Tech**: Groq Llama-3 + JSON Prompting.
- **Investment Personas**: 3 risk profiles (user-selectable)
  - **Conservative**: P/E < 25, Dividend > 2%, Beta < 1.2, Piotroski ≥ 6
  - **Balanced**: P/E < 35, Revenue Growth > 10%, Quality focus
  - **Growth**: Revenue Growth > 20%, Innovation focus, accepts high P/E
- **Context Injection**: "Here is the user's portfolio: [JSON]. They ask: 'Should I sell TSLA?'"
- **Features**:
  - **Risk-Filtered Recommendations**: Responses aligned with selected persona
  - **Streaming Responses**: Real-time typing effect
  - **Citation**: "Based on RSI (68) and Sentiment (8.2)..."
  - **Action Buttons**: "Analyze Portfolio", "Suggest Rebalance"
- **Output**: Clean, criteria-based analysis (no investor name attribution)

---

## 5. Social Sentiment (Reddit) 📢

**Goal**: Capture the "Retail Pulse" (r/wallstreetbets, r/IndianStreetBets).

### Implementation
- **Sources**: Reddit API (free tier) or RSS fallbacks.
- **Analysis**:
  - **Volume**: Mention velocity.
  - **Sentiment**: Bullish/Bearish classification (FinBERT).
  - **Divergence**: Price going down vs. Hype going up (Risk signal).
- **UI**: "Social Hype" meter on stock detail pages.

---

## 6. Alerts System (WhatsApp & Telegram) 🔔

**Goal**: Proactive notifications where users actually look.

### Implementation
- **Channels**:
  - **WhatsApp**: Twilio Sandbox (Free) or Business API.
  - **Telegram**: Telegram Bot API (Free).
- **Triggers**:
  - "Score dropped below 5.0"
  - "RSI > 70 (Overbought)"
  - "New 52-week high"
- **User Config**: "Notification Settings" panel in Dashboard.

---

## 7. Experimental Features (LSTM + Voice) 🧪

### A. LSTM Prediction Prototype
- **Goal**: Simple price trend prediction (Next 3-5 days).
- **Tech**: `TensorFlow.js` (client-side) or simple Python microservice.
- **Disclaimer**: "Experimental - Not Financial Advice".

### B. Voice Interface
- **Goal**: "Hey Orbit, how's my portfolio?"
- **Tech**: Web Speech API (Browser Native - Free) for STT.
- **Flow**: Voice -> Text -> AI Chat -> Text -> Speech Synthesis.

---

## 8. Orbit Gem Hunter (Undervalued Stock Agent) 💎

**Goal**: Automate the search for high-quality stocks trading at a discount.

### Implementation
- **Source**: Reddit "Prompt Design" Strategy + Orbit AI Score.
- **Workflow**:
  1. **Scan**: Find sector stocks down >10% in [Timeframe].
  2. **Analyze**: AI determines if dip is "Fear" (Opportunity) or "Fundamental" (Trap).
  3. **Verify**: Filter for Piotroski Score > 6.
  4. **Report**: Present Top 3 "Hidden Gems" with Entry Points.
- **UI**: "Run Gem Hunter" button in Market HUD.

---

## Implementation Roadmap

### Part A: Core & Infrastructure (Days 1-2)
- [x] JSON Prompting Infrastructure (Schemas, Groq Client)
- [ ] Data Router Refactoring (MFAPI + Yahoo Unified)
- [x] Jules MCP Integration & Automation Setup (Practice Task Complete)

### Part B: Intelligence & Optimization (Days 3-4)
- [ ] Portfolio Optimization UI & Logic (with Advanced Risk Metrics)
- [ ] AI Chat Interface (with Portfolio Context + Persona System)

### Part C: Social & Alerts (Days 5-6)
- [ ] Reddit Sentiment Scraper
- [ ] WhatsApp/Telegram Bot Setup & Integration

### Part D: Gem Hunter & Experimental (Day 7+)
- [ ] Orbit Gem Hunter Workflow
- [ ] LSTM Prediction Model
- [ ] Voice Command Interface

## Phase 15: Growth & Onboarding (Future) 🔮

- [ ] **Demo Portfolio**: "One-Click" sample data for new users.
- [ ] **Goal Tracker**: Progress bars for "Retirement", "House", etc.
- [ ] **Competitor Comparison**: Benchmark against S&P 500 / Nasdaq.
- [ ] **Rebalance Logic**: "Sell X, Buy Y" calculator.

---

## Verification Plan

### Automated
- **JSON Validator**: Test AI responses against Zod schemas.
- **Router Tests**: Verify AAPL (US), RELIANCE.NS (IN), and 12345 (MF) all return valid prices.
- **Persona Tests**: Verify Conservative rejects high-P/E stocks, Growth accepts them.

### Manual
- **Chat**: Ask specific questions about holdings ("What is my risk exposure?").
- **Alerts**: Trigger a mock alert and verify receipt on Telegram/WhatsApp.
- **Optimization**: Check if "Optimized" allocation sums to 100%.
</artifacts>
</workspace_context>
<mission_brief>
Phase 14 - Task 3: Create a dedicated Stock Analysis prompt file.

1. Create a NEW file: `lib/ai/prompts/stock-analysis.ts`.
2. Import `StockAnalysisSchema` from `../schemas.ts`.
3. Implement a function `getStockAnalysisPrompt(symbol, financialData)` that returns a system prompt.
4. Requirements for the prompt:
   - Force strict JSON output using the `StockAnalysisSchema`.
   - Add instruction: "You must respond with valid JSON matching this exact structure: {symbol, orbitScore, breakdown, signal, sentiment, opportunities, risks, generatedAt}".
   - Include the word "JSON" explicitly to satisfy Groq's requirement.
5. Migration: Update [lib/ai/prompts/portfolio-analysis.ts](cci:7://file:///C:/Users/Bhavna/Desktop/orbitfolio/lib/ai/prompts/portfolio-analysis.ts:0:0-0:0) to export a wrapper for [getHoldingAnalysisPrompt](cci:1://file:///C:/Users/Bhavna/Desktop/orbitfolio/lib/ai/prompts/portfolio-analysis.ts:66:0-102:1) that points to this new logic.
</mission_brief>