import { summarizeTextHeuristic, truncateForModel } from '@/lib/ai/summarizer';

describe('ai summarizer utilities', () => {
  it('returns first sentences up to maxSentences', () => {
    const text = 'Sentence one. Sentence two! Sentence three?';
    expect(summarizeTextHeuristic(text, 2)).toBe('Sentence one. Sentence two!');
  });

  it('handles whitespace-only input', () => {
    expect(summarizeTextHeuristic('   \n\t   ', 2)).toBe('');
  });

  it('truncates model payload deterministically', () => {
    const input = 'a'.repeat(9000);
    expect(truncateForModel(input, 8000)).toHaveLength(8000);
  });
});
