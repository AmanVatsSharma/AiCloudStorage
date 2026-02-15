# Deployment Guide

## Overview
This project is deployable through:
- **Vercel** (recommended for managed Next.js hosting),
- **Docker** (self-hosted or platform-agnostic deployment).

## Vercel Deployment Checklist

### Required Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Required for server-admin integrations
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` (AI summarize features)
- `RELIABILITY_ALERTS_API_TOKEN` (integration-mode reliability API)
- `ANALYTICS_REPORTS_API_TOKEN` (integration-mode analytics API)

### Steps
1. Connect repository in Vercel.
2. Configure env vars in Project Settings.
3. Ensure Supabase migrations are applied.
4. Trigger deployment.
5. Validate:
   - `/api/health`
   - `/api/reliability/alerts` (auth/integration as required)
   - `/api/analytics/storage-report` (auth/integration as required)

## Docker Deployment

### Build image
```bash
docker build -t ai-cloud-storage:latest .
```

### Run container
```bash
docker run --rm -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL="https://<project>.supabase.co" \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon-key>" \
  -e SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
  -e OPENAI_API_KEY="<openai-key>" \
  ai-cloud-storage:latest
```

### Smoke checks
```bash
curl -sS http://localhost:3000/api/health
```

## Release Readiness Validation
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run ops:validate-json`
- Security evidence + gate (for controlled environments):
  - `npm run security:validate ...`
  - `npm run security:gate ...`
