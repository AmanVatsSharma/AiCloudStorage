# JSON Sample Schema Requirements

This document defines top-level key requirements for JSON sample/evidence artifacts validated by:

- `npm run ops:validate-json`
- `scripts/ops/validate_json_artifacts.mjs`

## Required Keys by Artifact

| Artifact | Required Top-Level Keys |
|---|---|
| `docs/samples/reliability_alerts_response_sample.json` | `generatedAt`, `counters`, `alerts` |
| `docs/samples/health_response_sample.json` | `status`, `timestamp`, `checks` |
| `docs/samples/ops_probe_output_sample.json` | `generatedAt`, `baseUrl`, `probes` |
| `docs/samples/storage_analytics_report_sample.json` | `generatedAt`, `mode`, `actorId`, `report` |
| `docs/samples/security_baseline_validation_report_sample.json` | `generatedAt`, `environment`, `overallStatus`, `checks` |
| `docs/samples/security_baseline_validation_report_production_sample.json` | `generatedAt`, `environment`, `overallStatus`, `checks` |
| `docs/samples/security_rollout_gate_summary_sample.json` | `generatedAt`, `gateStatus`, `environments` |
| `supabase/SECURITY_VALIDATION_EVIDENCE_TEMPLATE.json` | `metadata`, `sqlVerification`, `decision` |
| `supabase/SECURITY_VALIDATION_EVIDENCE_SAMPLE.json` | `metadata`, `sqlVerification`, `decision` |

## Maintenance Notes
- Update this document whenever required keys in validation script change.
- Keep artifact samples aligned with API contracts in:
  - `docs/API_RELIABILITY_ALERTS.md`
  - `docs/API_HEALTH.md`
  - `docs/API_STORAGE_ANALYTICS.md`
