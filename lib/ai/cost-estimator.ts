export type AiProvider = 'openai' | 'heuristic';

export interface AiUsageEstimate {
  provider: AiProvider;
  inputChars: number;
  outputChars: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

const OPENAI_GPT_4O_MINI_INPUT_USD_PER_1K = 0.00015;
const OPENAI_GPT_4O_MINI_OUTPUT_USD_PER_1K = 0.0006;

/**
 * Approximate token count using deterministic char-per-token heuristic.
 */
export function estimateTokensFromText(input: string, charsPerToken = 4): number {
  const normalized = input.trim();
  if (!normalized) return 0;
  return Math.ceil(normalized.length / Math.max(1, charsPerToken));
}

/**
 * Estimate usage and cost envelope for summarize operations.
 * Values are informational estimates, not billing-grade values.
 */
export function estimateAiUsage(options: {
  provider: AiProvider;
  inputText: string;
  outputText: string;
}): AiUsageEstimate {
  const inputTokens = estimateTokensFromText(options.inputText);
  const outputTokens = estimateTokensFromText(options.outputText);

  let estimatedCostUsd = 0;
  if (options.provider === 'openai') {
    estimatedCostUsd =
      (inputTokens / 1000) * OPENAI_GPT_4O_MINI_INPUT_USD_PER_1K +
      (outputTokens / 1000) * OPENAI_GPT_4O_MINI_OUTPUT_USD_PER_1K;
  }

  return {
    provider: options.provider,
    inputChars: options.inputText.length,
    outputChars: options.outputText.length,
    inputTokens,
    outputTokens,
    estimatedCostUsd: Number(estimatedCostUsd.toFixed(8)),
  };
}

export function formatUsd(value: number): string {
  return `$${value.toFixed(6)}`;
}
