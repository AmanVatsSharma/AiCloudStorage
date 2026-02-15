import { DashboardShell } from '@/components/layout/DashboardShell';
import { TrashManager } from '@/app/components/files/TrashManager';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trash - AI Cloud Storage',
  description: 'Restore or permanently delete trashed files.',
};

export default function TrashPage() {
  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trash</h1>
          <p className="text-muted-foreground mt-2">
            Restore deleted files or permanently remove them from storage.
          </p>
        </div>
        <TrashManager />
      </div>
    </DashboardShell>
  );
}
