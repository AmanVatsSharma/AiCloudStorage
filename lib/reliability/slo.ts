export type SloStatus = 'healthy' | 'warning' | 'breach' | 'no_data';

export interface SloEvaluationInput {
  name: string;
  successCount: number;
  totalCount: number;
  targetRate: number;
  warningDelta?: number;
}

export interface SloEvaluationResult {
  name: string;
  successCount: number;
  totalCount: number;
  successRate: number;
  targetRate: number;
  status: SloStatus;
  shortfall: number;
}

/**
 * Evaluate one SLO indicator from success/total counters.
 */
export function evaluateSlo(input: SloEvaluationInput): SloEvaluationResult {
  const warningDelta = input.warningDelta ?? 0.01;

  if (input.totalCount <= 0) {
    return {
      name: input.name,
      successCount: input.successCount,
      totalCount: input.totalCount,
      successRate: 0,
      targetRate: input.targetRate,
      status: 'no_data',
      shortfall: input.targetRate,
    };
  }

  const successRate = Math.max(0, Math.min(1, input.successCount / input.totalCount));
  const shortfall = Math.max(0, input.targetRate - successRate);

  let status: SloStatus = 'healthy';
  if (successRate < input.targetRate - warningDelta) {
    status = 'breach';
  } else if (successRate < input.targetRate) {
    status = 'warning';
  }

  return {
    name: input.name,
    successCount: input.successCount,
    totalCount: input.totalCount,
    successRate,
    targetRate: input.targetRate,
    status,
    shortfall,
  };
}

/**
 * Convert ratio to fixed percent string.
 */
export function toPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}
