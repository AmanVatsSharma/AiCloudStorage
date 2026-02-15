/**
 * Converts records into CSV format with deterministic escaping.
 */
export function toCsv(records: Array<Record<string, unknown>>): string {
  if (records.length === 0) {
    return '';
  }

  const headers = Array.from(
    records.reduce<Set<string>>((acc, record) => {
      Object.keys(record).forEach((key) => acc.add(key));
      return acc;
    }, new Set<string>())
  );

  const escapeCell = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const raw = typeof value === 'string' ? value : JSON.stringify(value);
    const normalized = raw.replace(/"/g, '""');
    return /[",\n]/.test(normalized) ? `"${normalized}"` : normalized;
  };

  const lines = [
    headers.join(','),
    ...records.map((record) => headers.map((header) => escapeCell(record[header])).join(',')),
  ];

  return lines.join('\n');
}
