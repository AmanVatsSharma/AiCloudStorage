# Health API

## Endpoint
- `GET /api/health`

## Purpose
Provide a lightweight readiness signal for uptime probes and deployment checks.

## Response
```json
{
  "status": "ok | degraded",
  "timestamp": "2026-02-15T12:00:00.000Z",
  "checks": [
    {
      "name": "supabase_public_config",
      "status": "pass | warn",
      "message": "..."
    },
    {
      "name": "openai_key_configured",
      "status": "pass | warn",
      "message": "..."
    }
  ]
}
```

## Status Codes
- `200`: readiness checks passed
- `503`: degraded readiness or runtime evaluation failure

## Notes
- This endpoint does not require authentication.
- Current checks focus on runtime configuration readiness.
- AI services may still operate in degraded fallback mode when OpenAI key is not configured.

Sample response artifact:
- `docs/samples/health_response_sample.json`
