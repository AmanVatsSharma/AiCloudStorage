# Release Validation Ticket Template

Use this template for staging/production rollout tickets to ensure operational, security, and reliability evidence is consistently captured.

---

## Release Metadata
- Release ID:
- Environment: `staging | production`
- Date/Time (UTC):
- Change Owner:
- Approver(s):
- Related PRs/Commits:

## Scope of Change
- Summary:
- Risk level: `low | medium | high`
- Affected modules/routes:

## Pre-Deployment Checks
- [ ] CI green (lint/test/build)
- [ ] Migration plan reviewed
- [ ] Backup/snapshot completed
- [ ] Rollback plan documented

## Security Validation Evidence
- [ ] SQL verification executed:
  - `supabase/scripts/security_baseline_validation.sql`
- [ ] Evidence files attached:
  - `supabase/SECURITY_VALIDATION_EVIDENCE_TEMPLATE.md` (completed)
  - `supabase/SECURITY_VALIDATION_EVIDENCE_TEMPLATE.json` (completed)
- [ ] Security runbook reviewed:
  - `supabase/SECURITY_VALIDATION_RUNBOOK.md`

## Operational Readiness Evidence
- [ ] Health endpoint check:
  - `GET /api/health` returns expected status
- [ ] Reliability alerts check:
  - `GET /api/reliability/alerts` returns expected shape and status
- [ ] Alert routing validated in SIEM/monitoring workflow

## Post-Deployment Verification
- [ ] Smoke tests executed
- [ ] Error-rate regression review complete
- [ ] Audit event flow validated
- [ ] Customer-facing status update completed (if required)

## Go / No-Go Decision
- Decision: `GO | NO-GO`
- Decision Timestamp (UTC):
- Decision Owner:
- Rationale:

## Follow-up Actions
| Action | Owner | Due Date | Priority |
|---|---|---|---|
|  |  |  |  |
