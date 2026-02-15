# Organizations Module Documentation

## Scope
This module provides enterprise tenancy entry points:
- creating organizations,
- listing organization memberships for current user,
- invitation management for owner/admin roles.

## Components
- `OrganizationDialog.tsx`
  - creates organization via `create_organization_with_owner` RPC.
  - emits audit events for success/failure.
- `OrganizationList.tsx`
  - fetches memberships via `get_user_organizations`.
  - renders role badges and organization metadata.
- `OrganizationInviteDialog.tsx`
  - creates invitations in `organization_invitations`.
  - captures role + email + token and emits audit events.
  - enforces centralized permission matrix from `lib/authorization/organization-permissions.ts`.

Route:
- `/organizations` (`app/(dashboard)/organizations/page.tsx`)

## Organization Workflow Flowchart
```mermaid
flowchart TD
  A[Open /organizations] --> B[Resolve authenticated user]
  B -->|No user| C[Redirect to /login]
  B -->|User resolved| D[Fetch org memberships]
  D --> E{Create org?}
  E -->|Yes| F[Submit create_organization_with_owner RPC]
  F --> G{RPC success?}
  G -->|Yes| H[Emit audit success + refresh list]
  G -->|No| I[Emit audit failure + show error]
  D --> J{Owner/Admin invite?}
  J -->|Yes| K[Insert organization_invitations row]
  K --> L[Emit invitation audit event]
```

## Next Steps
- Add role management screen for organization members.
- Add organization-scoped settings and policy controls.
