# Storage Buckets API

## Endpoint
- `GET /api/storage/buckets`
- `POST /api/storage/buckets`

## Purpose
Expose authenticated bucket inventory and creation controls for settings governance workflows.

## Authentication
- Requires valid authenticated session cookie.
- Server-side storage admin operations require:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_SUPABASE_URL`

If service-role configuration is missing, API responds with `503`.

## GET Response
```json
{
  "generatedAt": "2026-02-15T20:00:00.000Z",
  "buckets": [
    {
      "id": "files",
      "name": "files",
      "public": false,
      "fileSizeLimit": 52428800,
      "allowedMimeTypes": ["image/png", "application/pdf"],
      "createdAt": "2026-02-15T19:00:00.000Z",
      "updatedAt": "2026-02-15T19:00:00.000Z"
    }
  ]
}
```

## POST Request Body
```json
{
  "name": "team-documents",
  "public": false,
  "fileSizeLimit": 52428800,
  "allowedMimeTypes": ["image/png", "application/pdf"]
}
```

## POST Response
```json
{
  "createdAt": "2026-02-15T20:01:00.000Z",
  "bucket": {
    "name": "team-documents"
  }
}
```

## Error Codes
- `400` invalid bucket name
- `401` unauthenticated request
- `503` service-role configuration missing
- `500` unexpected runtime failure
