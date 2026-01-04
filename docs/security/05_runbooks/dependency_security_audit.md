# OrbitFolio Security Runbook: Dependency Security Audit

**Document Version**: 1.0  
**Last Updated**: January 4, 2026  
**Owner**: Security Team  
**Classification**: Internal Use  
**Execution Frequency**: Monthly + Pre-Deploy

---

## Purpose

This runbook provides a step-by-step process for auditing OrbitFolio's JavaScript dependencies for security vulnerabilities. Adapted from the Flutter security audit workflow for Next.js/npm ecosystem.

---

## Prerequisites

| Requirement | Command to Verify | Expected Output |
|-------------|------------------|-----------------|
| **Node.js installed** | `node --version` | `v18.x` or higher |
| **npm installed** | `npm --version` | `10.x` or higher |
| **Project cloned** | `ls package.json` | File exists |
| **Dependencies installed** | `ls node_modules` | Folder exists with packages |

---

## Step 1: Scope Analysis

### Objective
Identify sensitive data flows and potential entry points for attacks.

### 1.1 Identify Sensitive Data

| Data Type | Location in Code | Sensitivity | Protection Mechanism |
|-----------|-----------------|-------------|---------------------|
| **User Credentials** | Supabase Auth (not in codebase) | CRITICAL | Supabase manages hashing |
| **Session Tokens** | HTTPOnly cookies | HIGH | Not accessible to JavaScript |
| **API Keys** | `.env.local` (never committed) | CRITICAL | Environment variables only |
| **Portfolio Data** | Supabase database | HIGH | RLS policies |
| **User Email** | Supabase `auth.users` table | HIGH | RLS + Supabase Auth |

**Action**: Review `.gitignore` to ensure `.env.local` is never committed.

**Verification**:
```bash
git check-ignore .env.local
# Expected output: .env.local
```

### 1.2 Identify Entry Points

| Entry Point | File/Route | User Input Type | Validation Method |
|-------------|------------|-----------------|-------------------|
| **Login Form** | `/login` page | Email, Password | Supabase Auth |
| **Portfolio Creation** | `/api/portfolios` | Portfolio name | Zod Schema |
| **Add Holding** | `/api/holdings` | Symbol, Quantity, Price | Zod Schema |
| **Search** | `/api/search` | Query string | Zod Schema |
| **URL Parameters** | All routes | Dynamic segments | Next.js type checking |

**Action**: Update this table whenever new API routes are added.

---

## Step 2: Dependency Audit

###

 2.1 Check for Outdated Packages

**Command**:
```bash
cd /path/to/orbitfolio
npm outdated
```

**Example Output**:
```
Package      Current  Wanted  Latest  Location
next         16.0.8   16.1.1  16.1.1  node_modules/next
@types/node  20.10.0  20.11.0 20.11.0 node_modules/@types/node
```

**Interpretation**:
| Column | Meaning |
|--------|---------|
| **Current** | Version currently installed |
| **Wanted** | Latest version matching semver range in `package.json` |
| **Latest** | Absolute latest version (may include breaking changes) |

**Decision Matrix**:

| Scenario | Action | Risk |
|----------|--------|------|
| `Current == Wanted == Latest` | ✅ No action needed | None |
| `Current < Wanted`, same major version | `npm update [package]` | Low (non-breaking) |
| `Current << Latest`, major version jump | Research changelog, plan upgrade | Potential breaking changes |

### 2.2 Check for Known Vulnerabilities

**Command**:
```bash
npm audit
```

**Example Output** (from earlier Phase 13 work):
```
found 1 critical severity vulnerability
┌───────────────┬──────────────────────────────────────────┐
│ Severity      │ critical                                  │
│ Package       │ next                                      │
│ Patched in    │ >=16.0.9                                  │
│ Path          │ next                                      │
│ More info     │ https://github.com/advisories/GHSA-xxxx  │
└───────────────┴──────────────────────────────────────────┘
```

**Severity Classification**:

| Severity | Response Time | Action Required |
|----------|--------------|-----------------|
| **Critical** | < 24 hours | Immediate patch or workaround |
| **High** | < 7 days | Patch in next sprint |
| **Moderate** | < 30 days | Patch in next release |
| **Low** | Next scheduled update | Track, no urgency |

### 2.3 Automated Fix Attempt

**Command**:
```bash
npm audit fix
```

**What it does**:
- Automatically upgrades vulnerable packages to patched versions (if available)
- Only applies **non-breaking** updates (minor/patch versions)

**Verification**:
```bash
npm audit
# Expected: "found 0 vulnerabilities"
```

### 2.4 Manual Major Version Upgrades

**When**: `npm audit` reports vulnerabilities that `npm audit fix` cannot resolve.

**Process**:

| Step | Action | Example |
|------|--------|---------|
| 1 | Identify vulnerable package | `next@16.0.8` vulnerable |
| 2 | Check latest stable version | Visit npmjs.com/package/next |
| 3 | Review breaking changes | Read `next` changelog (GitHub releases) |
| 4 | Update `package.json` | Change `"next": "16.0.8"` → `"next": "16.1.1"` |
| 5 | Install | `npm install` |
| 6 | Test locally | `npm run dev`, test critical paths |
| 7 | Run build | `npm run build` |
| 8 | Deploy | Verify in production |

---

