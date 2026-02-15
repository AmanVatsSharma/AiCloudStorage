import { NextResponse } from 'next/server';

import { publicEnv } from '@/lib/env';
import { evaluateReadiness } from '@/lib/health/readiness';
import { logger } from '@/lib/logger';

/**
 * Lightweight health/readiness endpoint for uptime probes and deployment checks.
 */
export async function GET() {
  const traceId = `health-api_${Date.now()}`;

  try {
    const readiness = evaluateReadiness({
      supabaseUrl: publicEnv.supabaseUrl,
      supabaseAnonKey: publicEnv.supabaseAnonKey,
      openAiKeyConfigured: Boolean(process.env.OPENAI_API_KEY),
    });

    logger.info({
      traceId,
      scope: 'health-api',
      message: 'Health check evaluated.',
      data: {
        status: readiness.status,
        warnings: readiness.checks.filter((check) => check.status === 'warn').length,
      },
    });

    return NextResponse.json(
      {
        status: readiness.status,
        timestamp: new Date().toISOString(),
        checks: readiness.checks,
      },
      {
        status: readiness.status === 'ok' ? 200 : 503,
      }
    );
  } catch (error: unknown) {
    logger.error({
      traceId,
      scope: 'health-api',
      message: 'Health check failed unexpectedly.',
      data: {
        error: error instanceof Error ? error.message : error,
      },
    });

    return NextResponse.json(
      {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        checks: [
          {
            name: 'health_runtime',
            status: 'warn',
            message: 'Health check crashed while evaluating runtime state.',
          },
        ],
      },
      { status: 503 }
    );
  }
}
