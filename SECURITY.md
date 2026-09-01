# Security Policy

## Supported versions

This repository is a pre-launch demo. Please report issues against the default `main` branch.

## Reporting a vulnerability

No security contact email is published in this repository. Please use GitHub Security Advisories
on [orbitfolio/Orbitfolio-AI](https://github.com/orbitfolio/Orbitfolio-AI) (Security → Report a
vulnerability). Do not open a public issue for exploitable bugs.

We aim to acknowledge private reports within 7 days.

## Scope notes

- Demo holdings live in the browser (`localStorage` on this device). Treat exported JSON as
  personal data.
- `/api/holdings` requires a Supabase session when that stack is configured. Auth is checked in
  the route handler, not only in middleware.
- `/api/test_json` is development-only and returns 404 in production.
- Optional secrets (`GROQ_API_KEY`, Supabase, Upstash) belong in the host env, never in git.
