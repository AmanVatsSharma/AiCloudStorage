# Organization IAM Foundation

## Purpose
This document defines the baseline multi-tenant identity and access model introduced by:

- `supabase/migrations/20260215_organization_foundation.sql`

It establishes reusable organization primitives for enterprise tenancy.

## New Database Objects

### Tables
- `organizations`
  - tenant root object (`name`, `slug`, `owner_id`)
- `organization_members`
  - membership and role mapping (`owner`, `admin`, `member`, `billing_viewer`)
- `organization_invitations`
  - invitation lifecycle (`pending`, `accepted`, `revoked`)

### Helper functions
- `is_org_owner(org_id, user_id)`
- `is_org_member(org_id, user_id)`
- `is_org_admin(org_id, user_id)`

### RPCs
- `create_organization_with_owner(name, slug, owner_id)`
- `get_user_organizations(user_id)`

## RLS Baseline
- Organization read access for owners and members.
- Organization writes restricted to owner.
- Member and invitation management restricted to owner/admin context.

## IAM Flowchart
```mermaid
flowchart TD
  A[User authenticated] --> B{Org action}
  B --> C[Create org]
  B --> D[Invite member]
  B --> E[Read org data]
  B --> F[Manage members]

  C --> C1[create_organization_with_owner]
  C1 --> C2[organizations row + owner membership row]

  D --> D1{is_org_admin or is_org_owner}
  D1 -->|Yes| D2[Insert invitation]
  D1 -->|No| D3[Deny]

  E --> E1{is_org_member or is_org_owner}
  E1 -->|Yes| E2[Allow select]
  E1 -->|No| E3[Deny]

  F --> F1{is_org_admin or is_org_owner}
  F1 -->|Yes| F2[Allow member writes]
  F1 -->|No| F3[Deny]
```

## Next Steps
1. Build organization selector and settings UI.
2. Attach files/teams/resources to organization scope.
3. Add policy tests validating cross-org isolation.
4. Introduce SCIM/SSO provisioning pipeline.
