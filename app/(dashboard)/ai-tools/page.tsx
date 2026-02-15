import { DashboardShell } from '@/components/layout/DashboardShell';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { SummaryWorkbench } from '@/app/components/ai/SummaryWorkbench';

export const metadata: Metadata = {
  title: 'AI Tools - AI Cloud Storage',
  description: 'Use enterprise AI utilities for storage content workflows.',
};

export default async function AIToolsPage() {
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
          <h1 className="text-3xl font-bold tracking-tight">AI Tools</h1>
          <p className="text-muted-foreground mt-2">
            Productivity-focused AI utilities with enterprise-friendly observability and fallback behavior.
          </p>
        </div>
        <SummaryWorkbench userId={session.user.id} />
      </div>
    </DashboardShell>
  );
}
