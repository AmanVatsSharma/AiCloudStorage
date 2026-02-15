import { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { DashboardShell } from '@/components/layout/DashboardShell';
import { StorageAnalyticsOverview } from '@/app/components/analytics/StorageAnalyticsOverview';
import { createServerClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { buildStorageAnalyticsReport, RawFileMetricRecord } from '@/lib/analytics/storage-metrics';

export const metadata: Metadata = {
  title: 'Analytics - AI Cloud Storage',
  description: 'Storage usage patterns, file type trends, and sharing posture analytics.',
};

export default async function AnalyticsPage() {
  const traceId = `analytics-page_${Date.now()}`;
  const generatedAt = new Date().toISOString();
  const supabase = await createServerClient();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    logger.warn({
      traceId,
      scope: 'analytics-page',
      message: 'Missing session while opening analytics page.',
      data: {
        error: sessionError?.message,
      },
    });
    redirect('/login');
  }

  const userId = session.user.id;

  const [filesResult, totalSharesResult, publicSharesResult] = await Promise.all([
    supabase
      .from('files')
      .select('type, size, is_folder, is_trashed, created_at')
      .eq('user_id', userId),
    supabase
      .from('shared_files')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId),
    supabase
      .from('shared_files')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .eq('is_public', true),
  ]);

  const queryErrors = [filesResult.error, totalSharesResult.error, publicSharesResult.error].filter(Boolean);
  if (queryErrors.length > 0) {
    logger.error({
      traceId,
      scope: 'analytics-page',
      message: 'One or more analytics queries failed; fallback values will be used.',
      data: {
        userId,
        errors: queryErrors.map((error) => error?.message),
      },
    });
  }

  const report = buildStorageAnalyticsReport({
    files: (filesResult.data as RawFileMetricRecord[] | null) || [],
    totalShares: totalSharesResult.count ?? 0,
    publicShares: publicSharesResult.count ?? 0,
  });

  logger.info({
    traceId,
    scope: 'analytics-page',
    message: 'Analytics report generated.',
    data: {
      userId,
      totalItems: report.totalItems,
      topFileTypes: report.topFileTypes.map((item) => `${item.label}:${item.count}`),
    },
  });

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Storage Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Track file inventory, storage growth trends, and sharing exposure from your current account data.
          </p>
        </div>
        <StorageAnalyticsOverview report={report} generatedAt={generatedAt} />
      </div>
    </DashboardShell>
  );
}
