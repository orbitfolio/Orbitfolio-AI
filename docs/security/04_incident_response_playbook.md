# OrbitFolio Security Framework: Incident Response Playbook

**Document Version**: 1.0  
**Last Updated**: January 4, 2026  
**Owner**: Security Team  
**Classification**: CONFIDENTIAL

---

## Purpose

This playbook provides step-by-step procedures for identifying, containing, and recovering from security incidents affecting OrbitFolio.

---

## 1. Incident Classification

### Decision Tree: Is This a Security Incident?

| Indicator | Example | Security Incident? |
|-----------|---------|-------------------|
| **Unauthorized Data Access** | User reports seeing another user's portfolio | ✅ YES (P0) |
| **Authentication Bypass** | Login without credentials | ✅ YES (P0) |
| **Data Breach** | Database credentials leaked on GitHub | ✅ YES (P0) |
| **Malware Detection** | Virus scan alerts on server | ✅ YES (P1) |
| **Suspicious Activity** | Multiple failed login attempts | ✅ YES (P2) |
| **Application Error** | 500 error on API call | ❌ NO (Operations issue) |
| **Slow Performance** | Dashboard loading slowly | ❌ NO (Performance issue) |

### Severity Levels

| Severity | Definition | Response Time | Escalation |
|----------|------------|---------------|------------|
| **P0 (Critical)** | Active data breach, auth bypass, RCE | **Immediate** (< 15 min) | Notify founder immediately |
| **P1 (High)** | Potential breach, privilege escalation | **< 1 hour** | Notify founder within 1 hour |
| **P2 (Medium)** | Suspicious activity, failed intrusion attempt | **< 4 hours** | Document and monitor |
| **P3 (Low)** | Security policy violation, minor config issue | **< 24 hours** | Fix in next sprint |

---

## 2. Incident Response Phases

### Phase 1: Detection & Analysis

**Objective**: Determine if an incident occurred and its scope.

| Step | Action | Responsible | Completion Criteria |
|------|--------|-------------|---------------------|
| 1 | Receive alert or report | Security Team | Incident ticket created |
| 2 | Initial triage | Security Lead |Severity assigned (P0-P3) |
| 3 | Gather evidence | Developer | Logs collected, screenshots taken |
| 4 | Determine scope | Security Lead | Affected users/data identified |

**Evidence Checklist**:
- [ ] Timestamp of incident
- [ ] Affected user IDs
- [ ] IP addresses involved
- [ ] Error messages/logs
- [ ] Database query logs (if applicable)
- [ ] Supabase Auth logs

### Phase 2: Containment

**Objective**: Stop the incident from spreading.

#### P0/P1 Containment Actions

| Incident Type | Immediate Action | Long-term Containment |
|---------------|-----------------|----------------------|
| **Data Breach (RLS failure)** | Disable affected table, enable RLS | Re-deploy RLS policies, audit all tables |
| **Stolen API Keys** | Rotate keys in Supabase/Vercel | Update `.env.local`, redeploy |
| **Auth Bypass** | Force logout all users | Patch middleware, reset sessions |
| **XSS Exploit** | Take affected page offline | Sanitize input, deploy CSP fix |

#### P2/P3 Containment Actions

| Incident Type | Action |
|---------------|---------|
| **Brute Force Attack** | Enable Supabase rate limiting (if available) |
| **Suspicious IP** | Block IP in Vercel settings |

### Phase 3: Eradication

**Objective**: Remove the root cause.

| Root Cause | Eradication Steps | Verification |
|------------|------------------|--------------|
| **Vulnerable Dependency** | `npm audit fix`, redeploy | `npm audit` returns 0 vulnerabilities |
| **Missing RLS Policy** | Create policy via SQL, test | Run RLS verification runbook |
| **Insecure Configuration** | Update `next.config.js`, redeploy | Check headers in browser DevTools |
| **Compromised Credentials** | Rotate all secrets | Test with old credentials (should fail) |

### Phase 4: Recovery

**Objective**: Restore normal operations.

| Step | Action | Verification |
|------|--------|--------------|
| 1 | Deploy patched code | Build succeeds, no errors |
| 2 | Verify fix in production | Run smoke tests |
| 3 | Monitor for recurrence | Check logs for 24 hours |
| 4 | Notify affected users (if breach) | Email sent via Supabase |

**User Communication Template** (for data breaches):

```
Subject: Security Notice - Action Required

Dear [User],

We recently identified a security issue that may have affected your OrbitFolio account.

What Happened:
[Brief description]

What We Did:
[Actions taken to fix]

What You Should Do:
1. Change your password immediately
2. Review your portfolio for unauthorized changes
3. Enable two-factor authentication (when available)

We take security seriously and apologize for any inconvenience.

OrbitFolio Security Team
```

