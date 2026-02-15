import { buildStorageAnalyticsReport, formatBytesCompact } from '@/lib/analytics/storage-metrics';

describe('buildStorageAnalyticsReport', () => {
  const now = new Date('2026-02-15T12:00:00.000Z');

  it('computes storage and item metrics from file records', () => {
    const report = buildStorageAnalyticsReport({
      now,
      totalShares: 5,
      publicShares: 2,
      files: [
        {
          type: 'image/png',
          size: 1000,
          is_folder: false,
          is_trashed: false,
          created_at: '2026-02-14T10:00:00.000Z',
        },
        {
          type: 'application/pdf',
          size: 2000,
          is_folder: false,
          is_trashed: false,
          created_at: '2026-02-10T10:00:00.000Z',
        },
        {
          type: 'folder',
          size: 0,
          is_folder: true,
          is_trashed: false,
          created_at: '2026-02-01T10:00:00.000Z',
        },
        {
          type: 'image/jpeg',
          size: 500,
          is_folder: false,
          is_trashed: true,
          created_at: '2026-02-11T10:00:00.000Z',
        },
      ],
    });

    expect(report.totalFiles).toBe(2);
    expect(report.totalFolders).toBe(1);
    expect(report.trashedItems).toBe(1);
    expect(report.activeStorageBytes).toBe(3000);
    expect(report.trashedStorageBytes).toBe(500);
    expect(report.totalShares).toBe(5);
    expect(report.publicShares).toBe(2);
    expect(report.topFileTypes[0].label).toBe('application');
  });

  it('returns deterministic zero-state when no records', () => {
    const report = buildStorageAnalyticsReport({
      now,
      files: [],
      totalShares: 0,
      publicShares: 0,
    });

    expect(report.totalItems).toBe(0);
    expect(report.topFileTypes).toHaveLength(0);
    expect(report.uploadsLast30Days).toHaveLength(0);
  });
});

describe('formatBytesCompact', () => {
  it('formats bytes in compact units', () => {
    expect(formatBytesCompact(0)).toBe('0 B');
    expect(formatBytesCompact(1024)).toBe('1.0 KB');
    expect(formatBytesCompact(1024 * 1024)).toBe('1.0 MB');
  });
});
