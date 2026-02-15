# SIEM / Monitoring Integration Guide

## Purpose
Integrate reliability alerts and security telemetry into external monitoring systems (SIEM, SOC dashboards, incident automation).

## Reliability Alerts API
- Endpoint: `GET /api/reliability/alerts`
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

## Example cURL
```bash
curl -sS \
  -H "Authorization: Bearer ${RELIABILITY_ALERTS_API_TOKEN}" \
  "https://<app-host>/api/reliability/alerts?scope=global"
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
