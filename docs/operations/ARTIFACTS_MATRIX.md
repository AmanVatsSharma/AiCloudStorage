# Operations Artifacts Matrix

This matrix maps templates, scripts, and sample artifacts to release lifecycle phases.

| Phase | Objective | Artifact Type | Artifact |
|---|---|---|---|
| Pre-release planning | Define checklist + owners | Template | `docs/operations/RELEASE_VALIDATION_TEMPLATE.md` |
| Pre-release planning | Define required evidence set | Checklist | `docs/operations/EVIDENCE_PACK_CHECKLIST.md` |
| Pre-release planning | Generate release ticket skeleton | Script | `npm run ops:release-ticket` (`scripts/ops/generate_release_validation_ticket.mjs`) |
| Pre-release planning | Seed security evidence file | Script | `npm run security:evidence` (`supabase/scripts/generate_security_validation_evidence.mjs`) |
| Security validation | Validate RLS/policies/functions | SQL script | `supabase/scripts/security_baseline_validation.sql` |
| Security validation | Run security checks and emit JSON report | Script | `npm run security:validate` (`supabase/scripts/validate_security_baseline.mjs`) |
| Security validation | Record security verification results | Template (md/json) | `supabase/SECURITY_VALIDATION_EVIDENCE_TEMPLATE.md` / `.json` |
| Security validation | Reference expected completed shape | Sample | `supabase/SECURITY_VALIDATION_EVIDENCE_SAMPLE.json` |
| Security validation | Validate report payload contract | Sample | `docs/samples/security_baseline_validation_report_sample.json` |
| Security validation | Validate JSON artifact contract quickly | Script | `npm run ops:validate-json` (`scripts/ops/validate_json_artifacts.mjs`) |
| Security/Integration docs | Define required sample artifact keys | Specification | `docs/samples/SCHEMA_REQUIREMENTS.md` |
| Operational checks | Verify readiness baseline | API | `GET /api/health` |
| Operational checks | Verify reliability alert posture | API | `GET /api/reliability/alerts` |
| Operational checks | Execute combined probe | Script | `npm run ops:probe` (`scripts/ops/probe_endpoints.mjs`) |
| Operational checks | Validate probe payload format | Sample | `docs/samples/ops_probe_output_sample.json` |
| Integration readiness | Confirm reliability payload contract | API sample | `docs/samples/reliability_alerts_response_sample.json` |
| Integration readiness | Confirm health payload contract | API sample | `docs/samples/health_response_sample.json` |
| Integration readiness | Confirm storage analytics payload contract | API sample | `docs/samples/storage_analytics_report_sample.json` |
| Release governance | Provide completed ticket example | Sample | `docs/samples/release_validation_ticket_sample.md` |
| Incident readiness | Ensure response playbook available | Runbook | `docs/operations/INCIDENT_RESPONSE_RUNBOOK.md` |
| Recovery readiness | Ensure DR drill procedure available | Runbook | `docs/operations/DISASTER_RECOVERY_RUNBOOK.md` |

## Recommended Assembly Order
1. Fill `RELEASE_VALIDATION_TEMPLATE.md`.
2. Generate security evidence skeleton JSON.
3. Run SQL security validation script and fill evidence templates.
4. Run API probes and attach payload snapshots.
5. Finalize release decision and follow-up actions.
