export interface RawFileMetricRecord {
  type: string;
  size: number;
  is_folder: boolean;
  is_trashed: boolean;
  created_at: string;
}

export interface UploadDayMetric {
  day: string;
  uploads: number;
  bytes: number;
}

export interface FileTypeMetric {
  label: string;
  count: number;
  bytes: number;
}

export interface StorageAnalyticsReport {
  totalItems: number;
  totalFiles: number;
  totalFolders: number;
  trashedItems: number;
  activeStorageBytes: number;
  trashedStorageBytes: number;
  totalShares: number;
  publicShares: number;
  topFileTypes: FileTypeMetric[];
  uploadsLast30Days: UploadDayMetric[];
}

function normalizeFileType(rawType: string): string {
  if (!rawType) return 'unknown';
  if (rawType === 'folder') return 'folder';
  if (rawType.includes('/')) {
    return rawType.split('/')[0];
  }
  return rawType;
}

/**
 * Deterministically computes analytics metrics from file/share records.
 */
export function buildStorageAnalyticsReport(input: {
  files: RawFileMetricRecord[];
  totalShares: number;
  publicShares: number;
  now?: Date;
}): StorageAnalyticsReport {
  const files = input.files || [];
  const now = input.now ?? new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const typeBuckets = new Map<string, FileTypeMetric>();
  const uploadBuckets = new Map<string, UploadDayMetric>();

  let totalFiles = 0;
  let totalFolders = 0;
  let trashedItems = 0;
  let activeStorageBytes = 0;
  let trashedStorageBytes = 0;

  for (const file of files) {
    const size = Math.max(0, file.size || 0);
    const createdAt = new Date(file.created_at);
    const isRecent = createdAt >= thirtyDaysAgo;

    if (file.is_trashed) {
      trashedItems += 1;
      if (!file.is_folder) {
        trashedStorageBytes += size;
      }
      continue;
    }

    if (file.is_folder) {
      totalFolders += 1;
      continue;
    }

    totalFiles += 1;
    activeStorageBytes += size;

    const typeLabel = normalizeFileType(file.type);
    const typeMetric = typeBuckets.get(typeLabel) ?? {
      label: typeLabel,
      count: 0,
      bytes: 0,
    };
    typeMetric.count += 1;
    typeMetric.bytes += size;
    typeBuckets.set(typeLabel, typeMetric);

    if (isRecent) {
      const day = createdAt.toISOString().slice(0, 10);
      const dayMetric = uploadBuckets.get(day) ?? {
        day,
        uploads: 0,
        bytes: 0,
      };
      dayMetric.uploads += 1;
      dayMetric.bytes += size;
      uploadBuckets.set(day, dayMetric);
    }
  }

  const topFileTypes = Array.from(typeBuckets.values())
    .sort((a, b) => b.count - a.count || b.bytes - a.bytes || a.label.localeCompare(b.label))
    .slice(0, 6);

  const uploadsLast30Days = Array.from(uploadBuckets.values()).sort((a, b) =>
    a.day.localeCompare(b.day)
  );

  return {
    totalItems: totalFiles + totalFolders + trashedItems,
    totalFiles,
    totalFolders,
    trashedItems,
    activeStorageBytes,
    trashedStorageBytes,
    totalShares: Math.max(0, input.totalShares || 0),
    publicShares: Math.max(0, input.publicShares || 0),
    topFileTypes,
    uploadsLast30Days,
  };
}

export function formatBytesCompact(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}
