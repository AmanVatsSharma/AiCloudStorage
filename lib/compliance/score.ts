export interface ComplianceSignals {
  hasStoragePolicy: boolean;
  retentionDays: number;
  failedAuditEventsLast7d: number;
  pendingInvitations: number;
  publicShareLinks: number;
}

export interface ComplianceScoreResult {
  score: number;
  grade: 'excellent' | 'good' | 'needs_attention' | 'critical';
  notes: string[];
}

/**
 * Deterministic compliance score calculator for dashboarding/reporting.
 */
export function calculateComplianceScore(signals: ComplianceSignals): ComplianceScoreResult {
  let score = 100;
  const notes: string[] = [];

  if (!signals.hasStoragePolicy) {
    score -= 25;
    notes.push('Storage retention policy is not configured.');
  }

  if (signals.retentionDays < 7) {
    score -= 10;
    notes.push('Retention period is very short (< 7 days).');
  }

  if (signals.failedAuditEventsLast7d > 0) {
    const penalty = Math.min(25, signals.failedAuditEventsLast7d * 2);
    score -= penalty;
    notes.push(`${signals.failedAuditEventsLast7d} failed audit events in the last 7 days.`);
  }

  if (signals.pendingInvitations > 25) {
    score -= 10;
    notes.push('High number of pending invitations detected.');
  }

  if (signals.publicShareLinks > 10) {
    score -= 15;
    notes.push('Many active public share links are enabled.');
  }

  score = Math.max(0, Math.min(100, score));

  let grade: ComplianceScoreResult['grade'] = 'excellent';
  if (score < 35) grade = 'critical';
  else if (score < 60) grade = 'needs_attention';
  else if (score < 80) grade = 'good';

  if (notes.length === 0) {
    notes.push('Baseline controls look healthy.');
  }

  return { score, grade, notes };
}
