# OrbitFolio Security Framework: Architecture

**Document Version**: 1.0  
**Last Updated**: January 4, 2026  
**Owner**: Security Team  
**Classification**: Internal Use

---

## Executive Summary

This document provides a comprehensive view of OrbitFolio's security architecture, detailing how authentication, authorization, data protection, and security controls are implemented across the Next.js + Supabase stack.

---

## 1. System Architecture Overview

### Technology Stack Security Profile

| Layer | Technology | Security Features | Risks Mitigated |
|-------|------------|------------------|-----------------|
| **Frontend** | Next.js 16 (React) | JSX auto-escaping, TypeScript type safety | XSS, Type confusion |
| **Backend** | Next.js API Routes | Server-side validation, middleware | Unauthorized access, injection |
| **Database** | Supabase (PostgreSQL) | Row Level Security, encrypted at rest | Data breaches, SQL injection |
| **Authentication** | Supabase Auth | JWT tokens, OAuth providers | Credential theft, session hijacking |
| **Hosting** | Vercel | DDoS protection, HTTPS by default | Network attacks, MITM |

### Security Layers (Defense in Depth)

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Network Security (Vercel + Cloudflare DNS)        │
│  - HTTPS/TLS 1.3                                             │
│  - DDoS Protection                                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: Application Security Headers (next.config.js)     │
│  - Content Security Policy (CSP)                             │
│  - X-Frame-Options: DENY                                     │
│  - X-Content-Type-Options: nosniff                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: Authentication Middleware (middleware.ts)          │
│  - Session validation via Supabase                           │
│  - Route protection (/dashboard, /api)                       │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 4: Input Validation (Zod Schemas)                     │
│  - Type checking + sanitization                              │
│  - Symbol transformation (uppercase)                         │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 5: Authorization (Supabase RLS Policies)              │
│  - Per-table, per-operation policies                         │
│  - auth.uid() = user_id enforcement                          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 6: Data Security (PostgreSQL)                         │
│  - Encrypted at rest (Supabase managed)                      │
│  - Encrypted in transit (TLS)                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Authentication Architecture

### 2.1 Authentication Flow

| Step | Component | Action | Security Check |
|------|-----------|--------|----------------|
| 1 | User Browser | Submits email/password | HTTPS enforced |
| 2 | Supabase Auth | Validates credentials | bcrypt password hash |
| 3 | Supabase Auth | Generates JWT | Signed with secret key |
| 4 | Next.js | Sets HTTPOnly cookie | Prevents JavaScript access |
| 5 | Middleware | Validates JWT on each request | Token signature verification |

### 2.2 Session Management

| Parameter | Configuration | Security Benefit |
|-----------|--------------|------------------|
| **Token Type** | JWT (JSON Web Token) | Stateless, cryptographically signed |
| **Token Lifetime** | 1 hour (refresh every 50 min) | Limits exposure window |
| **Storage** | HTTPOnly Cookie | Prevents XSS token theft |
| **SameSite** | Strict | Prevents CSRF attacks |
| **Refresh Strategy** | Auto-refresh via Supabase client | Seamless UX with security |

### 2.3 Middleware Implementation

**File**: `middleware.ts`

**Purpose**: Acts as a gatekeeper before any protected route is accessed.

**Logic**:
```
IF request.path.startsWith('/dashboard') OR '/api':
  session = supabase.auth.getSession()
  IF session is NULL:
    IF path is /dashboard:
      REDIRECT to /login
    ELSE IF path is /api:
      RETURN 401 Unauthorized
  ELSE:
    ALLOW request to proceed
```

---

## 3. Authorization Architecture

### 3.1 Row Level Security (RLS) Overview

Supabase RLS enforces data isolation at the **database level**, independent of application code.

**Philosophy**: Even if application logic is bypassed, the database prevents unauthorized access.

### 3.2 RLS Policy Matrix

