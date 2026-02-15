# Sample Payload Artifacts

This directory stores example JSON payloads for API integration testing and documentation.

## Naming Convention
- `<api_or_domain>_<payload_type>_sample.json`

Examples:
- `reliability_alerts_response_sample.json`
- `health_response_sample.json`
- `ops_probe_output_sample.json`
- `storage_analytics_report_sample.json`
- `security_baseline_validation_report_sample.json`

## Usage Guidelines
- Samples should be sanitized and non-sensitive.
- Keep schema aligned with current API docs:
  - `docs/API_RELIABILITY_ALERTS.md`
  - `docs/API_HEALTH.md`
- Update samples when response contracts change.
- Keep required top-level keys aligned with:
  - `docs/samples/SCHEMA_REQUIREMENTS.md`
  - `scripts/ops/validate_json_artifacts.mjs`
