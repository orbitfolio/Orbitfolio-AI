# OrbitFolio Security Runbook: RLS (Row Level Security) Verification

**Document Version**: 1.0  
**Last Updated**: January 4, 2026  
**Owner**: Security Team  
**Classification**: Internal Use  
**Execution Frequency**: After DB schema changes

---

## Purpose

This runbook verifies that Supabase Row Level Security (RLS) policies correctly enforce data isolation between users.

---

## Prerequisites

| Requirement | Verification |
|-------------|--------------|
| **Supabase access** | Can login to dashboard |
| **Project ID known** | `ytxodldcvotwcduznoje` (production) |
| **Test user accounts** | At least 2 test users created |

---

## Step 1: List All RLS Policies

### Using Supabase MCP

```typescript
mcp_supabase-mcp-server_execute_sql({
  project_id: "ytxodldcvotwcduznoje",
  query: "SELECT * FROM pg_policies WHERE schemaname = 'public';"
})
```

### Expected Output

Should return **16 policies** across 4 tables:

| Table | Policies Count | Operations Covered |
|-------|----------------|-------------------|
| **portfolios** | 4 | SELECT, INSERT, UPDATE, DELETE |
| **holdings** | 4 | SELECT, INSERT, UPDATE, DELETE |
| **transactions** | 4 | SELECT, INSERT, UPDATE, DELETE |
| **watchlist** | 4 | SELECT, INSERT, UPDATE, DELETE |

---

## Step 2: Verify RLS is Enabled

### SQL Query

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('portfolios', 'holdings', 'transactions', 'watchlist');
```

### Expected Result

| tablename | rowsecurity |
|-----------|-------------|
| portfolios | true |
| holdings | true |
| transactions | true |
| watchlist | true |

**If ANY table shows `false`**: RLS is disabled! Fix immediately:

```sql
ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;
```

---

## Step 3: Test Data Isolation

### Test Scenario: User A Cannot Access User B's Portfolio

**Setup**:
1. Create Test User A: `testa@example.com`
2. Create Test User B: `testb@example.com`
3. User A creates Portfolio "Test Portfolio A"
4. User B creates Portfolio "Test Portfolio B"

**Test Query** (Run as User B):
```sql
SELECT * FROM portfolios WHERE name = 'Test Portfolio A';
```

**Expected Result**: **0 rows returned** (User B cannot see User A's portfolio)

**Failure Mode**: If rows are returned, RLS is BROKEN. Check:
1. Is RLS enabled? (`ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;`)
2. Are policies created? (re-run Step 1)
3. Is `user_id` column populated correctly?

---

## Step 4: Test Policy Logic

### 4.1 Portfolios Table

**Policy Logic**: `auth.uid() = user_id`

**Test**:
```sql
-- Logged in as User A
INSERT INTO portfolios (name, user_id) VALUES ('Portfolio X', auth.uid());
-- Should succeed

INSERT INTO portfolios (name, user_id) VALUES ('Portfolio Y', '00000000-0000-0000-0000-000000000000');
-- Should FAIL (cannot insert with different user_id)
```

### 4.2 Holdings Table (Cascading Policy)

**Policy Logic**: `EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = holdings.portfolio_id AND portfolios.user_id = auth.uid())`

**Test**:
```sql
-- User A: Get their portfolio ID
SELECT id FROM portfolios WHERE user_id = auth.uid() LIMIT 1;
-- Store result as portfolio_a_id

-- User B: Try to add holding to User A's portfolio
INSERT INTO holdings (portfolio_id, symbol, quantity, average_price, type)
VALUES ('[portfolio_a_id]', 'TSLA', 10, 250.00, 'STOCK');
-- Should FAIL (cannot insert into another user's portfolio)
```

---

## Step 5: Verify Using Supabase Dashboard

### Manual UI Check

1. Login to Supabase Dashboard
2. Go to **Database** → **Policies**
3. For each table, verify:

| Check | Expected |
|-------|----------|
| RLS Enabled | Toggle is ON |
| Policy Count | 4 per table (SELECT, INSERT, UPDATE, DELETE) |
| Policy Type | PERMISSIVE (not RESTRICTIVE) |
| Using Function | `auth.uid()` is used |

---

## Step 6: Test Edge Cases

### 6.1 Authenticated User Without Data

**Scenario**: New user logs in for first time (no portfolios created yet)

**Test**:
```sql
SELECT * FROM portfolios;
-- Expected: 0 rows (not an error)
```

### 6.2 Update Attempt on Foreign Portfolio

**Test**:
```sql
-- User A gets User B's portfolio ID
SELECT id FROM portfolios WHERE user_id != auth.uid() LIMIT 1;
-- Store as portfolio_b_id

UPDATE portfolios SET name = 'Hacked' WHERE id = '[portfolio_b_id]';
-- Expected: 0 rows affected (RLS blocks silently)
``

`

### 6.3 Delete Cascade Protection

**Test**:
```sql
-- User A tries to delete User B's portfolio
DELETE FROM portfolios WHERE id = '[portfolio_b_id]';
-- Expected: 0 rows affected
```

---

## Troubleshooting

### Issue: RLS Policies Not Applying

**Symptoms**:
- Users can see each other's data
- SQL queries return unexpected rows

**Diagnosis**:

| Check | Command | Fix |
|-------|---------|-----|
| RLS Enabled? | `SELECT rowsecurity FROM pg_tables WHERE tablename='portfolios';` | `ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;` |
| Policies Exist? | `SELECT * FROM pg_policies;` | Re-create policies (see migration files) |
| Correct User ID? | `SELECT auth.uid();` (in Supabase SQL Editor) | Ensure logged in |

### Issue: "Permission Denied" Errors

**Symptoms**:
- Legitimate operations fail with `permission denied for table`

**Diagnosis**:
- Check if `anon` or `authenticated` role is granted in policies
- Verify policy uses `FOR ALL` or specific operation (`FOR SELECT`, etc.)

**Fix**:
```sql
-- Grant necessary permissions
GRANT ALL ON TABLE portfolios TO authenticated;
GRANT SELECT ON TABLE portfolios TO anon;
```

---

## Compliance Documentation

### Audit Evidence

After verification, document results:

```markdown
## RLS Audit Report

**Date**: [Date]  
**Auditor**: [Name]  
**Project**: ytxodldcvotwcduznoje

### Results

- [ ] All tables have RLS enabled
- [ ] 16 policies confirmed active
- [ ] Data isolation test PASSED
- [ ] Edge case tests PASSED

### Issues Found

[None / List issues]

### Remediation

[N/A / Actions taken]
```

---

## Related Documents

- [Security Architecture](../02_security_architecture.md)
- [Security Policies](../03_security_policies.md)

---

**Classification**: Internal Use  
**Next Verification Due**: After next database migration
