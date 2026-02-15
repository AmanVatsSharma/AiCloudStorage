# AI UI Module Documentation

## Scope
Interactive UI workflows for AI-assisted storage features.

Current implementation:
- `SummaryWorkbench.tsx`
  - captures user input,
  - calls `/api/ai/summarize`,
  - displays provider and summary output,
  - emits audit events for success/failure.

Route:
- `/ai-tools` (`app/(dashboard)/ai-tools/page.tsx`)

## Summary Workbench Flowchart
```mermaid
flowchart TD
  A[User opens AI Tools page] --> B[Enter text + sentence target]
  B --> C[Submit to /api/ai/summarize]
  C --> D{API success?}
  D -->|Yes| E[Render summary + provider badge]
  D -->|No| F[Show error toast]
  E --> G[Track audit success event]
  F --> H[Track audit failure event]
```

## Next Steps
- Add file-based summarization from selected storage object.
- Add job history and prompt templates.
- Add model controls and cost budget guardrails per organization.
