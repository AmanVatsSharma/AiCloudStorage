export type ReliabilityAlertSeverity = 'info' | 'warning' | 'critical';

export interface ReliabilityAlert {
  code: string;
  severity: ReliabilityAlertSeverity;
  title: string;
  description: string;
  recommendedAction: string;
}

export interface ReliabilityAlertInput {
  totalEventsLast7d: number;
  failedEventsLast7d: number;
  failedEventsLast1h: number;
  aiTotalLast24h: number;
  aiFailureLast24h: number;
}

/**
 * Generate threshold-based reliability alerts from audit counters.
 */
export function generateReliabilityAlerts(input: ReliabilityAlertInput): ReliabilityAlert[] {
  const alerts: ReliabilityAlert[] = [];
  const platformFailureRate =
    input.totalEventsLast7d > 0 ? input.failedEventsLast7d / input.totalEventsLast7d : 0;
  const aiFailureRate = input.aiTotalLast24h > 0 ? input.aiFailureLast24h / input.aiTotalLast24h : 0;

  if (platformFailureRate >= 0.05) {
    alerts.push({
      code: 'platform_failure_rate_critical',
      severity: 'critical',
      title: 'Platform failure rate is critically high',
      description: `7-day platform failure rate is ${(platformFailureRate * 100).toFixed(
        2
      )}% (${input.failedEventsLast7d}/${input.totalEventsLast7d}).`,
      recommendedAction:
        'Escalate incident triage immediately and inspect failing audit actions by resource type.',
    });
  } else if (platformFailureRate >= 0.02) {
    alerts.push({
      code: 'platform_failure_rate_warning',
      severity: 'warning',
      title: 'Platform failure rate is above warning threshold',
      description: `7-day platform failure rate is ${(platformFailureRate * 100).toFixed(
        2
      )}% (${input.failedEventsLast7d}/${input.totalEventsLast7d}).`,
      recommendedAction:
        'Review failure clusters and schedule remediation before rate reaches critical threshold.',
    });
  }

  if (input.failedEventsLast1h >= 10) {
    alerts.push({
      code: 'failure_spike_critical',
      severity: 'critical',
      title: 'Failure spike detected in last hour',
      description: `${input.failedEventsLast1h} failed events occurred in the last hour.`,
      recommendedAction:
        'Treat as active incident and trigger incident response runbook for rapid containment.',
    });
  } else if (input.failedEventsLast1h >= 3) {
    alerts.push({
      code: 'failure_spike_warning',
      severity: 'warning',
      title: 'Failure spike warning in last hour',
      description: `${input.failedEventsLast1h} failed events occurred in the last hour.`,
      recommendedAction: 'Inspect recent deployments and high-volume failure actions.',
    });
  }

  if (input.aiTotalLast24h > 0 && aiFailureRate >= 0.2) {
    alerts.push({
      code: 'ai_failure_rate_critical',
      severity: 'critical',
      title: 'AI summarization failure rate is critically high',
      description: `AI summary failure rate is ${(aiFailureRate * 100).toFixed(2)}% (${input.aiFailureLast24h}/${
        input.aiTotalLast24h
      }) over 24 hours.`,
      recommendedAction:
        'Investigate provider errors, fallback behavior, and request validation issues.',
    });
  } else if (input.aiTotalLast24h > 0 && aiFailureRate >= 0.1) {
    alerts.push({
      code: 'ai_failure_rate_warning',
      severity: 'warning',
      title: 'AI summarization failure rate warning',
      description: `AI summary failure rate is ${(aiFailureRate * 100).toFixed(2)}% (${input.aiFailureLast24h}/${
        input.aiTotalLast24h
      }) over 24 hours.`,
      recommendedAction:
        'Review AI provider fallback frequency and recent model/API response anomalies.',
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      code: 'reliability_baseline_healthy',
      severity: 'info',
      title: 'No active reliability alert thresholds breached',
      description: 'Current counters are below configured warning/critical alert thresholds.',
      recommendedAction: 'Continue monitoring SLO trends and maintain incident readiness.',
    });
  }

  return alerts;
}
