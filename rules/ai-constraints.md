# AI Development Constraints

## The Golden Rule
**NO CODE UNTIL THE IMPLEMENTATION PLAN IS APPROVED.**

Before writing any code, Antigravity must:
1. Understand the request fully
2. Create/update `implementation_plan.md` with:
   - Goal description
   - User review items (if any)
   - Proposed changes grouped by component
   - Verification plan
3. Request user approval via `notify_user`
4. Only proceed to code after explicit approval

## Planning Requirements
- Break work into **Phases** (think epics)
- Each Phase has **Tasks** (think features)
- Each task should be specific and reviewable
- Example format:
  ```
  ### Phase 1: News Service Upgrade
  - [ ] Task 1: Add FinBERT noise filter
  - [ ] Task 2: Integrate 7D sentiment scorer
  - [ ] Task 3: Update API route
  - [ ] Task 4: Write aiChangeLog/phase-01.md
  ```

## Code Modification Rules
1. **NO DELETIONS** without explicit user approval
2. Prefer small, incremental changes over large rewrites
3. Always show before/after diffs when modifying existing code
4. Back up critical files before major refactors

## Traceability Requirements
- Every phase MUST update `aiChangeLog/phase-XX-name.md`
- Changelog must include:
  - Files created/modified
  - Behavior changes
  - Commands to run
  - Tests added
  - Assumptions made
  - Risks remaining

## Verification Protocol
After implementing any feature that modifies the Orbit AI Score:
1. Run `npm run build` → confirm success
2. Smoke Test 8 Benchmark Stocks (MSFT, NVDA, TSLA, GOOGL, RELIANCE.NS, TCS.NS, TD.TO, RY.TO)
3. Compare Before vs After scores
4. Update `ai_score_comparison.md` with deltas
5. Update `walkthrough.md` with proof of work

## Documentation Updates
After significant work, immediately update:
- `task.md` → mark items complete
- `implementation_plan.md` → update phase status
- `aiChangeLog/` → add phase-specific changelog
- `master_project_history.md` → log major decisions