| Table | Operation | Policy Name | Logic | Status |
|-------|-----------|-------------|-------|--------|
| **portfolios** | SELECT | Users can view their own portfolios | `auth.uid() = user_id` | ✅ Active |
| **portfolios** | INSERT | Users can insert their own portfolios | `auth.uid() = user_id` | ✅ Active |
| **portfolios** | UPDATE | Users can update their own portfolios | `auth.uid() = user_id` | ✅ Active |
| **portfolios** | DELETE | Users can delete their own portfolios | `auth.uid() = user_id` | ✅ Active |
| **holdings** | SELECT | Users can view their own holdings | `EXISTS (SELECT 1 FROM portfolios WHERE ...)` | ✅ Active |
| **holdings** | INSERT | Users can insert their own holdings | `EXISTS (SELECT 1 FROM portfolios WHERE ...)` | ✅ Active |
| **holdings** | UPDATE | Users can update their own holdings | `EXISTS (SELECT 1 FROM portfolios WHERE ...)` | ✅ Active |
| **holdings** | DELETE | Users can delete their own holdings | `EXISTS (SELECT 1 FROM portfolios WHERE ...)` | ✅ Active |
| **transactions** | ALL | Users can manage their own transactions | `EXISTS (SELECT 1 FROM holdings JOIN portfolios ...)` | ✅ Active |
| **watchlist** | ALL | Users can manage their own watchlist | `auth.uid() = user_id` | ✅ Active |

**Total Policies**: 16 active policies across 4 tables.

### 3.3 RLS Verification

**Query** (Run in Supabase SQL Editor):
```sql
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

**Expected Output**: Should return 16 rows, all with `permissive = PERMISSIVE`.

---

## 4. Input Validation Architecture

### 4.1 Validation Strategy

| Input Source | Validation Method | Implementation | Failure Mode |
|--------------|------------------|----------------|--------------|
| API Request Body | Zod Schema | `lib/validations/schemas.ts` | 400 Bad Request + field errors |
| URL Parameters | Next.js type checks | Built-in | 404/500 |
| User-generated content | React JSX escaping | Built-in | Auto-escapes HTML |

### 4.2 Zod Schema Coverage

| Schema | Purpose | Key Validations |
|--------|---------|-----------------|
| **PortfolioSchema** | Creating/updating portfolios | Name: 1-50 chars, userId: UUID |
| **HoldingSchema** | Adding stocks/MF to portfolio | Symbol: uppercase, Quantity: positive, Type: enum |
| **SearchQuerySchema** | Search API input | Query: 1-100 chars, Limit: 1-50 |

**Example Usage** (`app/api/holdings/route.ts`):
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

## 5. Security Headers Architecture

### 5.1 Header Configuration

**File**: `next.config.js`

| Header | Value | Purpose | Attack Prevented |
|--------|-------|---------|------------------|
| **Content-Security-Policy** | `script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https://*.supabase.co` | Restrict resource loading | XSS, data exfiltration |
| **X-Frame-Options** | `DENY` | Prevent embedding in iframes | Clickjacking |
| **X-Content-Type-Options** | `nosniff` | Enforce MIME types | MIME confusion attacks |
| **Referrer-Policy** | `strict-origin-when-cross-origin` | Limit referrer leakage | Information disclosure |
| **Permissions-Policy** | `camera=(), microphone=(), geolocation=()` | Disable unused features | Privacy violations |

