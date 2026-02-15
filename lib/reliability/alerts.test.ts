import { generateReliabilityAlerts } from '@/lib/reliability/alerts';

describe('generateReliabilityAlerts', () => {
  it('returns info baseline when thresholds are healthy', () => {
    const alerts = generateReliabilityAlerts({
      totalEventsLast7d: 100,
      failedEventsLast7d: 1,
      failedEventsLast1h: 0,
      aiTotalLast24h: 20,
      aiFailureLast24h: 0,
    });

    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('info');
  });

  it('returns critical platform failure alerts', () => {
    const alerts = generateReliabilityAlerts({
      totalEventsLast7d: 100,
      failedEventsLast7d: 10,
      failedEventsLast1h: 12,
      aiTotalLast24h: 0,
      aiFailureLast24h: 0,
    });

    expect(alerts.some((alert) => alert.code === 'platform_failure_rate_critical')).toBe(true);
    expect(alerts.some((alert) => alert.code === 'failure_spike_critical')).toBe(true);
  });

  it('returns AI warning when AI failure rate is elevated', () => {
    const alerts = generateReliabilityAlerts({
      totalEventsLast7d: 200,
      failedEventsLast7d: 2,
      failedEventsLast1h: 0,
      aiTotalLast24h: 20,
      aiFailureLast24h: 3,
    });

    expect(alerts.some((alert) => alert.code === 'ai_failure_rate_warning')).toBe(true);
  });
});
