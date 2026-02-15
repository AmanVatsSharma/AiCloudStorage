# SIEM / Monitoring Integration Guide

## Purpose
Integrate reliability alerts and security telemetry into external monitoring systems (SIEM, SOC dashboards, incident automation).

## Reliability Alerts API
- Endpoint: `GET /api/reliability/alerts`
- API reference: `docs/API_RELIABILITY_ALERTS.md`
- Integration auth:
  - Header: `Authorization: Bearer <RELIABILITY_ALERTS_API_TOKEN>`
  - Server env required: `SUPABASE_SERVICE_ROLE_KEY`

### Supported query modes
1. **Global report**
   - `GET /api/reliability/alerts?scope=global`
2. **User-scoped report**
   - `GET /api/reliability/alerts?scope=user&actorId=<uuid>`

## Sample polling workflow
1. Poll endpoint every 5-10 minutes.
2. Parse `alerts` array from response.
3. Create/resolve incidents based on:
   - `severity=critical` => immediate paging
   - `severity=warning` => backlog triage ticket
4. Persist full JSON payload for audit history.

Reference payload artifact:
- `docs/samples/reliability_alerts_response_sample.json`

## Health Probe Integration
- Endpoint: `GET /api/health`
- Purpose: deployment and uptime readiness checks.
- Recommended cadence: 30-60 seconds for uptime probe, 5 minutes for readiness trend snapshots.
- Sample payload:
  - `docs/samples/health_response_sample.json`

### Health probe cURL
```bash
curl -sS "https://<app-host>/api/health"
```

### Suggested health alert routing
- `status=degraded` with `supabase_public_config` warning:
  - notify platform engineering immediately.
- `status=degraded` with `openai_key_configured` warning:
  - notify AI service owner; fallback mode remains operational.

## Example cURL
```bash
curl -sS \
  -H "Authorization: Bearer ${RELIABILITY_ALERTS_API_TOKEN}" \
  "https://<app-host>/api/reliability/alerts?scope=global"
```

## Probe Automation Shortcut
```bash
npm run ops:probe -- \
  --base-url "https://<app-host>" \
  --scope global \
  --reliability-token "${RELIABILITY_ALERTS_API_TOKEN}"
```

## Recommended alert routing
- `platform_failure_rate_critical` -> Incident Commander + On-call backend.
- `failure_spike_critical` -> Incident Commander + Product engineering squad.
- `ai_failure_rate_critical` -> AI service owner + platform on-call.

## Security Notes
- Rotate `RELIABILITY_ALERTS_API_TOKEN` quarterly or after any incident.
- Restrict endpoint access via edge/network controls if feasible.
- Do not log tokens in external systems.

## Operational Follow-up
- Link incidents to:
  - `docs/operations/INCIDENT_RESPONSE_RUNBOOK.md`
  - `docs/operations/DISASTER_RECOVERY_RUNBOOK.md`
  - `supabase/SECURITY_VALIDATION_RUNBOOK.md`
