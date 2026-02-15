# Documentation Index

## Core Architecture & Product
- `PROJECT_OVERVIEW.md`
- `ARCHITECTURE.md`
- `DATABASE_SCHEMA.md`
- `ROADMAP.md`
- `GUIDELINES.md`

## API References
- `API_RELIABILITY_ALERTS.md`
- `API_HEALTH.md`
- `API_STORAGE_ANALYTICS.md`
- `API_STORAGE_BUCKETS.md`
- `samples/README.md`
- `samples/SCHEMA_REQUIREMENTS.md`
- `samples/reliability_alerts_response_sample.json`
- `samples/health_response_sample.json`
- `samples/ops_probe_output_sample.json`
- `samples/storage_analytics_report_sample.json`
- `samples/security_baseline_validation_report_sample.json`
- `samples/security_baseline_validation_report_production_sample.json`
- `samples/security_rollout_gate_summary_sample.json`
- `samples/storage_buckets_response_sample.json`
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
- `../supabase/scripts/validate_security_baseline.mjs`
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

# Run security baseline checks against target database
npm run security:validate -- \
  --environment staging \
  --connection-string "${SUPABASE_DB_URL}" \
  --output "supabase/evidence/security-baseline-validation-staging.json"

# Validate staging + production reports before release go/no-go
npm run security:gate -- \
  --staging-report "supabase/evidence/security-baseline-validation-staging.json" \
  --production-report "supabase/evidence/security-baseline-validation-production.json" \
  --output "supabase/evidence/security-rollout-gate-summary.json"

# Probe staging preset
npm run ops:probe -- \
  --base-url "https://staging.example.com" \
  --scope global \
  --reliability-token "${STAGING_RELIABILITY_ALERTS_API_TOKEN}"

# Probe production preset
npm run ops:probe -- \
  --base-url "https://app.example.com" \
  --scope global \
  --reliability-token "${PROD_RELIABILITY_ALERTS_API_TOKEN}"

# Validate JSON sample/evidence artifacts
npm run ops:validate-json

# Generate release validation ticket skeleton
npm run ops:release-ticket -- \
  --release-id release-2026-02-15-01 \
  --environment staging \
  --owner platform.engineer@company.com \
  --approver security.lead@company.com
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
- `operations/CHANGELOG.md`
