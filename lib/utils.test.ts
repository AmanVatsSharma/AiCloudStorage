import { cn, isValidUUID } from '@/lib/utils';

describe('lib/utils', () => {
  it('validates UUID values correctly', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isValidUUID('not-a-uuid')).toBe(false);
    expect(isValidUUID(null)).toBe(false);
    expect(isValidUUID(undefined)).toBe(false);
  });

  it('merges class names consistently', () => {
    const merged = cn('px-2 py-2', 'px-4', false && 'hidden', 'font-bold');
    expect(merged).toContain('px-4');
    expect(merged).not.toContain('px-2');
    expect(merged).toContain('py-2');
    expect(merged).toContain('font-bold');
  });
});
