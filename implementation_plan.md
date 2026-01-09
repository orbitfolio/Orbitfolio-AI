# Implementation Plan: Historical Prompt Centralization & Architectural Alignment

**Goal**: Centralize all "Key Prompts" used from Dec 2, 2025, to Jan 8, 2026, into the new AI architecture foundation. Ensure the architecture reflects the full project context and addresses the user's "Key Discovery" requirements.

## User Review Required

> [!IMPORTANT]
> **Key Discovery Prompts**: I will include the **Foundational Inception Prompt** from Dec 2, 2025, which defined the "Zero Budget" multi-market analyzer concept. I've categorized 7 core prompt sets (Inception, Scoring, Sentiment, Macro, Risk, Resolver, Audit).
> 
> **Cache Utility Clarification**: The `clear-cache.ts` script is strictly for **AI Inference Cache** (`data/cache/`). It does **NOT** clear browser cache, system cache, or user sessions. It purely helps developers refresh AI responses if prompt templates change. 
> *I will proceed with implementing this only if you approve its refined scope.*

## Proposed Changes

### [Component] AI Prompt Library

#### [MODIFY] [portfolio-analysis.ts](file:///C:/Users/Bhavna/Desktop/orbitfolio/lib/ai/prompts/portfolio-analysis.ts)
- **Action**: Add historical key prompts for:
    - **7D Sentiment Engine** (Phase 11) - Detailed NLP dimensions.
    - **Macro Regime Overlay** (Phase 3/12) - The +4/-4 checklist logic.
    - **Technical Analysis (Fibonacci)** (Phase 12) - Retracement and trend strength.
    - **Security & Audit Agent** (Phase 13) - Prompt used for the recent security audit.
    - **Scoring Engine Definition** (Phase 1) - Prompt that defined the 45/25/20/10 weighting logic.
    - **Symbol Resolver** (Phase 10) - Logic for multi-market ticker resolution.

---

### [Component] Documentation & Traceability

#### [MODIFY] [README.md](file:///C:/Users/Bhavna/Desktop/orbitfolio/docs/ai/README.md)
- **Action**: Add "Historical Context" section documenting the evolution of prompts from inception (Dec 2) to current state.

---

### [Component] AI Architecture Utilities

#### [NEW] [clear-cache.ts](file:///C:/Users/Bhavna/Desktop/orbitfolio/scripts/ai/clear-cache.ts)
- **Action**: Add safe utility to clear files in `data/cache/`.
- **Safety**: Includes confirmation prompt or `--force` flag.

---

## Verification Plan

### Automated Tests
- Run `npm run build` to ensure prompt templates are correctly typed and don't break the build.

### Manual Verification
- Review the centralized prompt library to ensure it captures the "Key Discoveries" from Dec 2 - Jan 8.
- Verify that the `clear-cache.ts` script executes without error.

#### Benchmark Stocks Check
I will verify that the historical prompts correctly reference the logic used for the 8 benchmark stocks (MSFT, NVDA, RELIANCE.NS, etc.).
