import { toCsv } from '@/lib/export/csv';

describe('toCsv', () => {
  it('returns empty string for empty list', () => {
    expect(toCsv([])).toBe('');
  });

  it('serializes records with stable headers', () => {
    const csv = toCsv([
      { id: 1, action: 'team.create' },
      { id: 2, action: 'file.share.create' },
    ]);

    expect(csv).toContain('id,action');
    expect(csv).toContain('1,team.create');
    expect(csv).toContain('2,file.share.create');
  });

  it('escapes commas and quotes', () => {
    const csv = toCsv([
      { message: 'hello, "enterprise"' },
    ]);

    expect(csv).toContain('message');
    expect(csv).toContain('"hello, ""enterprise"""');
  });
});
