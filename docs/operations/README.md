# Operations Runbooks

## Scope
This module captures operational response procedures for reliability and compliance-sensitive incidents.

## Runbooks
- `INCIDENT_RESPONSE_RUNBOOK.md`
  - Severity classification
  - Triage and containment
  - Communication protocol
  - Recovery and post-incident review
- `DISASTER_RECOVERY_RUNBOOK.md`
  - Recovery Point Objective (RPO) / Recovery Time Objective (RTO)
  - Backup/restore verification workflow
  - Regional outage response drill template

## Operations Flowchart
```mermaid
flowchart TD
  A[Alert or customer report] --> B[Classify severity]
  B --> C[Incident commander assigned]
  C --> D[Containment + mitigation]
  D --> E[Service stabilization]
  E --> F[Customer/internal communication updates]
  F --> G[Recovery validation]
  G --> H[Post-incident review + follow-up actions]
```
