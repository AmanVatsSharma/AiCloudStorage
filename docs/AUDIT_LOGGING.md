# Audit Logging Design

## Objective
Provide an enterprise-grade, queryable audit trail for security-sensitive and compliance-relevant actions.

## Data Model
- Migration: `supabase/migrations/20260215_audit_events.sql`
- Table: `public.audit_events`

Core columns:
- `actor_id` — authenticated user that triggered the action.
- `team_id` — optional team context.
- `action` — event identifier (`team.create`, `file.share.create`, etc.).
- `resource_type` and `resource_id` — target entity metadata.
- `status` — `success` or `failure`.
- `details` — JSON payload for non-secret context.
- `ip_address`, `user_agent` — request metadata fields.
- `created_at` — event timestamp.

## Write Path
- Frontend utility: `lib/audit.ts` (`trackAuditEvent`).
- Persistence RPC: `public.log_audit_event(...)`.
- Event logging is **best-effort and non-blocking** to avoid UX disruption.

## Security Model
- RLS enabled on `audit_events`.
- Read policy:
  - actor sees own events,
  - team owner can see team-scoped events.
- Insert policy:
  - `actor_id` must match `auth.uid()`.

## Initial Integrated Actions
- `auth.signout` (header sign-out flow)
- `team.create`
- `team.update`
- `team.member.add`
- `file.share.create`

## Audit UI Capabilities (Current)
- Audit table with action/status filtering.
- CSV export of currently visible audit rows from the dashboard UI.

## Audit Flowchart
```mermaid
flowchart TD
  A[User action in UI] --> B[trackAuditEvent() called]
  B --> C[RPC: log_audit_event]
  C --> D{RPC success?}
  D -->|Yes| E[Row inserted into audit_events]
  D -->|No| F[Warn log only; user flow continues]
```

## Future Improvements
- Add immutable signature/hash chain for high-assurance tamper evidence.
- Add server-side event emitters for backend-only actions.
- Add admin audit explorer UI with filters/export.
- Introduce retention policies and archival for audit data lifecycle.
