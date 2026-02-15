import { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { DashboardShell } from '@/components/layout/DashboardShell';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createServerClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { evaluateSlo, SloStatus, toPercent } from '@/lib/reliability/slo';
import { generateReliabilityAlerts, ReliabilityAlertSeverity } from '@/lib/reliability/alerts';
import { ReliabilityExportButton } from '@/app/components/reliability/ReliabilityExportButton';

export const metadata: Metadata = {
  title: 'Reliability - AI Cloud Storage',
  description: 'Operational reliability indicators and SLO health overview.',
};

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

function getStatusBadgeVariant(status: SloStatus) {
  switch (status) {
    case 'healthy':
      return 'secondary' as const;
    case 'warning':
    case 'breach':
      return 'destructive' as const;
    default:
      return 'outline' as const;
  }
}

function getStatusLabel(status: SloStatus) {
  if (status === 'no_data') return 'NO DATA';
  return status.toUpperCase();
}

function getAlertBadgeVariant(severity: ReliabilityAlertSeverity) {
  switch (severity) {
    case 'critical':
    case 'warning':
      return 'destructive' as const;
    case 'info':
    default:
      return 'outline' as const;
  }
}

export default async function ReliabilityPage() {
  const traceId = `reliability-page_${Date.now()}`;
  const supabase = await createServerClient();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    logger.warn({
      traceId,
      scope: 'reliability-page',
      message: 'Missing session while opening reliability page.',
      data: {
        error: sessionError?.message,
      },
    });
    redirect('/login');
  }

  const userId = session.user.id;
  const sevenDaysAgo = new Date(Date.now() - 7 * DAY_MS).toISOString();
  const oneDayAgo = new Date(Date.now() - DAY_MS).toISOString();
  const oneHourAgo = new Date(Date.now() - HOUR_MS).toISOString();

  const [totalEventsResult, failedEventsResult, failedLastHourResult, aiTotalResult, aiFailureResult] =
    await Promise.all([
      supabase
        .from('audit_events')
        .select('id', { count: 'exact', head: true })
        .eq('actor_id', userId)
        .gte('created_at', sevenDaysAgo),
      supabase
        .from('audit_events')
        .select('id', { count: 'exact', head: true })
        .eq('actor_id', userId)
        .eq('status', 'failure')
        .gte('created_at', sevenDaysAgo),
      supabase
        .from('audit_events')
        .select('id', { count: 'exact', head: true })
        .eq('actor_id', userId)
        .eq('status', 'failure')
        .gte('created_at', oneHourAgo),
      supabase
        .from('audit_events')
        .select('id', { count: 'exact', head: true })
        .eq('actor_id', userId)
        .eq('action', 'ai.summary.generate')
        .gte('created_at', oneDayAgo),
      supabase
        .from('audit_events')
        .select('id', { count: 'exact', head: true })
        .eq('actor_id', userId)
        .eq('action', 'ai.summary.generate')
        .eq('status', 'failure')
        .gte('created_at', oneDayAgo),
    ]);

  const queryErrors = [
    totalEventsResult.error,
    failedEventsResult.error,
    failedLastHourResult.error,
    aiTotalResult.error,
    aiFailureResult.error,
  ].filter(Boolean);

  if (queryErrors.length > 0) {
    logger.error({
      traceId,
      scope: 'reliability-page',
      message: 'Reliability queries partially failed.',
      data: {
        userId,
        errors: queryErrors.map((error) => error?.message),
      },
    });
  }

  const totalEventsLast7d = totalEventsResult.count ?? 0;
  const failedEventsLast7d = failedEventsResult.count ?? 0;
  const failedEventsLast1h = failedLastHourResult.count ?? 0;
  const aiTotalLast24h = aiTotalResult.count ?? 0;
  const aiFailureLast24h = aiFailureResult.count ?? 0;

  const platformSlo = evaluateSlo({
    name: 'Platform audit success (7d)',
    successCount: Math.max(0, totalEventsLast7d - failedEventsLast7d),
    totalCount: totalEventsLast7d,
    targetRate: 0.99,
    warningDelta: 0.01,
  });

  const aiSlo = evaluateSlo({
    name: 'AI summary success (24h)',
    successCount: Math.max(0, aiTotalLast24h - aiFailureLast24h),
    totalCount: aiTotalLast24h,
    targetRate: 0.95,
    warningDelta: 0.02,
  });

  const alerts = generateReliabilityAlerts({
    totalEventsLast7d,
    failedEventsLast7d,
    failedEventsLast1h,
    aiTotalLast24h,
    aiFailureLast24h,
  });

  const report = {
    generatedAt: new Date().toISOString(),
    actorId: userId,
    windows: {
      platform: '7d',
      ai: '24h',
    },
    counters: {
      totalEventsLast7d,
      failedEventsLast7d,
      failedEventsLast1h,
      aiTotalLast24h,
      aiFailureLast24h,
    },
    indicators: {
      platformSlo,
      aiSlo,
    },
    alerts,
  };

  logger.info({
    traceId,
    scope: 'reliability-page',
    message: 'Reliability indicators computed.',
    data: {
      platformStatus: platformSlo.status,
      aiStatus: aiSlo.status,
        alertCount: alerts.length,
    },
  });

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reliability</h1>
            <p className="text-muted-foreground mt-2">
              SLO posture for platform actions and AI summarization reliability.
            </p>
          </div>
          <ReliabilityExportButton report={report} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                Platform SLO
                <Badge variant={getStatusBadgeVariant(platformSlo.status)}>
                  {getStatusLabel(platformSlo.status)}
                </Badge>
              </CardTitle>
              <CardDescription>Target: {toPercent(platformSlo.targetRate)} success over 7 days</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-3xl font-semibold">{toPercent(platformSlo.successRate)}</p>
              <p className="text-sm text-muted-foreground">
                Success events: {platformSlo.successCount} / {platformSlo.totalCount}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                AI Summary SLO
                <Badge variant={getStatusBadgeVariant(aiSlo.status)}>
                  {getStatusLabel(aiSlo.status)}
                </Badge>
              </CardTitle>
              <CardDescription>Target: {toPercent(aiSlo.targetRate)} success over 24 hours</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-3xl font-semibold">{toPercent(aiSlo.successRate)}</p>
              <p className="text-sm text-muted-foreground">
                Success events: {aiSlo.successCount} / {aiSlo.totalCount}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Active Alerts</CardTitle>
            <CardDescription>
              Threshold-based alerts derived from audit event failure patterns.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.code} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-medium">{alert.title}</h3>
                    <Badge variant={getAlertBadgeVariant(alert.severity)}>
                      {alert.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{alert.description}</p>
                  <p className="text-sm mt-2">
                    <span className="font-medium">Recommended action:</span> {alert.recommendedAction}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
