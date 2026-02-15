import { buildReliabilityReport } from '@/lib/reliability/report';

describe('buildReliabilityReport', () => {
  it('builds indicators and alerts from counters', () => {
    const report = buildReliabilityReport({
      totalEventsLast7d: 100,
      failedEventsLast7d: 1,
      failedEventsLast1h: 0,
      aiTotalLast24h: 20,
      aiFailureLast24h: 0,
    });

    expect(report.indicators.platformSlo.status).toBe('healthy');
    expect(report.indicators.aiSlo.status).toBe('healthy');
    expect(report.alerts.length).toBeGreaterThan(0);
  });

  it('marks warning/breach conditions through counters', () => {
    const report = buildReliabilityReport({
      totalEventsLast7d: 100,
      failedEventsLast7d: 10,
      failedEventsLast1h: 12,
      aiTotalLast24h: 10,
      aiFailureLast24h: 3,
    });

    expect(report.indicators.platformSlo.status === 'warning' || report.indicators.platformSlo.status === 'breach').toBe(true);
    expect(report.alerts.some((alert) => alert.severity === 'critical')).toBe(true);
  });
});