### Phase 5: Post-Incident Review

**Objective**: Learn and improve.

**Review Meeting Agenda**:

| Topic | Questions to Answer |
|-------|---------------------|
| **Timeline** | When did it start? When detected? When contained? |
| **Root Cause** | What was the underlying issue? |
| **Detection** | How was it discovered? Could we detect it sooner? |
| **Response** | What went well? What

 delayed us? |
| **Prevention** | How do we prevent this in the future? |

**Action Items Template**:

```markdown
## Post-Incident Action Items

**Incident ID**: INC-2026-001  
**Date**: [Date]  
**Severity**: P0

### Immediate Actions (< 7 days)
- [ ] [Action 1]
- [ ] [Action 2]

### Long-term Improvements (< 30 days)
- [ ] [Action 3]
- [ ] [Action 4]

### Process Improvements
- [ ] Update runbook with new procedures
- [ ] Add monitoring for similar issues
```

---

## 3. Common Incident Scenarios

### Scenario 1: User Reports "I Can See Someone Else's Portfolio"

**Severity**: P0 (Critical)

**Immediate Actions**:
1. Verify report (ask for screenshot)
2. Check if RLS is enabled: `SELECT rowsecurity FROM pg_tables WHERE tablename='portfolios';`
3. If `false`: Enable RLS immediately: `ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;`
4. Force logout all users
5. Run RLS verification runbook

**Root Cause Checklist**:
- [ ] RLS disabled on table
- [ ] RLS policy missing
- [ ] Policy logic error (wrong `user_id` check)
- [ ] Database migration failed to apply policies

### Scenario 2: GitHub Repository Accidentally Made Public

**Severity**: P0 (if `.env.local` committed), P2 (if not)

**Immediate Actions**:
1. Make repository private again
2. Check Git history for `.env.local`: `git log --all --full-history -- .env.local`
3. If found: Assume all secrets compromised
4. Rotate ALL API keys:
   - Supabase: Generate new anon/service keys
   - TwelveData: Rotate API key
   - Groq: Rotate API key
5. Update Vercel environment variables
6. Redeploy application

### Scenario 3: Dependency Vulnerability (npm audit critical)

**Severity**: P1 (High)

**Actions**:
1. Run `npm audit` to identify package
2. Check if `npm audit fix` resolves it
3. If not: Research exploit (is it actively exploited?)
4. If yes: Immediate patch or temporary workaround
5. If no: Schedule fix within 24 hours
6. Test thoroughly before deploy
7. Monitor for exploitation attempts in logs

---

## 4. Escalation Matrix

### Internal Escalation

| Role | Contact Method | Response Time |
|------|---------------|---------------|
| **Security Lead (Bhavna)** | Primary contact | Immediate |
| **Developer (Bhavna)** | Same person | N/A |

### External Escalation

| Severity | Notify | When |
|----------|--------|------|
| **P0 Data Breach** | Affected users | Within 24 hours |
| **P0 Data Breach (>50 users)** | Legal counsel | Immediately |
| **P1** | Users (optional) | After fix deployed |

---

## 5. Tools & Resources

### Monitoring & Logs

| Tool | Access | Use Case |
|------|--------|----------|
| **Vercel Logs** | https://vercel.com/dashboard | Application errors, API logs |
| **Supabase Logs** | Dashboard → Logs | Auth logs, database queries |
| **Browser DevTools** | F12 in browser | Client-side errors, network requests |

### Incident Tracking

Use `docs/security/incidents/` folder:

```
incidents/
├── INC-2026-001_rls_failure.md
├── INC-2026-002_npm_vuln.md
└── template.md
```

---

## Appendices

### A. Incident Report Template

```markdown
## Incident Report

**ID**: INC-2026-XXX  
**Date Detected**: [Date and Time]  
**Severity**: [P0/P1/P2/P3]  
**Status**: [Detected/Contained/Resolved]

### Summary
[1-2 sentence description]

### Timeline
- [Time]: Incident occurred
- [Time]: Detected
- [Time]: Contained
- [Time]: Resolved

### Impact
- Users affected: [Number]
- Data exposed: [Yes/No, details]
- Downtime: [Duration]

### Root Cause
[Detailed analysis]

### Remediation
[What was done to fix]

### Prevention
[How to prevent in future]
```

---

**Classification**: CONFIDENTIAL  
**Distribution**: Security Team Only
