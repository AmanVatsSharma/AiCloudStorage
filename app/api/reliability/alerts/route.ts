import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { createServerClient } from '@/lib/supabase/server';
import { publicEnv } from '@/lib/env';
import { logger } from '@/lib/logger';
import { Database } from '@/lib/types/supabase';
import { buildReliabilityReport } from '@/lib/reliability/report';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

function extractBearerToken(request: NextRequest): string | null {
  const rawHeader = request.headers.get('authorization');
  if (!rawHeader) return null;
  const [scheme, value] = rawHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !value) return null;
  return value.trim();
}

async function countAuditEvents(options: {
  client: SupabaseClient<Database>;
  sinceIso: string;
  actorId?: string | null;
  status?: string;
  action?: string;
}): Promise<number> {
  let query = options.client
    .from('audit_events')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', options.sinceIso);

  if (options.actorId) {
    query = query.eq('actor_id', options.actorId);
  }
  if (options.status) {
    query = query.eq('status', options.status);
  }
  if (options.action) {
    query = query.eq('action', options.action);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

/**
 * Reliability alerts API.
 *
 * Auth modes:
 * - Session mode: signed-in user gets user-scoped reliability report.
 * - Integration mode: Bearer RELIABILITY_ALERTS_API_TOKEN + service role key enables
 *   user-scoped or global aggregated report for external monitoring integrations.
 */
export async function GET(request: NextRequest) {
  const traceId = `reliability-alerts-api_${Date.now()}`;
  const requestUrl = new URL(request.url);
  const scope = requestUrl.searchParams.get('scope') === 'global' ? 'global' : 'user';
  const actorIdParam = requestUrl.searchParams.get('actorId');
  const bearerToken = extractBearerToken(request);
  const integrationToken = process.env.RELIABILITY_ALERTS_API_TOKEN;
  const isIntegrationRequest = Boolean(integrationToken && bearerToken === integrationToken);

  const sevenDaysAgo = new Date(Date.now() - 7 * DAY_MS).toISOString();
  const oneDayAgo = new Date(Date.now() - DAY_MS).toISOString();
  const oneHourAgo = new Date(Date.now() - HOUR_MS).toISOString();

  try {
    let supabase: SupabaseClient<Database>;
    let actorId: string | null = null;
    let authorizationMode: 'session' | 'integration' = 'session';
    let reportScope: 'user' | 'global' = 'user';

    if (isIntegrationRequest) {
      authorizationMode = 'integration';
      reportScope = scope;
      actorId = scope === 'user' ? actorIdParam : null;

      if (scope === 'user' && !actorId) {
        return NextResponse.json(
          { error: 'actorId is required when scope=user for integration requests.' },
          { status: 400 }
        );
      }

      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!serviceRoleKey || !publicEnv.supabaseUrl || publicEnv.supabaseUrl.includes('placeholder')) {
        logger.error({
          traceId,
          scope: 'reliability-alerts-api',
          message: 'Integration token used but service-role configuration is missing.',
          data: {
            hasServiceRoleKey: Boolean(serviceRoleKey),
            supabaseUrlConfigured: Boolean(publicEnv.supabaseUrl),
          },
        });

        return NextResponse.json(
          { error: 'Server reliability integration is not configured.' },
          { status: 503 }
        );
      }

      supabase = createClient<Database>(publicEnv.supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    } else {
      const sessionClient = await createServerClient();
      const {
        data: { session },
        error: sessionError,
      } = await sessionClient.auth.getSession();

      if (sessionError || !session) {
        logger.warn({
          traceId,
          scope: 'reliability-alerts-api',
          message: 'Session-based reliability request without authentication.',
          data: {
            error: sessionError?.message,
          },
        });
        return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
      }

      supabase = sessionClient;
      actorId = session.user.id;
      reportScope = 'user';
    }

    const [totalEventsLast7d, failedEventsLast7d, failedEventsLast1h, aiTotalLast24h, aiFailureLast24h] =
      await Promise.all([
        countAuditEvents({ client: supabase, actorId, sinceIso: sevenDaysAgo }),
        countAuditEvents({ client: supabase, actorId, sinceIso: sevenDaysAgo, status: 'failure' }),
        countAuditEvents({ client: supabase, actorId, sinceIso: oneHourAgo, status: 'failure' }),
        countAuditEvents({
          client: supabase,
          actorId,
          sinceIso: oneDayAgo,
          action: 'ai.summary.generate',
        }),
        countAuditEvents({
          client: supabase,
          actorId,
          sinceIso: oneDayAgo,
          action: 'ai.summary.generate',
          status: 'failure',
        }),
      ]);

    const reportBody = buildReliabilityReport({
      totalEventsLast7d,
      failedEventsLast7d,
      failedEventsLast1h,
      aiTotalLast24h,
      aiFailureLast24h,
    });

    logger.info({
      traceId,
      scope: 'reliability-alerts-api',
      message: 'Reliability alerts report generated.',
      data: {
        authorizationMode,
        reportScope,
        actorId,
        alertCount: reportBody.alerts.length,
      },
    });

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      authorizationMode,
      scope: reportScope,
      actorId,
      ...reportBody,
    });
  } catch (error: unknown) {
    logger.error({
      traceId,
      scope: 'reliability-alerts-api',
      message: 'Failed to build reliability alerts report.',
      data: {
        scope,
        actorIdParam,
        error: error instanceof Error ? error.message : error,
      },
    });

    return NextResponse.json(
      { error: 'Unable to build reliability alerts report.' },
      { status: 500 }
    );
  }
}
