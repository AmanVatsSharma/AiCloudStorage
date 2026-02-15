import { generateReliabilityAlerts } from '@/lib/reliability/alerts';
import { evaluateSlo } from '@/lib/reliability/slo';

export interface ReliabilityCounters {
  totalEventsLast7d: number;
  failedEventsLast7d: number;
  failedEventsLast1h: number;
  aiTotalLast24h: number;
  aiFailureLast24h: number;
}

/**
 * Build a reliability report from precomputed counters.
 * Keeps API and UI report generation consistent.
 */
export function buildReliabilityReport(counters: ReliabilityCounters) {
  const platformSlo = evaluateSlo({
    name: 'Platform audit success (7d)',
    successCount: Math.max(0, counters.totalEventsLast7d - counters.failedEventsLast7d),
    totalCount: counters.totalEventsLast7d,
    targetRate: 0.99,
    warningDelta: 0.01,
  });

  const aiSlo = evaluateSlo({
    name: 'AI summary success (24h)',
    successCount: Math.max(0, counters.aiTotalLast24h - counters.aiFailureLast24h),
    totalCount: counters.aiTotalLast24h,
    targetRate: 0.95,
    warningDelta: 0.02,
  });

  const alerts = generateReliabilityAlerts({
    totalEventsLast7d: counters.totalEventsLast7d,
    failedEventsLast7d: counters.failedEventsLast7d,
    failedEventsLast1h: counters.failedEventsLast1h,
    aiTotalLast24h: counters.aiTotalLast24h,
    aiFailureLast24h: counters.aiFailureLast24h,
  });

  return {
    windows: {
      platform: '7d',
      ai: '24h',
      failureSpike: '1h',
    },
    counters,
    indicators: {
      platformSlo,
      aiSlo,
    },
    alerts,
  };
}
