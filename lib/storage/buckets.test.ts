import {
  normalizeBucketName,
  parseMimeTypeList,
  validateBucketName,
} from '@/lib/storage/buckets';

describe('storage bucket helpers', () => {
  it('normalizes bucket names', () => {
    expect(normalizeBucketName('  Demo Bucket  ')).toBe('demo-bucket');
  });

  it('validates acceptable bucket names', () => {
    const result = validateBucketName('my_bucket-123');
    expect(result.valid).toBe(true);
    expect(result.normalizedName).toBe('my_bucket-123');
  });

  it('rejects invalid bucket names with reason', () => {
    const result = validateBucketName('INVALID NAME!');
    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it('parses and deduplicates mime list', () => {
    expect(parseMimeTypeList('image/png, image/jpeg, image/png')).toEqual([
      'image/png',
      'image/jpeg',
    ]);
  });
});
