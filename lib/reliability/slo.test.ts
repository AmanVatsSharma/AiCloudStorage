import { evaluateSlo, toPercent } from '@/lib/reliability/slo';

describe('evaluateSlo', () => {
  it('returns no_data when total count is zero', () => {
    const result = evaluateSlo({
      name: 'test',
      successCount: 0,
      totalCount: 0,
      targetRate: 0.99,
    });

    expect(result.status).toBe('no_data');
    expect(result.successRate).toBe(0);
  });

  it('returns healthy when success rate meets target', () => {
    const result = evaluateSlo({
      name: 'test',
      successCount: 99,
      totalCount: 100,
      targetRate: 0.99,
    });

    expect(result.status).toBe('healthy');
  });

  it('returns warning when slightly below target', () => {
    const result = evaluateSlo({
      name: 'test',
      successCount: 98,
      totalCount: 100,
      targetRate: 0.99,
    });

    expect(result.status).toBe('warning');
  });

  it('returns breach when materially below target', () => {
    const result = evaluateSlo({
      name: 'test',
      successCount: 70,
      totalCount: 100,
      targetRate: 0.95,
    });

    expect(result.status).toBe('breach');
    expect(result.shortfall).toBeGreaterThan(0);
  });
});

describe('toPercent', () => {
  it('formats ratios to percentage strings', () => {
    expect(toPercent(0.9876)).toBe('98.76%');
  });
});
