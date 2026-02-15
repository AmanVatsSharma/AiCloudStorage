# Security Validation Evidence Artifacts

This directory is the default destination for generated security validation evidence JSON files.

## Naming Convention
- `security-validation-<environment>-<timestamp>.json`
- Timestamp format:
  - `YYYY-MM-DDTHH-MM-SSZ` (UTC-safe filename format)

Example:
- `security-validation-staging-2026-02-15T16-29-37Z.json`

## Generation Command
```bash
npm run security:evidence -- \
  --environment staging \
  --validator platform.engineer@company.com \
  --approver security.lead@company.com \
  --ticket REL-1234
```

## Notes
- Generated files are environment-specific evidence skeletons.
- Complete each file with SQL verification and smoke-test outcomes before attaching to release tickets.
