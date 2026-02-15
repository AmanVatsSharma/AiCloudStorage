# AI Service Foundation

## Implemented Endpoint
- `POST /api/ai/summarize`

Request body:
```json
{
  "text": "Long content...",
  "maxSentences": 2
}
```

Response:
```json
{
  "summary": "...",
  "provider": "openai | heuristic",
  "maxSentences": 2
}
```

## Reliability Strategy
1. Try OpenAI when `OPENAI_API_KEY` is configured.
2. If OpenAI fails, gracefully fallback to deterministic heuristic summarizer.
3. Emit structured logs for both success and fallback/error paths.

## Supporting Utilities
- `lib/ai/summarizer.ts`
  - `summarizeTextHeuristic`
  - `truncateForModel`

## Test Coverage
- `lib/ai/summarizer.test.ts`
  - sentence extraction behavior
  - empty input handling
  - deterministic truncation behavior

## AI Summary Flowchart
```mermaid
flowchart TD
  A[POST /api/ai/summarize] --> B{Valid request text?}
  B -->|No| C[400 bad request]
  B -->|Yes| D{OPENAI_API_KEY configured?}
  D -->|No| E[Heuristic summary]
  D -->|Yes| F[Try OpenAI completion]
  F -->|Success| G[Return OpenAI summary]
  F -->|Failure| H[Log warning + fallback heuristic]
  E --> I[Return summary payload]
  G --> I
  H --> I
```

## Next Steps
- Add queue-backed async summarization jobs for large files.
- Add tenant-level model and cost controls.
- Persist AI outputs with moderation and retention policy checks.
