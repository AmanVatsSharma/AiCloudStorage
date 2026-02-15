import { estimateAiUsage, estimateTokensFromText, formatUsd } from '@/lib/ai/cost-estimator';

describe('ai cost estimator', () => {
  it('estimates tokens deterministically from text length', () => {
    expect(estimateTokensFromText('abcd')).toBe(1);
    expect(estimateTokensFromText('abcdefgh')).toBe(2);
    expect(estimateTokensFromText('')).toBe(0);
  });

  it('returns zero cost for heuristic provider', () => {
    const usage = estimateAiUsage({
      provider: 'heuristic',
      inputText: 'hello world',
      outputText: 'hello',
    });

    expect(usage.estimatedCostUsd).toBe(0);
  });

  it('returns positive cost estimate for openai provider', () => {
    const usage = estimateAiUsage({
      provider: 'openai',
      inputText: 'a'.repeat(800),
      outputText: 'b'.repeat(200),
    });

    expect(usage.inputTokens).toBeGreaterThan(0);
    expect(usage.outputTokens).toBeGreaterThan(0);
    expect(usage.estimatedCostUsd).toBeGreaterThan(0);
  });

  it('formats usd values consistently', () => {
    expect(formatUsd(0.0001234)).toBe('$0.000123');
  });
});
