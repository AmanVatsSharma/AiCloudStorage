# Operations Documentation Changelog

## 2026-02-15 — Sprint 13
- Added release validation ticket template:
  - `RELEASE_VALIDATION_TEMPLATE.md`
- Added reliability and health sample payload artifacts:
  - `../samples/reliability_alerts_response_sample.json`
  - `../samples/health_response_sample.json`
- Added probe output sample:
  - `../samples/ops_probe_output_sample.json`
- Added consolidated evidence pack checklist:
  - `EVIDENCE_PACK_CHECKLIST.md`

## 2026-02-15 — Sprint 14
- Added operations artifacts matrix:
  - `ARTIFACTS_MATRIX.md`
- Added JSON sample schema requirements:
  - `../samples/SCHEMA_REQUIREMENTS.md`
- Added operational probe automation script docs:
  - references to `npm run ops:probe`
- Added JSON artifact validation automation docs:
  - references to `npm run ops:validate-json`

## 2026-02-15 — Sprint 19
- Added automated security rollout gate validator:
  - `../../scripts/ops/validate_security_rollout_gate.mjs`
- Added security gate command documentation:
  - references to `npm run security:gate`
- Added staging/production security validation sample artifacts:
  - `../samples/security_baseline_validation_report_sample.json`
  - `../samples/security_baseline_validation_report_production_sample.json`
  - `../samples/security_rollout_gate_summary_sample.json`

## Update Policy
- Add one changelog entry per sprint that modifies operations-related docs/scripts.
- Link each entry to artifact paths instead of duplicating content.
