# Features Reference

## Authentication
- Email/password authentication
- OAuth sign-in (Google, GitHub)
- Password reset flow
- Demo account bootstrap path (temporary test support)

## Storage Management
- File upload/download
- Folder management
- Move/copy actions
- Favorites/recent/shared views
- Version archival on overwrite
- Soft-delete trash lifecycle with retention enforcement

## Search and Discovery
- Basic name search
- Advanced filters:
  - files/folders scope
  - category
  - metadata text
  - size range
  - updated date range

## Sharing and Collaboration
- Private/public share links
- Access-level controls
- Expiry controls
- Download policy toggle
- Team and organization member management

## Governance and Security
- Retention and permanent-delete policy controls
- Storage bucket governance UI/API
- Audit event tracking
- Compliance posture dashboard
- Security validation scripts/evidence tooling

## AI and Insights
- AI summarize API + UI
- Fallback summarization behavior
- Rate limiting with retry metadata
- Usage/cost telemetry
- Analytics dashboard and API

## Reliability and Operations
- Reliability dashboard with alert thresholds
- Health endpoint (`/api/health`)
- Reliability alerts API (`/api/reliability/alerts`)
- Operations probe/validation scripts