## Step 3: Vulnerability Checklist

### 3.1 Injection Attacks

| Attack Type | OrbitFolio Context | Mitigation | Verification |
|-------------|-------------------|------------|--------------|
| **SQL Injection** | Supabase queries | Parameterized queries (built-in) | Review `supabase.from()` calls |
| **Command Injection** | None (no shell exec in app) | N/A | Code review for `child_process` |
| **XSS (Cross-Site Scripting)** | User-generated content | React JSX auto-escaping | Manual test: Try `<script>alert(1)</script>` in inputs |

**XSS Test Procedure**:
1. Go to Add Holding form
2. Enter symbol: `<script>alert('XSS')</script>`
3. Submit form
4. **Expected**: Symbol is displayed as text (not executed)
5. **Failure**: Alert box appears → React escaping broken

### 3.2 Authentication & Session Management

| Vulnerability | Check | Expected Result |
|---------------|-------|-----------------|
| **Hardcoded Credentials** | Search codebase for `password = ` | 0 results |
| **Insecure Token Storage** | Inspect cookies in DevTools | `httpOnly: true`, `secure: true` |
| **Session Fixation** | Verify new session ID after login | Session ID changes |

**Command** (hardcoded credentials check):
```bash
grep -r "password\s*=" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules .
# Expected: No results (or only test fixtures)
```

### 3.3 Data Validation

| Input Field | Validation Rule | Implementation | Status |
|-------------|----------------|----------------|--------|
| **Portfolio Name** | 1-50 characters | Zod: `z.string().min(1).max(50)` | ✅ |
| **Symbol** | Uppercase, 1-10 chars | Zod: `z.string().transform(s => s.toUpperCase())` | ✅ |
| **Quantity** | Positive number | Zod: `z.number().positive()` | ✅ |
| **Price** | Non-negative number | Zod: `z.number().nonnegative()` | ✅ |

**Verification**:
1. Try submitting empty portfolio name → Expect 400 error
2. Try negative quantity → Expect 400 error
3. Check API response includes field-level errors

### 3.4 Logic Flaws

| Scenario | Test | Expected Behavior |
|----------|------|-------------------|
| **Access another user's portfolio** | Change portfolio ID in URL | 403 or empty result (RLS blocks) |
| **Skip authentication** | Access `/dashboard` without login | Redirect to `/login` |
| **Delete holding of another user** | Send DELETE request with wrong user's holding ID | 403 or no effect (RLS blocks) |

**Test Command** (using curl):
```bash
# Test: Access dashboard without auth
curl -I http://localhost:3000/dashboard
# Expected: HTTP/1.1 302 Found, Location: /login
```

---

## Step 4: Remediation

### 4.1 Issue Reporting Template

**Use this template to document findings**:

```markdown
## Vulnerability Report

**ID**: VULN-2026-001  
**Date Discovered**: [Date]  
**Severity**: [Critical/High/Medium/Low]  
**Package**: [npm package name]  
**Version Affected**: [version number]  
**CVE**: [CVE-2024-XXXXX] (if applicable)

### Description
[Brief description of the vulnerability]

### Impact
[What can an attacker do?]

### Remediation
[How to fix it]

### Verification
[How to confirm the fix works]

### Status
- [ ] Identified
- [ ] Fix implemented
- [ ] Tested locally
- [ ] Deployed to production
- [ ] Verified in production
```

### 4.2 Prioritization Matrix

| Severity + Exploitability | Action |
|---------------------------|--------|
| **Critical + Easy** | Drop everything, fix now |
| **Critical + Hard** | Fix within 24 hours |
| **High + Easy** | Fix within 7 days |
| **High + Hard** | Fix within 14 days |
| **Medium + Easy** | Fix in next sprint |
| **Medium + Hard** | Schedule for next release |
| **Low** | Track, fix opportunistically |

### 4.3 Fix Verification Checklist

After implementing a fix:

- [ ] **Local Testing**: Vulnerability no longer reproducible locally
- [ ] **npm audit**: Re-run and confirm issue resolved
- [ ] **Regression Testing**: Existing features still work
- [ ] **Code Review**: Changes reviewed by another developer (or AI)
- [ ] **Documentation**: Update security changelog
- [ ] **Deployment**: Deploy to production
- [ ] **Post-Deploy Verification**: Verify fix in production environment

---

## Appendices

### A. Common npm Audit Commands

| Command | Purpose |
|---------|---------|
| `npm audit` | Full vulnerability report |
| `npm audit --json` | Machine-readable output |
| `npm audit fix` | Auto-fix non-breaking updates |
| `npm audit fix --force` | Apply breaking changes (DANGEROUS) |
| `npm audit --production` | Only check production dependencies |

### B. Useful Security Resources

| Resource | URL | Purpose |
|----------|-----|---------|
| **npm Security Advisories** | https://github.com/advisories | Official CVE database |
| **Snyk Vulnerability DB** | https://snyk.io/vuln | Alternative vulnerability database |
| **OWASP Top 10** | https://owasp.org/www-project-top-ten/ | Web app security fundamentals |

### C. Related Documents

- [Security Strategy](../01_security_strategy.md)
- [Security Architecture](../02_security_architecture.md)
- [Security Review Checklist](./security_review_checklist.md)

---

**Classification**: Internal Use  
**Next Scheduled Execution**: February 1, 2026
