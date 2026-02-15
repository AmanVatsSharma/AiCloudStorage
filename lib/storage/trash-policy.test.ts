import { formatRetentionCountdown, getPurgeEligibility } from '@/lib/storage/trash-policy';

describe('trash retention policy helpers', () => {
  it('returns eligible when trashedAt is missing', () => {
    const result = getPurgeEligibility(null, 30, Date.now());
    expect(result.eligible).toBe(true);
    expect(result.remainingMs).toBe(0);
  });

  it('returns ineligible before retention window ends', () => {
    const now = new Date('2026-02-15T00:00:00.000Z').getTime();
    const trashedAt = '2026-02-10T00:00:00.000Z';
    const result = getPurgeEligibility(trashedAt, 10, now);
    expect(result.eligible).toBe(false);
    expect(result.remainingMs).toBeGreaterThan(0);
  });

  it('returns eligible after retention window', () => {
    const now = new Date('2026-02-25T00:00:00.000Z').getTime();
    const trashedAt = '2026-02-10T00:00:00.000Z';
    const result = getPurgeEligibility(trashedAt, 10, now);
    expect(result.eligible).toBe(true);
  });

  it('formats countdown labels', () => {
    expect(formatRetentionCountdown(0)).toBe('Eligible now');
    expect(formatRetentionCountdown(24 * 60 * 60 * 1000)).toBe('1 day remaining');
  });
});
