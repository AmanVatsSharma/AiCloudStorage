/**
 * Minimal deterministic summarizer fallback.
 * Used when external AI providers are unavailable.
 */
export function summarizeTextHeuristic(input: string, maxSentences = 2): string {
  const clean = input.replace(/\s+/g, ' ').trim();
  if (!clean) return '';

  const sentences = clean
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length === 0) return clean.slice(0, 280);

  return sentences.slice(0, Math.max(1, maxSentences)).join(' ');
}

export function truncateForModel(input: string, maxChars = 8000): string {
  if (input.length <= maxChars) return input;
  return input.slice(0, maxChars);
}
