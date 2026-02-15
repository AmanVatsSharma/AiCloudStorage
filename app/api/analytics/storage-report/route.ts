import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { createServerClient } from '@/lib/supabase/server';
import { publicEnv } from '@/lib/env';
import { logger } from '@/lib/logger';
import { Database } from '@/lib/types/supabase';
import { buildStorageAnalyticsReport, RawFileMetricRecord } from '@/lib/analytics/storage-metrics';

function readBearerToken(request: NextRequest): string | null {
  const rawHeader = request.headers.get('authorization');
  if (!rawHeader) return null;
  const [scheme, token] = rawHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
}

async function buildStorageReport(client: SupabaseClient<Database>, userId: string) {
  const [filesResult, totalSharesResult, publicSharesResult] = await Promise.all([
    client
      .from('files')
      .select('type, size, is_folder, is_trashed, created_at')
      .eq('user_id', userId),
    client
      .from('shared_files')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId),
    client
      .from('shared_files')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .eq('is_public', true),
  ]);

  const queryErrors = [filesResult.error, totalSharesResult.error, publicSharesResult.error].filter(Boolean);
  if (queryErrors.length > 0) {
    throw new Error(queryErrors.map((error) => error?.message).join(' | '));
  }

  const report = buildStorageAnalyticsReport({
    files: (filesResult.data as RawFileMetricRecord[] | null) || [],
    totalShares: totalSharesResult.count ?? 0,
    publicShares: publicSharesResult.count ?? 0,
  });

  return report;
}

/**
 * Storage analytics API.
 *
 * Session mode: authenticated user (no query required).
 * Integration mode: bearer token + service role key, requires actorId query param.
 */
export async function GET(request: NextRequest) {
  const traceId = `analytics-storage-api_${Date.now()}`;
  const integrationToken = process.env.ANALYTICS_REPORTS_API_TOKEN;
  const bearerToken = readBearerToken(request);
  const isIntegrationMode = Boolean(integrationToken && bearerToken === integrationToken);
  const actorId = new URL(request.url).searchParams.get('actorId');

  try {
    let client: SupabaseClient<Database>;
    let targetUserId: string;
    let mode: 'session' | 'integration' = 'session';

    if (isIntegrationMode) {
      mode = 'integration';
      if (!actorId) {
        return NextResponse.json(
          { error: 'actorId query param is required in integration mode.' },
          { status: 400 }
        );
      }

      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!serviceRoleKey || publicEnv.supabaseUrl.includes('placeholder')) {
        return NextResponse.json(
          { error: 'Storage analytics integration mode is not configured.' },
          { status: 503 }
        );
      }

      client = createClient<Database>(publicEnv.supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
      targetUserId = actorId;
    } else {
      const sessionClient = await createServerClient();
      const {
        data: { session },
        error: sessionError,
      } = await sessionClient.auth.getSession();

      if (sessionError || !session) {
        logger.warn({
          traceId,
          scope: 'analytics-storage-api',
          message: 'Session analytics request rejected due to missing auth.',
          data: {
            error: sessionError?.message,
          },
        });
        return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
      }

      client = sessionClient;
      targetUserId = session.user.id;
    }

    const report = await buildStorageReport(client, targetUserId);

    logger.info({
      traceId,
      scope: 'analytics-storage-api',
      message: 'Storage analytics report generated.',
      data: {
        mode,
        targetUserId,
        totalItems: report.totalItems,
      },
    });

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      mode,
      actorId: targetUserId,
      report,
    });
  } catch (error: unknown) {
    logger.error({
      traceId,
      scope: 'analytics-storage-api',
      message: 'Failed to generate storage analytics report.',
      data: {
        actorId,
        error: error instanceof Error ? error.message : error,
      },
    });

    return NextResponse.json(
      { error: 'Unable to generate storage analytics report.' },
      { status: 500 }
    );
  }
}
