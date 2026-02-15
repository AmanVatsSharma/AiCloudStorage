import {
  buildVersionObjectPath,
  getNextVersionNumber,
  sanitizeVersionFileName,
} from '@/lib/files/versioning';

describe('versioning path utilities', () => {
  it('sanitizes path separators in file names', () => {
    expect(sanitizeVersionFileName('reports/2026\\q1.pdf')).toBe('reports_2026_q1.pdf');
  });

  it('builds deterministic version object paths', () => {
    expect(buildVersionObjectPath('file-1', 3, 'report.pdf')).toBe('versions/file-1/3/report.pdf');
  });

  it('starts from version 1 when latest missing', () => {
    expect(getNextVersionNumber()).toBe(1);
    expect(getNextVersionNumber(null)).toBe(1);
    expect(getNextVersionNumber(0)).toBe(1);
  });

  it('increments existing latest version', () => {
    expect(getNextVersionNumber(4)).toBe(5);
  });
});
