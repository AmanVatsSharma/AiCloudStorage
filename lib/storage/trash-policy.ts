export interface PurgeEligibilityResult {
  eligible: boolean;
  eligibleAt: string | null;
  remainingMs: number;
}

const MS_IN_DAY = 24 * 60 * 60 * 1000;

/**
 * Calculates whether a trashed item can be permanently purged.
 */
export function getPurgeEligibility(
  trashedAt: string | null,
  retentionDays: number,
  now: number = Date.now()
): PurgeEligibilityResult {
  if (!trashedAt) {
    return {
      eligible: true,
      eligibleAt: null,
      remainingMs: 0,
    };
  }

  const retentionMs = Math.max(0, retentionDays) * MS_IN_DAY;
  const trashTime = new Date(trashedAt).getTime();
  const eligibleAtMs = trashTime + retentionMs;
  const remainingMs = Math.max(0, eligibleAtMs - now);

  return {
    eligible: remainingMs === 0,
    eligibleAt: new Date(eligibleAtMs).toISOString(),
    remainingMs,
  };
}

/**
 * Formats remaining retention window into a readable label.
 */
export function formatRetentionCountdown(remainingMs: number): string {
  if (remainingMs <= 0) {
    return 'Eligible now';
  }

  const days = Math.ceil(remainingMs / MS_IN_DAY);
  return `${days} day${days === 1 ? '' : 's'} remaining`;
}
