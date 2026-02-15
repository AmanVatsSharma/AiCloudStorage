import { DashboardShell } from '@/components/layout/DashboardShell';
import { AuditEventsTable } from '@/app/components/audit/AuditEventsTable';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Audit Logs - AI Cloud Storage',
  description: 'Review security and activity events for enterprise governance.',
};

export default function AuditPage() {
  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground mt-2">
            Track security-sensitive actions and operational events across your workspace.
          </p>
        </div>
        <AuditEventsTable />
      </div>
    </DashboardShell>
  );
}
