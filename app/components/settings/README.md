# Settings Module Documentation

## Scope
The settings module introduces governance-focused account controls.

Current implementation:
- Storage retention policy settings
- Permanent delete enable/disable control
- Audit event tracking for policy updates

## Components
- `StoragePolicyForm.tsx`
  - reads user policy from `storage_policies`
  - upserts updates with validation bounds (1..3650 days)
  - emits `storage.policy.update` audit events

Route:
- `/settings` (`app/(dashboard)/settings/page.tsx`)

## Settings Workflow Flowchart
```mermaid
flowchart TD
  A[Open settings page] --> B[Server validates authenticated session]
  B --> C[Render StoragePolicyForm]
  C --> D[Fetch existing storage_policies row]
  D --> E{Policy exists?}
  E -->|Yes| F[Populate form]
  E -->|No| G[Use defaults]
  F --> H[User updates controls]
  G --> H
  H --> I[Upsert storage_policies]
  I --> J[Track storage.policy.update audit event]
```

## Next Steps
- Promote policy scope from user-level to organization-level.
- Add legal hold toggle and restricted role controls.
- Add policy history timeline backed by audit events.
