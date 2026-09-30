# Phase 0.2: Database Schema & Portfolio CRUD

**Status**: ✅ Complete  
**Date**: December 2, 2025

## Summary
Designed and implemented Supabase database schema for portfolios and holdings.

## Files Created/Modified

### Database (Supabase SQL)
```sql
-- portfolios table
CREATE TABLE portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- holdings table
CREATE TABLE holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  quantity DECIMAL NOT NULL,
  avg_cost DECIMAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Created
- `src/lib/db/portfolios.ts` - Portfolio CRUD operations
- `src/lib/db/holdings.ts` - Holdings CRUD operations
- `src/app/dashboard/page.tsx` - Main dashboard
- `src/app/portfolio/[id]/page.tsx` - Portfolio detail view

## Behavior Changes
1. Users can create multiple portfolios
2. Holdings track symbol, quantity, average cost
3. Server-side data fetching for dashboard
4. RLS policies restrict access to user's own data

## Commands to Run
```bash
# Run in Supabase SQL Editor
# Execute the schema SQL above
```

## Tests Added
- Manual portfolio creation/deletion
- Holdings add/remove verification

## Assumptions Made
- One user can have multiple portfolios
- Holdings are per-portfolio, not global
- Currency stored per holding for multi-currency support

## Risks Remaining
- No bulk import yet (CSV upload planned)
- Transaction history not tracked
