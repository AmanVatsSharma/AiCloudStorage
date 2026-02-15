export interface BucketValidationResult {
  normalizedName: string;
  valid: boolean;
  reason?: string;
}

/**
 * Normalize bucket names to lowercase, dash-separated values.
 */
export function normalizeBucketName(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, '-');
}

/**
 * Validate bucket names against conservative safe pattern.
 */
export function validateBucketName(input: string): BucketValidationResult {
  const normalizedName = normalizeBucketName(input);
  if (!normalizedName) {
    return {
      normalizedName,
      valid: false,
      reason: 'Bucket name is required.',
    };
  }

  if (normalizedName.length < 3 || normalizedName.length > 63) {
    return {
      normalizedName,
      valid: false,
      reason: 'Bucket name must be 3 to 63 characters.',
    };
  }

  const validPattern = /^[a-z0-9](?:[a-z0-9-_]*[a-z0-9])?$/;
  if (!validPattern.test(normalizedName)) {
    return {
      normalizedName,
      valid: false,
      reason: 'Bucket name may only include lowercase letters, numbers, hyphen, and underscore.',
    };
  }

  return {
    normalizedName,
    valid: true,
  };
}

/**
 * Parse comma-separated MIME list into clean array.
 */
export function parseMimeTypeList(value: string): string[] {
  if (!value.trim()) return [];
  return Array.from(
    new Set(
      value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
    )
  );
}
