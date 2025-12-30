# OrbitFolio Workspace Rules

This file contains all OrbitFolio-specific AI rules and protocols. Place this in the workspace root or reference it from `/rules/`.

---

## Project Context

**OrbitFolio** is a multi-market portfolio analyzer (US, CA, IN) with AI-powered stock scoring.

| Constraint | Value |
|------------|-------|
| Budget | Zero (free-tier APIs only) |
| Tech Stack | Next.js 16, TypeScript, Supabase |
| AI Providers | Groq (primary), Mistral (fallback) |
| Markets | US, Canada, India |

---

## Enterprise AI Workflow (dafqnumb Protocol)

### The Golden Rule
**NO CODE UNTIL THE IMPLEMENTATION PLAN IS APPROVED.**

Before writing any code for a new feature:
1. Read `/rules/` folder (especially `ai-constraints.md`, `testing-tdd.md`)
2. Reference `project-spec.md` for OrbitFolio scope and constraints
3. Create/update `implementation_plan.md` with Phases and Tasks
4. Request user approval via `notify_user` with `BlockedOnUser: true`
5. Only proceed to code after explicit approval

### Traceability Requirements
- Every Phase MUST write to `aiChangeLog/phase-XX-name.md`
- No deletions without explicit user approval
- Always show Before/After deltas for **8 benchmark stocks**
- Update `task.md` and `implementation_plan.md` after each phase

---

## OrbitFolio AI Score Verification Protocol

After implementing any feature that modifies the Orbit AI Score, you MUST:

### 1. Run Production Build
```bash
npm run build
# Must complete without errors
```

### 2. Smoke Test 8 Benchmark Stocks
Test via API calls to `/api/orbitfolio-score?symbol=XXX`:

| Category | Stocks |
|----------|--------|
| **US Tech** | MSFT, NVDA, TSLA, GOOGL |
| **India** | RELIANCE.NS, TCS.NS |
| **Canadian Banks** | TD.TO, RY.TO |

**Record Before & After scores for comparison.**

### 3. Verify Feature Activation
Check the JSON response for:

| Stock Type | Required Field | Expected Value |
|------------|----------------|----------------|
| Bank Stocks | `academic.bankZ` | Present with score |
| Tech Stocks | `academic.altmanZ` | Uses `double_prime` variant |
| Indian Stocks | `dataSources.sentiment` | `true` |
| All Stocks (if Macro HUD) | `breakdown.macroRegime` | Present with score |

### 4. Update Artifacts
After verification:
- `aiChangeLog/phase-XX.md` — Add phase-specific changelog
- `ai_score_comparison.md` — Log Before/After deltas
- `walkthrough.md` — Add proof of verification

---

## 8-Pillar Development Framework

Apply these principles to all OrbitFolio feature work:

1. **Perception** — Verify data sources and API limits per market (US, CA, IN)
2. **Memory** — Log predictions before implementation; outcomes after testing
3. **Reasoning** — Prefer evidence and backtesting over assumptions
4. **Planning** — Decompose work into phases with dependencies
5. **Tool Use** — Test integrations in isolation; document fallbacks
6. **Execution** — Implement with resilient fallback logic
7. **Feedback** — Measure everything; user feedback is ground truth
8. **Orchestration** — Design for automation, observability, cost, and rate limits

---

## Documentation Contract

After significant work, update immediately:

| Artifact | Purpose |
|----------|---------|
| `task.md` | Granular task tracking with checkboxes |
| `implementation_plan.md` | Phases, verification, completion status |
| `aiChangeLog/phase-XX.md` | Detailed changelog per phase |
| `master_project_history.md` | Major features, decisions, outcomes |
| `ai_score_comparison.md` | Before/After score comparisons |

---

## API Rate Limits

| Provider | Limit | Usage |
|----------|-------|-------|
| TwelveData | 800/day | Technical indicators |
| Groq | 14,000 RPD | 7D Sentiment scoring |
| Finnhub | 60/min | Analyst data |
| Yahoo Finance | Unlimited | Fundamentals, VIX |
| HuggingFace | Varies | FinBERT noise filter |

---

## Feature Status Tracking

When a feature or decision is finalized, mark status:

- ✅ **Approved** — Include approval reason
- ❌ **Rejected** — Include rejection reason
- 🔲 **Planned** — Not yet started

Update in:
- `task.md`
- `implementation_plan.md`
- `aiChangeLog/`
