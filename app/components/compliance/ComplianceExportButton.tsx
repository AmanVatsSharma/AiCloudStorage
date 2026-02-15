'use client';

import { FiDownload } from 'react-icons/fi';

import { Button } from '@/components/ui/button';

interface ComplianceExportButtonProps {
  report: Record<string, unknown>;
}

export function ComplianceExportButton({ report }: ComplianceExportButtonProps) {
  const handleExport = () => {
    const payload = JSON.stringify(report, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `compliance-report-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button onClick={handleExport} className="gap-2" variant="outline">
      <FiDownload className="h-4 w-4" />
      Export report
    </Button>
  );
}
