# OrbitFolio Security Framework: Compliance Evidence

**Document Version**: 1.0  
**Last Updated**: January 4, 2026  
**Owner**: Security Team  
**Classification**: Internal Use

---

## Purpose

This document serves as an audit trail and evidence repository demonstrating OrbitFolio's security controls implementation from project inception (Dec 2, 2025) through Phase 13 completion (Jan 4, 2026).

---

## 1. Security Controls Implementation Timeline

| Date | Phase | Security Control Implemented | Evidence Location |
|------|-------|----------------------------|-------------------|
| Dec 2, 2025 | Phase 0 | `.gitignore` configured (secrets excluded) | [.gitignore](file:///C:/Users/Bhavna/Desktop/orbitfolio/.gitignore) |
| Dec 2-25, 2025 | Phase 1-12 | Authentication via Supabase Auth | [aiChangeLog/phase-00.1](file:///C:/Users/Bhavna/Desktop/orbitfolio/aiChangeLog/phase-00.1-authentication.md) |
| Dec 2-25, 2025 | Phase 1-12 | RLS policies created on all tables | Supabase Dashboard |
| Jan 4, 2026 | Phase 13 | Authentication middleware (`middleware.ts`) | [middleware.ts](file:///C:/Users/Bhavna/Desktop/orbitfolio/middleware.ts) |
| Jan 4, 2026 | Phase 13 | Security headers (CSP, HSTS, XFO) | [next.config.js](file:///C:/Users/Bhavna/Desktop/orbitfolio/next.config.js) |
| Jan 4, 2026 | Phase 13 | Input validation (Zod schemas) | [schemas.ts](file:///C:/Users/Bhavna/Desktop/orbitfolio/lib/validations/schemas.ts) |
| Jan 4, 2026 | Phase 13 | Dependency vulnerability fix (Next.js) | [aiChangeLog/phase-13](file:///C:/Users/Bhavna/Desktop/orbitfolio/aiChangeLog/phase-13-enterprise-security.md) |
| Jan 4, 2026 | Phase 13 | Compliance disclaimer footer | [ComplianceFooter.tsx](file:///C:/Users/Bhavna/Desktop/orbitfolio/app/components/ComplianceFooter.tsx) |

---

## 2. Row Level Security (RLS) Evidence

### 2.1 RLS Status

**Verification Date**: January 4, 2026

| Table | RLS Enabled | Policies Count | Last Verified |
|-------|-------------|----------------|---------------|
| `portfolios` | ✅ YES | 4 (CRUD) | Jan 4, 2026 |
| `holdings` | ✅ YES | 4 (CRUD) | Jan 4, 2026 |
| `transactions` | ✅ YES | 4 (CRUD) | Jan 4, 2026 |
| `watchlist` | ✅ YES | 4 (CRUD) | Jan 4, 2026 |

**Total Policies**: 16 active

**Verification Method**: SQL query via Supabase MCP
```sql
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

### 2.2 Sample RLS Policy

**Table**: `portfolios`  
**Operation**: SELECT  
**Policy Name**: "Users can view their own portfolios"  
**Logic**: `auth.uid() = user_id`

**Evidence**: Supabase Dashboard screenshot (future enhancement)

---

## 3. Dependency Security Evidence

### 3.1 Vulnerability Scan Results

**Scan Date**: January 4, 2026  
**Tool**: `npm audit`  
**Command**: `npm audit --production`

**Results**:

| Severity | Count (Before Phase 13) | Count (After Phase 13) | Change |
|----------|------------------------|------------------------|--------|
| Critical | 1 | 0 | ✅ Fixed |
| High | 0 | 0 | - |
| Moderate | 0 | 0 | - |
| Low | 0 | 0 | - |

**Critical Vulnerability Details**:

| Package | Version (Vulnerable) | CVE | Fixed in Version | Fix Date |
|---------|---------------------|-----|------------------|----------|
| `next` | 16.0.0-beta.8 | CWE-502 | 16.1.1 | Jan 4, 2026 |

**Evidence**: [aiChangeLog/phase-13](file:///C:/Users/Bhavna/Desktop/orbitfolio/aiChangeLog/phase-13-enterprise-security.md)

---

## 4. Authentication & Authorization Evidence

### 4.1 Authentication Middleware

**Implementation Date**: January 4, 2026  
**File**: `middleware.ts`  
**Protected Routes**:

| Route Pattern | Protection Method | Evidence |
|--------------|-------------------|----------|
| `/dashboard/*` | Session check → Redirect to `/login` | [middleware.ts:18-21](file:///C:/Users/Bhavna/Desktop/orbitfolio/middleware.ts#L18-L21) |
| `/api/*` (except `/api/auth`) | Session check → 401 error | [middleware.ts:23-28](file:///C:/Users/Bhavna/Desktop/orbitfolio/middleware.ts#L23-L28) |

**Test Evidence**:
- Manual test: Accessing `/dashboard` without login → Redirects to `/login` ✅
- Date Tested: January 4, 2026

### 4.2 Session Management

| Parameter | Configuration | Evidence |
|-----------|--------------|----------|
| Token Type | JWT | Supabase Auth (managed) |
| Token Lifetime | 1 hour | Supabase default |
| Storage | HTTPOnly Cookie | Browser DevTools inspection |
| SameSite | Strict | Supabase default |

---

## 5. Security Headers Evidence

### 5.1 Header Configuration

**Implementation Date**: January 4, 2026  
**File**: `next.config.js`  
**Lines**: 1-26

**Headers Implemented**:

| Header | Value | Purpose | Evidence Line |
|--------|-------|---------|---------------|
| Content-Security-Policy | `default-src 'self'; script-src 'self' 'unsafe-inline'...` | XSS prevention | L23 |
| X-Frame-Options | DENY | Clickjacking prevention | L3 |
| X-Content-Type-Options | nosniff | MIME sniffing prevention | L7 |
| Referrer-Policy | strict-origin-when-cross-origin | Privacy | L11 |
| Permissions-Policy | camera=(), microphone=()... | Feature restrictions | L19 |

### 5.2 Verification

**Method**: BrowserDevTools → Network Tab → Response Headers  
**Test URL**: https://orbitfolio.vercel.app (production)  
**Test Date**: January 4, 2026  
**Result**: All headers present ✅

---

## 6. Input Validation Evidence

### 6.1 Validation Framework

**Implementation Date**: January 4, 2026  
**Framework**: Zod (v3.x)  
**File**: `lib/validations/schemas.ts`

**Schemas Implemented**:

| Schema | Validates | Key Controls | Evidence Line |
|--------|-----------|--------------|---------------|
| PortfolioSchema | Portfolio creation | Name: 1-50 chars, UUID validation | L4-7 |
| HoldingSchema | Adding stocks/MF | Symbol uppercase, positive quantity, type enum | L10-17 |
| SearchQuerySchema | Search API input | Query length, result limit | L20-23 |

### 6.2 Usage in API Routes

**File**: `app/api/holdings/route.ts`  
**Implementation**: Lines 15-22

**Evidence**:
```typescript
const validation = HoldingSchema.safeParse(body);
if (!validation.success) {
  return NextResponse.json({ 
    success: false, 
    errors: validation.error.flatten().fieldErrors 
  }, { status: 400 });
}
```

---

## 7. Compliance Disclaimer Evidence

### 7.1 Legal Disclaimer Implementation

**Implementation Date**: January 4, 2026  
**Component**: `app/components/ComplianceFooter.tsx`  
**Display Location**: All pages (via `app/layout.tsx`)

**Disclaimer Text**:
> "OrbitFolio provides analytical tools for informational purposes only. **This is not investment advice.** Past performance does not guarantee future results. The AI Score is a mathematical representation of historical and real-time data and should not be the sole basis for any financial decision. Consult a SEBI-registered or qualified financial advisor."

**Evidence**: [ComplianceFooter.tsx:17-22](file:///C:/Users/Bhavna/Desktop/orbitfolio/app/components/ComplianceFooter.tsx#L17-L22)

---

## 8. Code Review Evidence

### 8.1 Security-Focused Code Reviews

| Date | Files Reviewed | Reviewer | Findings | Status |
|------|----------------|----------|----------|--------|
| Jan 4, 2026 | middleware.ts, next.config.js | Antigravity AI | 0 critical issues | ✅ Passed |
| Jan 4, 2026 | lib/validations/schemas.ts | Antigravity AI | Recommendation: Add email validation | 📝 Noted |
| Jan 4, 2026 | app/api/holdings/route.ts | Antigravity AI | 0 issues | ✅ Passed |

---

## 9. Gap Analysis

### 9.1 Current State vs. Enterprise Standard

| Control Category | Enterprise Standard | OrbitFolio Status | Gap | Priority |
|-----------------|--------------------|--------------------|-----|----------|
| Authentication | MFA required | Single-factor only | Missing 2FA | MEDIUM (paid feature) |
| Authorization | RBAC + RLS | RLS only | No role-based permissions | LOW (not needed yet) |
| Encryption | At rest + in transit | Both implemented | None | ✅ |
| Logging | 90-day retention | 7-day retention | Limited retention | LOW (free tier limit) |
| WAF | Active protection | None | No WAF | MEDIUM (future) |
| Penetration Testing | Annual | Not performed | No pen test | LOW (early stage) |

### 9.2 Mitigation for Gaps

| Gap | Mitigation | Status |
|-----|------------|--------|
| No 2FA | Strong password policy + Supabase rate limiting | ✅ Implemented |
| Limited log retention | Export critical logs to external storage (future) | 📋 Planned |
| No WAF | Cloudflare Free Tier (future) | 📋 Planned |

---

## 10. Audit Trail

### 10.1 Change Log

| Date | Change | Changed By | Approved By | Evidence |
|------|--------|------------|-------------|----------|
| Jan 4, 2026 | Added middleware auth | Antigravity AI | Bhavna (Founder) | [phase-13 changelog](file:///C:/Users/Bhavna/Desktop/orbitfolio/aiChangeLog/phase-13-enterprise-security.md) |
| Jan 4, 2026 | Added security headers | Antigravity AI | Bhav

na (Founder) | [phase-13 changelog](file:///C:/Users/Bhavna/Desktop/orbitfolio/aiChangeLog/phase-13-enterprise-security.md) |
| Jan 4, 2026 | Fixed Next.js vulnerability | Antigravity AI | Bhavna (Founder) | [phase-13 changelog](file:///C:/Users/Bhavna/Desktop/orbitfolio/aiChangeLog/phase-13-enterprise-security.md) |

---

## 11. Compliance Certifications

### Current Status

| Certification | Required For | Status | Notes |
|--------------|-------------|--------|-------|
| **SOC 2** | Enterprise customers | ❌ Not Pursued | Too early-stage |
| **ISO 27001** | Global enterprises | ❌ Not Pursued | Too early-stage |
| **GDPR Compliance** | EU users | ⚠️ PARTIAL | Privacy policy needed |
| **CCPA Compliance** | California users | ⚠️ PARTIAL | Privacy policy needed |

**Recommendation**: Pursue formal certifications only when revenue justifies cost (estimated $50K+ annually for SOC 2).

---

## 12. Document References

| Document | Purpose | Link |
|----------|---------|------|
| security_assessment.md | Current security posture | [Link](file:///C:/Users/Bhavna/Desktop/orbitfolio/security_assessment.md) |
| phase-13-enterprise-security.md | Phase 13 detailed changelog | [Link](file:///C:/Users/Bhavna/Desktop/orbitfolio/aiChangeLog/phase-13-enterprise-security.md) |
| Security Strategy | Overall security philosophy | [Link](file:///C:/Users/Bhavna/Desktop/orbitfolio/docs/security/01_security_strategy.md) |
| Security Architecture | Technical implementation details | [Link](file:///C:/Users/Bhavna/Desktop/orbitfolio/docs/security/02_security_architecture.md) |

---

**Classification**: Internal Use  
**Next Review Due**: February 1, 2026
