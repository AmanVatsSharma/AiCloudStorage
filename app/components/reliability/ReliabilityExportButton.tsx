'use client';

import { FiDownload } from 'react-icons/fi';

import { Button } from '@/components/ui/button';

interface ReliabilityExportButtonProps {
  report: Record<string, unknown>;
}

/**
 * Download reliability posture snapshot as JSON.
 */
export function ReliabilityExportButton({ report }: ReliabilityExportButtonProps) {
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reliability-report-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" className="gap-2" onClick={handleExport}>
      <FiDownload className="h-4 w-4" />
      Export reliability report
    </Button>
  );
}
