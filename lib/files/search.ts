export type FileSearchScope = 'all' | 'files' | 'folders';
export type FileSearchCategory =
  | 'all'
  | 'image'
  | 'document'
  | 'video'
  | 'audio'
  | 'archive'
  | 'other';

export interface FileSearchFilterInput {
  itemScope?: FileSearchScope;
  category?: FileSearchCategory;
  metadataQuery?: string;
  minSizeMb?: string;
  maxSizeMb?: string;
  updatedAfter?: string;
  updatedBefore?: string;
}

export interface FileSearchRequestInput {
  query: string;
  filters?: FileSearchFilterInput;
}

export interface NormalizedFileSearchFilters {
  itemScope: FileSearchScope;
  category: FileSearchCategory;
  metadataQuery: string;
  minSizeBytes: number | null;
  maxSizeBytes: number | null;
  updatedAfter: string | null;
  updatedBefore: string | null;
}

export interface NormalizedFileSearchRequest {
  query: string;
  filters: NormalizedFileSearchFilters;
}

export interface SearchableFileRecord {
  id: string;
  name: string;
  type: string;
  size: number;
  is_folder: boolean;
  created_at: string;
  updated_at?: string;
  metadata?: unknown;
}

function toNullableNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value.trim());
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function clampSizeBounds(minValue: number | null, maxValue: number | null): [number | null, number | null] {
  if (minValue !== null && maxValue !== null && minValue > maxValue) {
    return [maxValue, minValue];
  }
  return [minValue, maxValue];
}

function toIsoDateOrNull(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed;
}

/**
 * Normalizes mixed UI form inputs into deterministic search criteria.
 */
export function normalizeFileSearchRequest(input: FileSearchRequestInput): NormalizedFileSearchRequest {
  const rawFilters = input.filters ?? {};
  const [minSizeMb, maxSizeMb] = clampSizeBounds(
    toNullableNumber(rawFilters.minSizeMb),
    toNullableNumber(rawFilters.maxSizeMb)
  );

  return {
    query: input.query.trim(),
    filters: {
      itemScope: rawFilters.itemScope ?? 'all',
      category: rawFilters.category ?? 'all',
      metadataQuery: (rawFilters.metadataQuery ?? '').trim().toLowerCase(),
      minSizeBytes: minSizeMb === null ? null : Math.round(minSizeMb * 1024 * 1024),
      maxSizeBytes: maxSizeMb === null ? null : Math.round(maxSizeMb * 1024 * 1024),
      updatedAfter: toIsoDateOrNull(rawFilters.updatedAfter),
      updatedBefore: toIsoDateOrNull(rawFilters.updatedBefore),
    },
  };
}

/**
 * Returns true when query or any advanced filter is enabled.
 */
export function hasActiveSearchCriteria(request: NormalizedFileSearchRequest): boolean {
  const { query, filters } = request;
  return Boolean(
    query ||
      filters.itemScope !== 'all' ||
      filters.category !== 'all' ||
      filters.metadataQuery ||
      filters.minSizeBytes !== null ||
      filters.maxSizeBytes !== null ||
      filters.updatedAfter ||
      filters.updatedBefore
  );
}

/**
 * Count active non-default filters for UI badges.
 */
export function getActiveFilterCount(filters: NormalizedFileSearchFilters): number {
  let total = 0;
  if (filters.itemScope !== 'all') total += 1;
  if (filters.category !== 'all') total += 1;
  if (filters.metadataQuery) total += 1;
  if (filters.minSizeBytes !== null) total += 1;
  if (filters.maxSizeBytes !== null) total += 1;
  if (filters.updatedAfter) total += 1;
  if (filters.updatedBefore) total += 1;
  return total;
}

/**
 * Derive normalized category grouping from MIME type.
 */
export function resolveFileCategory(type: string, isFolder: boolean): FileSearchCategory {
  if (isFolder) return 'other';
  const normalizedType = (type || '').toLowerCase();
  if (normalizedType.startsWith('image/')) return 'image';
  if (normalizedType.startsWith('video/')) return 'video';
  if (normalizedType.startsWith('audio/')) return 'audio';
  if (
    normalizedType.includes('pdf') ||
    normalizedType.includes('word') ||
    normalizedType.includes('document') ||
    normalizedType.includes('sheet') ||
    normalizedType.includes('presentation') ||
    normalizedType.startsWith('text/')
  ) {
    return 'document';
  }
  if (
    normalizedType.includes('zip') ||
    normalizedType.includes('tar') ||
    normalizedType.includes('gzip') ||
    normalizedType.includes('rar') ||
    normalizedType.includes('7z')
  ) {
    return 'archive';
  }
  return 'other';
}

function matchesDateRange(itemDate: string, startDate: string | null, endDate: string | null): boolean {
  const timestamp = new Date(itemDate).getTime();
  if (!Number.isFinite(timestamp)) return false;

  if (startDate) {
    const startTimestamp = new Date(`${startDate}T00:00:00.000Z`).getTime();
    if (timestamp < startTimestamp) return false;
  }
  if (endDate) {
    const endTimestamp = new Date(`${endDate}T23:59:59.999Z`).getTime();
    if (timestamp > endTimestamp) return false;
  }

  return true;
}

/**
 * Applies deterministic advanced search criteria against file records.
 */
export function applyFileSearchFilters<T extends SearchableFileRecord>(
  items: T[],
  request: NormalizedFileSearchRequest
): T[] {
  const { query, filters } = request;
  const normalizedQuery = query.toLowerCase();

  return items.filter((item) => {
    // Name query matching.
    if (normalizedQuery && !item.name.toLowerCase().includes(normalizedQuery)) {
      return false;
    }

    // Scope matching (files/folders/all).
    if (filters.itemScope === 'files' && item.is_folder) return false;
    if (filters.itemScope === 'folders' && !item.is_folder) return false;

    // Category matching for file records.
    if (filters.category !== 'all' && !item.is_folder) {
      if (resolveFileCategory(item.type, item.is_folder) !== filters.category) {
        return false;
      }
    }
    if (filters.category !== 'all' && item.is_folder) {
      return false;
    }

    // Metadata text search over JSON payloads.
    if (filters.metadataQuery) {
      const metadataBlob = JSON.stringify(item.metadata ?? '').toLowerCase();
      if (!metadataBlob.includes(filters.metadataQuery)) {
        return false;
      }
    }

    // Size boundaries are applied to files only.
    if (!item.is_folder) {
      if (filters.minSizeBytes !== null && item.size < filters.minSizeBytes) {
        return false;
      }
      if (filters.maxSizeBytes !== null && item.size > filters.maxSizeBytes) {
        return false;
      }
    }

    // Updated range fallback uses created_at when updated_at is unavailable.
    if (filters.updatedAfter || filters.updatedBefore) {
      const pivotDate = item.updated_at || item.created_at;
      if (!matchesDateRange(pivotDate, filters.updatedAfter, filters.updatedBefore)) {
        return false;
      }
    }

    return true;
  });
}
