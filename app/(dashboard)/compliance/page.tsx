import { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { DashboardShell } from '@/components/layout/DashboardShell';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createServerClient } from '@/lib/supabase/server';
import { calculateComplianceScore } from '@/lib/compliance/score';
import { logger } from '@/lib/logger';
import { ComplianceExportButton } from '@/app/components/compliance/ComplianceExportButton';

export const metadata: Metadata = {
  title: 'Compliance - AI Cloud Storage',
  description: 'Enterprise compliance posture and governance snapshot.',
};

const DAYS_IN_WEEK = 7;
const MS_IN_DAY = 24 * 60 * 60 * 1000;

function getGradeVariant(grade: 'excellent' | 'good' | 'needs_attention' | 'critical') {
  switch (grade) {
    case 'excellent':
      return 'default' as const;
    case 'good':
      return 'secondary' as const;
    case 'needs_attention':
    case 'critical':
      return 'destructive' as const;
    default:
      return 'outline' as const;
  }
}

export default async function CompliancePage() {
  const traceId = `compliance-page_${Date.now()}`;
  const supabase = await createServerClient();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    logger.warn({
      traceId,
      scope: 'compliance-page',
      message: 'Missing session while loading compliance page.',
      data: {
        error: sessionError?.message,
      },
    });
    redirect('/login');
  }

  const userId = session.user.id;
  const weekAgoIso = new Date(Date.now() - DAYS_IN_WEEK * MS_IN_DAY).toISOString();

  const [policyResult, failedAuditResult, invitationResult, publicLinkResult] = await Promise.all([
    supabase
      .from('storage_policies')
      .select('retention_days, permanent_delete_enabled')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('audit_events')
      .select('id', { count: 'exact', head: true })
      .eq('actor_id', userId)
      .eq('status', 'failure')
      .gte('created_at', weekAgoIso),
    supabase
      .from('organization_invitations')
      .select('id', { count: 'exact', head: true })
      .eq('invited_by', userId)
      .eq('status', 'pending'),
    supabase
      .from('shared_files')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .eq('is_public', true),
  ]);

  const queryErrors = [
    policyResult.error,
    failedAuditResult.error,
    invitationResult.error,
    publicLinkResult.error,
  ].filter(Boolean);

  if (queryErrors.length > 0) {
    logger.error({
      traceId,
      scope: 'compliance-page',
      message: 'One or more compliance signal queries failed.',
      data: {
        errors: queryErrors.map((error) => error?.message),
      },
    });
  }

  const retentionDays = policyResult.data?.retention_days ?? 0;
  const permanentDeleteEnabled = policyResult.data?.permanent_delete_enabled ?? false;
  const failedAuditEventsLast7d = failedAuditResult.count ?? 0;
  const pendingInvitations = invitationResult.count ?? 0;
  const publicShareLinks = publicLinkResult.count ?? 0;

  const scoreResult = calculateComplianceScore({
    hasStoragePolicy: Boolean(policyResult.data),
    retentionDays,
    failedAuditEventsLast7d,
    pendingInvitations,
    publicShareLinks,
  });

  const report = {
    generatedAt: new Date().toISOString(),
    actorId: userId,
    controls: {
      hasStoragePolicy: Boolean(policyResult.data),
      retentionDays,
      permanentDeleteEnabled,
      failedAuditEventsLast7d,
      pendingInvitations,
      publicShareLinks,
    },
    score: scoreResult,
  };

  logger.info({
    traceId,
    scope: 'compliance-page',
    message: 'Compliance report computed.',
    data: {
      score: scoreResult.score,
      grade: scoreResult.grade,
    },
  });

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Compliance</h1>
            <p className="text-muted-foreground mt-2">
              Snapshot of governance controls, exposure risks, and audit hygiene.
            </p>
          </div>
          <ComplianceExportButton report={report} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              Compliance Score
              <Badge variant={getGradeVariant(scoreResult.grade)}>
                {scoreResult.grade.replace('_', ' ').toUpperCase()}
              </Badge>
            </CardTitle>
            <CardDescription>
              Heuristic score computed from storage policy, audit failures, invitations, and public links.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{scoreResult.score}/100</div>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {scoreResult.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Retention Policy</CardTitle>
              <CardDescription>Storage retention baseline</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{retentionDays || 0} days</p>
              <p className="text-xs text-muted-foreground">
                Permanent delete: {permanentDeleteEnabled ? 'Enabled' : 'Disabled'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Audit Failures (7d)</CardTitle>
              <CardDescription>Events with status=failure</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{failedAuditEventsLast7d}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pending Invitations</CardTitle>
              <CardDescription>Open organization invites</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{pendingInvitations}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Public Share Links</CardTitle>
              <CardDescription>Links with public access</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{publicShareLinks}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
