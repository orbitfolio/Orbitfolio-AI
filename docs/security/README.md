# OrbitFolio Security Framework Documentation

## Overview

This directory contains the comprehensive **OrbitFolio Security Framework**, documenting all security controls, policies, procedures, and evidence from project inception (December 2, 2025) through Phase 13 completion (January 4, 2026).

---

## Document Structure

| # | Document | Purpose | Audience |
|---|----------|---------|----------|
| 01 | [Security Strategy](./01_security_strategy.md) | Overall security philosophy, threat model, controls matrix | Leadership, Security Team |
| 02 | [Security Architecture](./02_security_architecture.md) | Technical implementation details, defense layers | Developers, Security Engineers |
| 03 | [Security Policies](./03_security_policies.md) | Rules and standards (planned) | All Team Members |
| 04 | [Incident Response Playbook](./04_incident_response_playbook.md) | Step-by-step incident handling procedures | Security Team, On-Call |
| 05 | **Runbooks** | Tactical, executable procedures | Developers, Operations |
|    | - [Dependency Security Audit](./05_runbooks/dependency_security_audit.md) | npm audit workflow (Prompt 2 adapted) | Developers |
|    | - [RLS Verification](./05_runbooks/rls_verification_runbook.md) | Verify Supabase Row Level Security | Developers, Security |
| 06 | [Compliance Evidence](./06_compliance_evidence.md) | Audit trail,timeline, gap analysis | Auditors, Management |
| 07 | [Security Training](./07_security_training.md) | Developer onboarding (planned) | New Developers |

---

## Quick Start

### For Developers

1. **Onboarding**: Start with [Security Architecture](./02_security_architecture.md) to understand how security is built
2. **Before Deployment**: Run [Dependency Security Audit](./05_runbooks/dependency_security_audit.md)
3. **After DB Changes**: Run [RLS Verification](./05_runbooks/rls_verification_runbook.md)

### For Security Reviews

1. Review [Security Strategy](./01_security_strategy.md) for current threat model
2. Check [Compliance Evidence](./06_compliance_evidence.md) for audit trail
3. Verify controls in [Security Architecture](./02_security_architecture.md)

### For Incident Response

1. **Immediate**: Open [Incident Response Playbook](./04_incident_response_playbook.md)
2. Follow severity-based procedures
3. Document in `incidents/INC-2026-XXX.md`

---

## Security Control Summary

### Implemented (Phase 13)

| Control | Implementation | Status |
|---------|---------------|--------|
| **Authentication Middleware** | `middleware.ts` protects /dashboard and /api | ✅ Active |
| **Row Level Security (RLS)** | 16 Supabase policies across 4 tables | ✅ Active |
| **Input Validation** | Zod schemas in `lib/validations/schemas.ts` | ✅ Active |
| **Security Headers** | CSP, HSTS, XFO in `next.config.js` | ✅ Active |
| **Dependency Security** | npm audit (0 critical vulnerabilities) | ✅ Active |
| **Compliance Disclaimer** | Legal footer on all pages | ✅ Active |

### Planned (Phase 14+)

| Enhancement | Priority | Estimated Effort |
|-------------|----------|-----------------|
| Rate Limiting | HIGH | 2 days |
| 2FA/MFA | MEDIUM | 3 days (requires Supabase Pro) |
| WAF | LOW | 1 day |

---

## Maintenance Schedule

| Activity | Frequency | Next Due | Responsible |
|----------|-----------|----------|-------------|
| **Dependency Audit** | Monthly | Feb 1, 2026 | Developer |
| **RLS Verification** | After DB schema changes | On-demand | Developer |
| **Security Review** | Before each release | Before deploy | Security Lead |
| **Incident Response Drill** | Quarterly | April 1, 2026 | Security Lead |
| **Policy Review** | Annually | Jan 2027 | Security Lead |

---

## Key Metrics (as of Jan 4, 2026)

| Metric | Target | Current | Trend |
|--------|--------|---------|-------|
| **Critical Vulnerabilities** | 0 | 0 | ✅ |
| **RLS Policy Coverage** | 100% | 100% (4/4 tables) | ✅ |
| **Middleware Uptime** | 99.9% | 100% | ✅ |
| **Security Headers** | 5/5 | 5/5 | ✅ |

---

## Related Documentation

- [Project Specification](file:///C:/Users/Bhavna/Desktop/orbitfolio/project-spec.md)
- [Master Project History](file:///C:/Users/Bhavna/Desktop/orbitfolio/master_project_history.md)
- [Phase 13 Changelog](file:///C:/Users/Bhavna/Desktop/orbitfolio/aiChangeLog/phase-13-enterprise-security.md)
- [Security Assessment](file:///C:/Users/Bhavna/Desktop/orbitfolio/security_assessment.md)

---

## Document Updates

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| Jan 4, 2026 | 1.0 | Initial framework creation | Antigravity AI |

---

**Maintained by**: OrbitFolio Security Team  
**Classification**: Internal Use
