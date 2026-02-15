# Documentation Index

## Core Architecture & Product
- `PROJECT_OVERVIEW.md`
- `ARCHITECTURE.md`
- `ROADMAP.md`
- `GUIDELINES.md`

## API References
- `API_RELIABILITY_ALERTS.md`
- `API_HEALTH.md`
- `samples/README.md`
- `samples/reliability_alerts_response_sample.json`
- `samples/health_response_sample.json`
- `samples/ops_probe_output_sample.json`
- `samples/release_validation_ticket_sample.md`

### Quickstart API Examples
```bash
# Reliability alerts (integration mode, global scope)
curl -sS \
  -H "Authorization: Bearer ${RELIABILITY_ALERTS_API_TOKEN}" \
  "https://<app-host>/api/reliability/alerts?scope=global"

# Health/readiness probe
curl -sS "https://<app-host>/api/health"
```

## Security & Compliance
- `AUDIT_LOGGING.md`
- `ORG_IAM_FOUNDATION.md`
- `../supabase/SECURITY_BASELINE.md`
- `../supabase/SECURITY_VALIDATION_RUNBOOK.md`
- `../supabase/SECURITY_VALIDATION_EVIDENCE_TEMPLATE.md`
- `../supabase/SECURITY_VALIDATION_EVIDENCE_TEMPLATE.json`
- `../supabase/SECURITY_VALIDATION_EVIDENCE_SAMPLE.json`
- `../supabase/scripts/generate_security_validation_evidence.mjs`
- `../supabase/evidence/README.md`

```bash
# Generate a validation evidence skeleton
npm run security:evidence -- \
  --environment staging \
  --validator platform.engineer@company.com \
  --approver security.lead@company.com \
  --ticket REL-1234

# Probe health + reliability APIs
npm run ops:probe -- \
  --base-url "https://<app-host>" \
  --scope global \
  --reliability-token "${RELIABILITY_ALERTS_API_TOKEN}"

# Validate JSON sample/evidence artifacts
npm run ops:validate-json
```

## AI Services
- `AI_SERVICE_FOUNDATION.md`

## Operations
- `operations/README.md`
- `operations/INCIDENT_RESPONSE_RUNBOOK.md`
- `operations/DISASTER_RECOVERY_RUNBOOK.md`
- `operations/SIEM_INTEGRATION.md`
- `operations/RELEASE_VALIDATION_TEMPLATE.md`
- `operations/EVIDENCE_PACK_CHECKLIST.md`
- `operations/ARTIFACTS_MATRIX.md`
