# Operations Evidence Pack Checklist

Use this checklist to assemble a complete release evidence bundle for staging and production rollouts.

---

## 1) Security Evidence
- [ ] SQL verification output attached:
  - `supabase/scripts/security_baseline_validation.sql`
- [ ] Markdown evidence template completed:
  - `supabase/SECURITY_VALIDATION_EVIDENCE_TEMPLATE.md`
- [ ] JSON evidence template completed:
  - `supabase/SECURITY_VALIDATION_EVIDENCE_TEMPLATE.json`
- [ ] If needed, reference sample:
  - `supabase/SECURITY_VALIDATION_EVIDENCE_SAMPLE.json`

## 2) Operational Readiness Evidence
- [ ] Health endpoint probe result captured:
  - `GET /api/health`
  - sample shape: `docs/samples/health_response_sample.json`
- [ ] Reliability alerts snapshot captured:
  - `GET /api/reliability/alerts`
  - sample shape: `docs/samples/reliability_alerts_response_sample.json`
- [ ] SIEM routing behavior confirmed:
  - `docs/operations/SIEM_INTEGRATION.md`

## 3) Release Governance Evidence
- [ ] Release ticket template completed:
  - `docs/operations/RELEASE_VALIDATION_TEMPLATE.md`
- [ ] Incident/DR runbook references attached:
  - `docs/operations/INCIDENT_RESPONSE_RUNBOOK.md`
  - `docs/operations/DISASTER_RECOVERY_RUNBOOK.md`

## 4) Artifact Packaging
- [ ] All evidence file paths are listed in release ticket comments.
- [ ] Raw logs/screenshots are attached or linked.
- [ ] Go/No-Go decision and approver recorded with timestamp.
- [ ] Evidence file naming matches convention:
  - `supabase/evidence/README.md`

## 5) Optional Automation
- [ ] Evidence skeleton generated via npm shortcut:
  ```bash
  npm run security:evidence -- \
    --environment staging \
    --validator platform.engineer@company.com \
    --approver security.lead@company.com \
    --ticket REL-1234
  ```
