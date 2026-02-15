# Security Baseline Validation Evidence Template

Use this template when validating security baseline migrations in staging and production.

Companion machine-readable templates:
- `SECURITY_VALIDATION_EVIDENCE_TEMPLATE.json`
- `SECURITY_VALIDATION_EVIDENCE_SAMPLE.json`

---

## Validation Metadata
- Environment: `staging | production`
- Date/Time (UTC):
- Validator:
- Approver:
- Release / Change Ticket:
- Migration set:
  - `20260215_security_baseline.sql`
  - `20260215_audit_events.sql`
  - `20260215_organization_foundation.sql`
  - `20260215_organization_member_management.sql`
  - `20260215_organization_invitation_acceptance.sql`

## SQL Verification Results
Attach or paste output from:
- `supabase/scripts/security_baseline_validation.sql`

### Result Summary
| Check Group | PASS Count | FAIL Count | Notes |
|---|---:|---:|---|
| RLS state |  |  |  |
| Helper functions |  |  |  |
| Forbidden policies |  |  |  |
| Storage prefix policies |  |  |  |

## Functional Smoke Validation
| Scenario | Expected | Actual | Status (PASS/FAIL) | Evidence Ref |
|---|---|---|---|---|
| User A reads own files only | Allowed |  |  |  |
| User B cannot read User A files | Denied |  |  |  |
| Shared link access rules | Correctly enforced |  |  |  |
| Team role boundaries | Correctly enforced |  |  |  |
| Org role boundaries | Correctly enforced |  |  |  |
| Audit event writes | Logged |  |  |  |

## Regression Metrics (30 min post rollout)
| Metric | Baseline | Current | Delta | Status |
|---|---:|---:|---:|---|
| Auth error rate |  |  |  |  |
| Storage error rate |  |  |  |  |
| DB permission errors |  |  |  |  |

## Go / No-Go Decision
- Decision: `GO | NO-GO`
- Decision Owner:
- Timestamp:
- Rationale:

## Follow-up Actions
| Action | Owner | Due Date | Priority |
|---|---|---|---|
|  |  |  |  |

## Release Ticket Attachment Guidance
1. Attach completed markdown template.
2. Attach completed JSON template for automation/audit indexing.
3. Attach raw SQL output and smoke-test evidence bundle.
4. Reference all artifact links in final go/no-go ticket comment.
