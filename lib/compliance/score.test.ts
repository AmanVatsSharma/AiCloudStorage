import { calculateComplianceScore } from '@/lib/compliance/score';

describe('calculateComplianceScore', () => {
  it('returns excellent score when signals are healthy', () => {
    const result = calculateComplianceScore({
      hasStoragePolicy: true,
      retentionDays: 30,
      failedAuditEventsLast7d: 0,
      pendingInvitations: 1,
      publicShareLinks: 1,
    });

    expect(result.score).toBe(100);
    expect(result.grade).toBe('excellent');
  });

  it('applies penalties for risky controls', () => {
    const result = calculateComplianceScore({
      hasStoragePolicy: false,
      retentionDays: 3,
      failedAuditEventsLast7d: 4,
      pendingInvitations: 30,
      publicShareLinks: 15,
    });

    expect(result.score).toBeLessThan(100);
    expect(result.grade === 'needs_attention' || result.grade === 'critical').toBe(true);
    expect(result.notes.length).toBeGreaterThan(0);
  });
});
