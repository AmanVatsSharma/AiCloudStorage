export const VERSION_ROOT_PREFIX = 'versions';

/**
 * Prevent path traversal and malformed version object names.
 */
export function sanitizeVersionFileName(fileName: string): string {
  return fileName.replaceAll('/', '_').replaceAll('\\', '_').trim() || 'file';
}

/**
 * Build deterministic object path for archived file versions.
 */
export function buildVersionObjectPath(fileId: string, version: number, fileName: string): string {
  const safeName = sanitizeVersionFileName(fileName);
  return `${VERSION_ROOT_PREFIX}/${fileId}/${version}/${safeName}`;
}

/**
 * Compute next monotonic version number from latest stored version.
 */
export function getNextVersionNumber(latestVersion?: number | null): number {
  if (!latestVersion || latestVersion < 0) return 1;
  return latestVersion + 1;
}
