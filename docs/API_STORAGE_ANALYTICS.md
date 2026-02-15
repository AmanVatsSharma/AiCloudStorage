# Storage Analytics API

## Endpoint
- `GET /api/analytics/storage-report`

## Purpose
Expose account-level storage analytics as a JSON report for automation and enterprise integrations.

## Auth Modes
1. **Session mode**
   - Requires authenticated session cookie.
   - Returns report for current authenticated user.
2. **Integration mode**
   - Requires `Authorization: Bearer <ANALYTICS_REPORTS_API_TOKEN>`.
   - Requires `SUPABASE_SERVICE_ROLE_KEY`.
   - Requires `actorId` query param.

## Query Parameters
| Name | Required | Mode | Notes |
|---|---|---|---|
| `actorId` | Yes | integration | target user id for report generation |

## Response Shape
```json
{
  "generatedAt": "2026-02-15T18:00:00.000Z",
  "mode": "session | integration",
  "actorId": "uuid",
  "report": {
    "totalItems": 120,
    "totalFiles": 96,
    "totalFolders": 20,
    "trashedItems": 4,
    "activeStorageBytes": 150000000,
    "trashedStorageBytes": 700000,
    "totalShares": 15,
    "publicShares": 3,
    "topFileTypes": [],
    "uploadsLast30Days": []
  }
}
```

## Error Codes
- `400` integration mode missing `actorId`
- `401` session mode without auth
- `503` integration mode missing service-role config
- `500` unexpected runtime/data failure
