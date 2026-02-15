# Reliability Alerts API

## Endpoint
- `GET /api/reliability/alerts`

## Purpose
Provide machine-consumable reliability status for dashboarding, SIEM ingestion, and alert-routing automation.

## Authentication Modes

### 1) Session mode (user-scoped)
- Requires authenticated app session cookie.
- Returns report scoped to the signed-in user (`actor_id = auth user id`).

### 2) Integration mode (user/global scope)
- Requires header:
  - `Authorization: Bearer <RELIABILITY_ALERTS_API_TOKEN>`
- Requires server configuration:
  - `SUPABASE_SERVICE_ROLE_KEY`
- Supports query params:
  - `scope=user&actorId=<uuid>`
  - `scope=global`

## Query Parameters
| Name | Type | Required | Notes |
|---|---|---|---|
| `scope` | `user \| global` | No | Defaults to `user` |
| `actorId` | `uuid` | Integration + `scope=user` | Ignored in session mode |

## Response Schema
```json
{
  "generatedAt": "2026-02-15T12:00:00.000Z",
  "authorizationMode": "session | integration",
  "scope": "user | global",
  "actorId": "uuid-or-null",
  "windows": {
    "platform": "7d",
    "ai": "24h",
    "failureSpike": "1h"
  },
  "counters": {
    "totalEventsLast7d": 125,
    "failedEventsLast7d": 3,
    "failedEventsLast1h": 0,
    "aiTotalLast24h": 18,
    "aiFailureLast24h": 1
  },
  "indicators": {
    "platformSlo": {
      "name": "Platform audit success (7d)",
      "successCount": 122,
      "totalCount": 125,
      "successRate": 0.976,
      "targetRate": 0.99,
      "status": "warning",
      "shortfall": 0.014
    },
    "aiSlo": {
      "name": "AI summary success (24h)",
      "successCount": 17,
      "totalCount": 18,
      "successRate": 0.9444,
      "targetRate": 0.95,
      "status": "warning",
      "shortfall": 0.0056
    }
  },
  "alerts": [
    {
      "code": "platform_failure_rate_warning",
      "severity": "warning",
      "title": "Platform failure rate is above warning threshold",
      "description": "...",
      "recommendedAction": "..."
    }
  ]
}
```

## Error Responses
- `400`: missing `actorId` for integration `scope=user`
- `401`: no authenticated session in session mode
- `503`: integration mode requested but server integration config missing
- `500`: unexpected internal failure

## Example Requests

### Session mode
```bash
curl -sS --cookie "sb-session=<cookie>" \
  "https://<app-host>/api/reliability/alerts"
```

### Integration mode (global)
```bash
curl -sS \
  -H "Authorization: Bearer ${RELIABILITY_ALERTS_API_TOKEN}" \
  "https://<app-host>/api/reliability/alerts?scope=global"
```

### Integration mode (single actor)
```bash
curl -sS \
  -H "Authorization: Bearer ${RELIABILITY_ALERTS_API_TOKEN}" \
  "https://<app-host>/api/reliability/alerts?scope=user&actorId=<uuid>"
```
