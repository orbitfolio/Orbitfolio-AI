# Security Standards

## API Keys & Secrets
- **NEVER** hardcode API keys in source code
- Store all secrets in `.env.local` (never commit to git)
- Use `process.env.VARIABLE_NAME` to access secrets
- Validate that required env vars exist at startup

## Input Validation
- Sanitize all user inputs before processing
- Use allowlists over denylists for validation
- Escape special characters in dynamic content
- Validate URL parameters and query strings

## API Security
- Rate limit all public endpoints
- Validate `Content-Type` headers
- Use HTTPS for all external API calls
- Never expose internal error details to clients

## Authentication
- Use Supabase Auth or similar managed auth
- Implement proper session management
- Use secure, HttpOnly cookies for tokens
- Validate JWTs on every protected route

## Anti-Injection (LLM-Specific)
- Sanitize news headlines before sending to LLM
- Remove patterns like "ignore previous instructions"
- Never execute code returned by LLM without review
- Log all LLM inputs/outputs for audit

## Data Protection
- Minimize data collection (only what's needed)
- Never log sensitive user data (passwords, tokens)
- Implement proper CORS policies
- Use parameterized queries for database access
