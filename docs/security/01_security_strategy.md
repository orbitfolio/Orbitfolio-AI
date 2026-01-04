# OrbitFolio Security Framework: Strategy & Principles

**Document Version**: 1.0  
**Last Updated**: January 4, 2026  
**Owner**: Security Team  
**Classification**: Internal Use

---

## Executive Summary

The **OrbitFolio Security Framework** establishes enterprise-grade security controls for a zero-budget, multi-market portfolio analysis platform. This document defines our security philosophy, threat model, and strategic approach to protecting user data and maintaining system integrity.

---

## 1. Security Philosophy

### Core Principles

| Principle | Description | Implementation Example |
|-----------|-------------|----------------------|
| **Defense in Depth** | Multiple layers of security controls | Middleware → RLS → Input Validation → Security Headers |
| **Zero Trust Architecture** | Never trust, always verify | Every API request validates auth even with middleware |
| **Security by Default** | Secure configurations out-of-the-box | RLS enabled on all tables, strict CSP headers |
| **Least Privilege** | Users only access their own data | Supabase policies enforce `auth.uid() = user_id` |
| **Fail Securely** | Errors don't leak sensitive information | Generic error messages, detailed logs server-side only |

### The "Zero Budget, Enterprise Security" Model

OrbitFolio operates under a unique constraint: **$0 security budget**. Despite this, we maintain enterprise-grade security through:

1. **Open Source Tools**: Next.js, Supabase, npm audit
2. **Free-Tier Services**: Vercel (hosting), Supabase Free Plan (database + auth)
3. **Built-In Features**: Browser security (CSP), TypeScript type safety, React XSS protections
4. **Developer Discipline**: Manual code reviews, security checklists, proactive threat modeling

---

## 2. Threat Model

### Assets to Protect

| Asset Type | Examples | Sensitivity Level |
|------------|----------|------------------|
| **User Credentials** | Email, password hashes | CRITICAL |
| **Portfolio Data** | Holdings, transactions, watchlists | HIGH |
| **API Keys** | Supabase keys, third-party API tokens | CRITICAL |
| **Session Tokens** | Supabase JWT tokens | HIGH |
| **AI Score Algorithms** | Proprietary scoring logic | MEDIUM |

### Threat Actors

| Actor | Motivation | Likelihood | Impact |
|-------|------------|------------|--------|
| **Opportunistic Attackers** | Data theft, credential stuffing | HIGH | MEDIUM |
| **Competitors** | Steal AI scoring algorithms | MEDIUM | LOW |
| **Malicious Users** | Access others' portfolios | MEDIUM | HIGH |
| **Nation-State** | Not a target (too small) | LOW | N/A |

### Attack Scenarios & Mitigations

| Attack Scenario | Mitigation | Status |
|-----------------|------------|--------|
| **Unauthorized Portfolio Access** | Supabase RLS policies | ✅ Implemented |
| **XSS via User Input** | React auto-escaping + CSP headers | ✅ Implemented |
| **CSRF Attacks** | SameSite cookies + CSRF tokens | ✅ Implemented |
| **SQL Injection** | Supabase parameterized queries | ✅ By Design |
| **Dependency Vulnerabilities** | npm audit + regular updates | ✅ Implemented |
| **Session Hijacking** | HTTPOnly cookies + short TTL | ✅ Implemented |
| **Brute Force Login** | Supabase rate limiting (free tier) | ⚠️ Limited |

---

## 3. Security Controls Matrix

### Phase 13 Implementation (Completed Jan 4, 2026)

| Control Category | Specific Control | Implementation | Verification |
|-----------------|------------------|----------------|--------------|
| **Authentication** | Middleware route protection | `middleware.ts` | ✅ Manual test |
| **Authorization** | Row Level Security (RLS) | Supabase policies | ✅ SQL query |
| **Input Validation** | Zod schema validation | `lib/validations/schemas.ts` | ✅ Unit test |
| **Output Encoding** | React JSX auto-escape | Built-in | ✅ By design |
| **Security Headers** | CSP, HSTS, X-Frame-Options | `next.config.js` | ✅ Browser DevTools |
| **Dependency Security** | npm audit + updates | CI/CD step | ✅ npm audit |
| **Compliance** | Legal disclaimer footer | `ComplianceFooter.tsx` | ✅ Visual check |

### Future Enhancements (Phase 14+)

| Enhancement | Priority | Estimated Effort | Dependency |
|------------|----------|-----------------|------------|
| Rate Limiting (API) | HIGH | 2 days | Upstash Redis (free tier) |
| 2FA/MFA | MEDIUM | 3 days | Supabase Pro ($25/mo) |
| Leaked Password Check | LOW | N/A | Supabase Pro (paid feature) |
| WAF Protection | LOW | 1 day | Cloudflare Free Tier |

---

## 4. Compliance Stance

### Regulatory Alignment

| Regulation | Applicability | Compliance Status |
|-----------|---------------|------------------|
| **GDPR** | EU users (if any) | PARTIAL - Data retention policy needed |
| **CCPA** | California users | PARTIAL - Privacy policy needed |
| **SOC 2** | Future enterprise customers | NOT APPLICABLE (too early) |
| **PCI-DSS** | N/A (no payment processing) | NOT APPLICABLE |

### Data Residency

| Data Type | Storage Location | Jurisdiction |
|-----------|-----------------|--------------|
| User Profiles | Supabase (US-East-2) | United States |
| Session Data | Vercel Edge (global CDN) | Varies by user location |
| API Logs | Vercel Logs | United States |

---

## 5. Security Governance

### Roles & Responsibilities

| Role | Responsibilities | Current Owner |
|------|-----------------|---------------|
| **Security Lead** | Strategy, architecture, incident response | Bhavna (Founder) |
| **Developer** | Secure coding, vulnerability remediation | Bhavna (Founder) |
| **Compliance Officer** | Policy updates, audit coordination | Bhavna (Founder) |

*Note: As a single-person team, all roles consolidated. Future hires will specialize.*

### Review Cadence

| Activity | Frequency | Next Due Date |
|----------|-----------|---------------|
| **Dependency Audit** | Monthly | Feb 1, 2026 |
| **Security Review (Pre-Deploy)** | Every release | Before each deployment |
| **Incident Response Drill** | Quarterly | April 1, 2026 |
| **Policy Review** | Annually | January 2027 |

---

## 6. Metrics & Monitoring

### Key Security Indicators (KSIs)

| Metric | Target | Current | Trend |
|--------|--------|---------|-------|
| **Critical Vulnerabilities (npm audit)** | 0 | 0 | ✅ Stable |
| **Mean Time to Patch (MTTP)** | < 24 hours | N/A | 🆕 Baseline |
| **RLS Policy Coverage** | 100% of tables | 100% (4/4 tables) | ✅ Complete |
| **Middleware Uptime** | 99.9% | 100% | ✅ New |

---

## Appendices

### A. Document Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| Jan 4, 2026 | 1.0 | Initial creation | Antigravity AI |

### B. Related Documents

- [Security Architecture](./02_security_architecture.md)
- [Security Policies](./03_security_policies.md)
- [Incident Response Playbook](./04_incident_response_playbook.md)
- [Phase 13 Security Changelog](../aiChangeLog/phase-13-enterprise-security.md)

---

**Classification**: Internal Use  
**Distribution**: OrbitFolio Core Team
