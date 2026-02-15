import { DashboardShell } from '@/components/layout/DashboardShell';
import { StoragePolicyForm } from '@/app/components/settings/StoragePolicyForm';
import { StorageBucketManager } from '@/app/components/settings/StorageBucketManager';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings - AI Cloud Storage',
  description: 'Configure storage policies and bucket governance defaults.',
};

export default async function SettingsPage() {
  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure baseline storage governance controls and bucket posture for your account.
          </p>
        </div>
        <StoragePolicyForm userId={session.user.id} />
        <StorageBucketManager />
      </div>
    </DashboardShell>
  );
}