### 5.2 CSP Breakdown

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: https:;
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.coingecko.com https://api.portfoliooptimizer.io;
```

**Notes**:
- `'unsafe-inline'` and `'unsafe-eval'` required for Next.js HMR (development mode)
- Production build could tighten this via nonce-based CSP

---

## 6. Data Flow Security

### 6.1 User Data Lifecycle

| Phase | Location | Encryption | Access Control |
|-------|----------|------------|----------------|
| **Input** | User Browser | TLS 1.3 in transit | N/A |
| **Validation** | Next.js API Route | In memory | Middleware auth check |
| **Storage** | Supabase PostgreSQL | AES-256 at rest | RLS policies |
| **Retrieval** | Next.js API Route | TLS 1.3 in transit | RLS + Middleware |
| **Display** | User Browser (React) | TLS 1.3 in transit | JSX auto-escaping |

### 6.2 Third-Party API Security

| API | Purpose | Authentication Method | Data Exposure |
|-----|---------|----------------------|---------------|
| **Yahoo Finance** | Stock prices | None (public API) | Symbol only (no PII) |
| **TwelveData** | Technical indicators | API key (env var) | Symbol only |
| **Groq** | Sentiment analysis | API key (env var) | News headlines (public) |
| **CoinGecko** | Crypto prices | None (public API) | Symbol only |

**Key Security**: API keys stored in `.env.local` (not committed to Git).

---

## 7. Compliance & Audit Architecture

### 7.1 Audit Logging

| Event Type | Log Location | Retention | Purpose |
|-----------|--------------|-----------|---------|
| Authentication | Supabase Auth Logs | 30 days (free tier) | Detect brute force |
| API Calls | Vercel Function Logs | 7 days (free tier) | Troubleshooting |
| Database Queries | Supabase SQL Logs | 7 days (free tier) | RLS violation detection |
| Application Errors | Vercel Error Logs | 30 days | Security incident triage |

### 7.2 Security Evidence Trail

| Artifact | Location | Purpose |
|----------|----------|---------|
| RLS Policies | Supabase Dashboard → Database → Policies | Compliance proof |
| Middleware Code | `middleware.ts` | Code review |
| Security Headers | `next.config.js` | Penetration test validation |
| Dependency Audit | `npm audit` output | Vulnerability tracking |

---

## 8. Deployment Architecture

### 8.1 Deployment Security

| Stage | Security Check | Tool | Pass Criteria |
|-------|----------------|------|---------------|
| **Pre-Commit** | Linting + Type Checks | ESLint, TypeScript | 0 errors |
| **Pre-Deploy** | Dependency Audit | `npm audit` | 0 critical vulnerabilities |
| **Deployment** | Build Verification | `npm run build` | Successful build |
| **Post-Deploy** | Smoke Test | Manual | Auth flow works |

### 8.2 Environment Separation

| Environment | URL | Database | Purpose |
|-------------|-----|----------|---------|
| **Development** | localhost:3000 | Supabase Dev Project | Testing |
| **Production** | orbitfolio.vercel.app | Supabase Prod Project | Live users |

**Note**: No staging environment due to free-tier constraints. Use Supabase Branching (future) when available.

---

## 9. Limitations & Risk Acceptance

### 9.1 Known Limitations (Free Tier)

| Limitation | Impact | Mitigation | Future Enhancement |
|------------|--------|------------|-------------------|
| **No WAF** | Exposed to Layer 7 attacks | Cloudflare Free (future) | Cloudflare Pro ($20/mo) |
| **No 2FA** | Weaker account security | Strong password policy | Supabase Pro ($25/mo) |
| **Limited Rate Limiting** | Vulnerable to API abuse | Manual IP blocking | Upstash Redis (free tier) |
| **No Leaked Password Check** | Users can set compromised passwords | Password strength requirements | Supabase Pro ($25/mo) |

### 9.2 Accepted Risks

| Risk | Severity | Justification |
|------|----------|---------------|
| **No real-time intrusion detection** | LOW | Early-stage product, low user count |
| **7-day log retention** | MEDIUM | Free tier limitation, acceptable for MVP |
| **No dedicated security team** | MEDIUM | Single founder, proactive controls in place |

---

## Appendices

### A. Architecture Diagrams

See `docs/diagrams/` for visual representations (future enhancement).

### B. Related Documents

- [Security Strategy](./01_security_strategy.md)
- [Security Policies](./03_security_policies.md)
- [RLS Verification Runbook](./05_runbooks/rls_verification_runbook.md)

---

**Classification**: Internal Use  
**Distribution**: OrbitFolio Core Team
