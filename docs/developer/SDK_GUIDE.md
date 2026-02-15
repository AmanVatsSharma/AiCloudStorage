# SDK Guide

## Current Status
Official packaged SDKs are not yet published.  
For now, use the documented HTTP APIs directly from your applications.

## Recommended Client Pattern (TypeScript)
1. Create a thin API client wrapper around fetch.
2. Add typed response interfaces for each endpoint.
3. Centralize auth token/cookie handling.
4. Add retry handling for `429`/transient network failures.

## Suggested SDK Surface (Roadmap)
- `health.check()`
- `reliability.getAlerts({ scope, actorId })`
- `analytics.getStorageReport({ actorId })`
- `files.summarize({ text })`

## Error Handling
- Normalize API errors into a shared error type:
  - `code`
  - `message`
  - `status`
- Log request ID/trace ID when available.

## Versioning Guidance
- Use semantic versioning for future SDK release packages.
- Keep compatibility notes synced with API docs.
