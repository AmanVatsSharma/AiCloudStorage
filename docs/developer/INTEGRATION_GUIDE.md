# Integration Guide

## Overview
This guide covers practical integration paths for external services and internal tooling.

## 1) Health Integration
- Endpoint: `GET /api/health`
- Use for uptime checks and deployment smoke tests.

## 2) Reliability Alert Integration
- Endpoint: `GET /api/reliability/alerts`
- Modes:
  - session-auth user scope
  - bearer-token integration mode
- Recommended for SIEM and NOC dashboards.

## 3) Storage Analytics Integration
- Endpoint: `GET /api/analytics/storage-report`
- Modes:
  - session-auth user scope
  - bearer-token integration mode with `actorId`

## 4) AI Summarization Integration
- Endpoint: `POST /api/ai/summarize`
- Include retry handling for `429` responses.
- Track usage telemetry fields in response payload.

## 5) Storage Bucket Governance Integration
- Endpoint: `GET/POST /api/storage/buckets`
- Requires authenticated session and service-role backend configuration.

## Security Notes
- Never expose service-role keys client-side.
- Keep integration tokens in secret managers.
- Rotate integration tokens on a fixed cadence.

## Operational Validation
- `npm run ops:probe` for health + reliability checks.
- `npm run ops:validate-json` for artifact contract consistency.
- `npm run security:validate` + `npm run security:gate` for security rollout gating.
