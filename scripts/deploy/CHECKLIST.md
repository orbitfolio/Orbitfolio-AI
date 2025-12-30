# Deployment Checklist

## Pre-Deployment
- [ ] All smoke tests pass locally
- [ ] Environment variables are set in Vercel dashboard:
  - `TWELVEDATA_API_KEY`
  - `GROQ_API_KEY`
  - `HUGGINGFACE_TOKEN`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] No secrets exposed in codebase

## Deployment Steps
1. **Preview**: `./scripts/deploy/vercel-preview.sh`
2. **Production**: `npx vercel --prod` (after preview validation)

## Post-Deployment Validation
- [ ] Visit production URL
- [ ] Test `/api/orbitfolio-score?symbol=MSFT`
- [ ] Verify scores match local environment
- [ ] Check error logs in Vercel dashboard

## Rollback
If issues found:
```bash
npx vercel rollback
```
