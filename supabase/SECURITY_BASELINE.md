# Security Baseline (Enterprise Hardening)

## Overview
This module documents the hardened security baseline introduced in:

- `migrations/20260215_security_baseline.sql`

The baseline replaces prototype-era permissive policies with a least-privilege
model across:

- `profiles`
- `files`
- `file_versions`
- `shared_files`
- `tags`
- `file_tags`
- `teams`
- `team_members`
- `storage.objects` (files bucket)

## Key Security Rules

1. **Ownership-first access**
   - Files and metadata are accessible only by owner (`user_id = auth.uid()`), unless explicitly shared.

2. **Explicit sharing controls**
   - `shared_files` rows are visible to owners and recipients.
   - Shared file reads enforce active expiry checks.

3. **Team access abstraction**
   - Helper functions:
     - `public.is_team_owner(team_id, user_id)`
     - `public.is_team_member(team_id, user_id)`
   - Team/table policies rely on these to avoid recursive policy pitfalls.

4. **Storage bucket prefix isolation**
   - Authenticated users can only read/write objects under:
     - `files/<auth.uid()>/...`
   - Enforced via `storage.foldername(name)[1] = auth.uid()::text`.

5. **Temporary prototype policies removed**
   - Removes broad policies like “Temporary full access …”.
   - Removes deny-all placeholders that blocked normal authorized operations.

## Authorization Flowchart

```mermaid
flowchart TD
  A[Incoming request] --> B{Table / Bucket}
  B --> C[profiles]
  B --> D[files + versions + tags]
  B --> E[shared_files]
  B --> F[teams + team_members]
  B --> G[storage.objects files bucket]

  C --> C1{auth.uid() == profile.id}
  C1 -->|Yes| ALLOW
  C1 -->|No| DENY

  D --> D1{auth.uid() == file.user_id}
  D1 -->|Yes| ALLOW
  D1 -->|No| D2{valid shared_files entry?}
  D2 -->|Yes| ALLOW
  D2 -->|No| DENY

  E --> E1{owner or recipient?}
  E1 -->|Yes| ALLOW
  E1 -->|No| DENY

  F --> F1{team owner?}
  F1 -->|Yes| ALLOW
  F1 -->|No| F2{team member?}
  F2 -->|Yes| LIMITED_ALLOW
  F2 -->|No| DENY

  G --> G1{prefix[1] == auth.uid()}
  G1 -->|Yes| ALLOW
  G1 -->|No| DENY
```

## Rollout Checklist

1. Apply migration to staging.
2. Verify:
   - file CRUD by owner,
   - shared link behavior,
   - team reads/writes by owner/member.
3. Run smoke tests for uploads/downloads/move/copy.
4. Apply to production during low-traffic window.
5. Monitor auth/storage error rates for regressions.

## Validation Assets
- Runbook: `SECURITY_VALIDATION_RUNBOOK.md`
- SQL checks: `scripts/security_baseline_validation.sql`
- Automated validator: `scripts/validate_security_baseline.mjs`
- Rollout gate validator: `../scripts/ops/validate_security_rollout_gate.mjs`
- Evidence template: `SECURITY_VALIDATION_EVIDENCE_TEMPLATE.md`
- JSON template: `SECURITY_VALIDATION_EVIDENCE_TEMPLATE.json`
- Sample evidence: `SECURITY_VALIDATION_EVIDENCE_SAMPLE.json`
