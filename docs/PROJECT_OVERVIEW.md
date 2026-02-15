# AI Cloud Storage Platform — Project Overview

## Product Vision
Build an enterprise-ready storage SaaS that combines:
- secure multi-tenant file management,
- team collaboration and governance,
- AI-powered storage intelligence.

The current repository has moved from prototype to **hardening phase** with
security, reliability, and architecture cleanup as top priority.

---

## Implemented Today

### Core platform
- Authentication (email/password + OAuth)
- Dashboard shell with protected routes
- File explorer with:
  - upload (button and drag-drop),
  - folder management,
  - move/copy/delete actions,
  - file preview,
  - share dialog,
  - tags and version history UI hooks
- Team management:
  - team create/edit/delete,
  - member list and invite dialogs

### Hardening already completed
- Canonical Supabase type model across app modules
- Structured logging (`lib/logger.ts`) and shared error utilities (`lib/errors.ts`)
- Initial test baseline (Jest unit tests for core utilities)
- Enterprise route placeholders to avoid dead navigation paths
- Security baseline SQL migration with least-privilege RLS and storage prefix isolation
- Audit logging foundation migration + frontend tracker (`lib/audit.ts`)

---

## In Progress (Enterprise Transformation)

### Security and governance
- Enforce hardened RLS/storage policies in staging and production
- Expand policy validation tests
- Mature sharing controls (domain restrictions, approvals, stronger policy model)

### Identity and access
- Organization/workspace model
- Fine-grained RBAC/ABAC and delegated admin controls
- SSO/SAML/SCIM-ready architecture

### Audit and compliance
- Audit event explorer UI
- Export/reporting flows
- Retention and legal hold controls

### AI differentiation
- Async AI pipeline services
- classification, semantic search, and auto-tagging
- policy-aware AI processing controls

---

## Technical Stack (Current)
- **Frontend**: Next.js (App Router), React, TypeScript, Tailwind CSS
- **Backend services**: Supabase (Auth, Postgres, Storage, RPC)
- **Testing**: Jest unit test baseline
- **Observability (app-level)**: structured client/server logs + audit event RPC foundation

For architecture details and phased direction, see:
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`