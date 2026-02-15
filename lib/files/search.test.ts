import {
  applyFileSearchFilters,
  getActiveFilterCount,
  hasActiveSearchCriteria,
  normalizeFileSearchRequest,
  resolveFileCategory,
} from '@/lib/files/search';

const records = [
  {
    id: '1',
    name: 'Quarterly Report.pdf',
    type: 'application/pdf',
    size: 5 * 1024 * 1024,
    is_folder: false,
    created_at: '2026-02-01T12:00:00.000Z',
    updated_at: '2026-02-10T12:00:00.000Z',
    metadata: { owner: 'finance', classification: 'confidential' },
  },
  {
    id: '2',
    name: 'Product Screenshot.png',
    type: 'image/png',
    size: 1024 * 1024,
    is_folder: false,
    created_at: '2026-02-04T12:00:00.000Z',
    updated_at: '2026-02-04T12:00:00.000Z',
    metadata: { owner: 'design', campaign: 'launch' },
  },
  {
    id: '3',
    name: 'Invoices',
    type: 'folder',
    size: 0,
    is_folder: true,
    created_at: '2026-01-20T12:00:00.000Z',
    updated_at: '2026-02-12T12:00:00.000Z',
    metadata: null,
  },
];

describe('normalizeFileSearchRequest', () => {
  it('normalizes values and swaps invalid size bounds', () => {
    const request = normalizeFileSearchRequest({
      query: '  report  ',
      filters: {
        minSizeMb: '10',
        maxSizeMb: '2',
        metadataQuery: ' Finance ',
      },
    });

    expect(request.query).toBe('report');
    expect(request.filters.minSizeBytes).toBe(2 * 1024 * 1024);
    expect(request.filters.maxSizeBytes).toBe(10 * 1024 * 1024);
    expect(request.filters.metadataQuery).toBe('finance');
  });
});

describe('search criteria helpers', () => {
  it('identifies active search criteria and counts filters', () => {
    const request = normalizeFileSearchRequest({
      query: '',
      filters: {
        itemScope: 'files',
        updatedAfter: '2026-02-01',
      },
    });

    expect(hasActiveSearchCriteria(request)).toBe(true);
    expect(getActiveFilterCount(request.filters)).toBe(2);
  });

  it('returns inactive criteria for empty request', () => {
    const request = normalizeFileSearchRequest({ query: '' });
    expect(hasActiveSearchCriteria(request)).toBe(false);
    expect(getActiveFilterCount(request.filters)).toBe(0);
  });
});

describe('resolveFileCategory', () => {
  it('maps known mime families to deterministic categories', () => {
    expect(resolveFileCategory('image/jpeg', false)).toBe('image');
    expect(resolveFileCategory('application/pdf', false)).toBe('document');
    expect(resolveFileCategory('application/zip', false)).toBe('archive');
    expect(resolveFileCategory('application/octet-stream', false)).toBe('other');
  });
});

describe('applyFileSearchFilters', () => {
  it('filters by query and metadata text', () => {
    const request = normalizeFileSearchRequest({
      query: 'report',
      filters: { metadataQuery: 'confidential' },
    });
    const result = applyFileSearchFilters(records, request);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by scope, category, size, and date ranges', () => {
    const request = normalizeFileSearchRequest({
      query: '',
      filters: {
        itemScope: 'files',
        category: 'image',
        minSizeMb: '0.5',
        maxSizeMb: '2',
        updatedAfter: '2026-02-03',
        updatedBefore: '2026-02-06',
      },
    });

    const result = applyFileSearchFilters(records, request);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('filters out folders when category filter is selected', () => {
    const request = normalizeFileSearchRequest({
      query: '',
      filters: { category: 'document' },
    });

    const result = applyFileSearchFilters(records, request);
    expect(result.every((item) => !item.is_folder)).toBe(true);
  });
});
