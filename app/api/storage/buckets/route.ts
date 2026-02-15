import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { createServerClient } from '@/lib/supabase/server';
import { publicEnv } from '@/lib/env';
import { logger } from '@/lib/logger';
import { validateBucketName } from '@/lib/storage/buckets';

function buildStorageAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey || !publicEnv.supabaseUrl || publicEnv.supabaseUrl.includes('placeholder')) {
    return null;
  }

  return createClient(publicEnv.supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function requireSession(traceId: string) {
  const sessionClient = await createServerClient();
  const {
    data: { session },
    error,
  } = await sessionClient.auth.getSession();

  if (error || !session) {
    logger.warn({
      traceId,
      scope: 'storage-buckets-api',
      message: 'Unauthorized storage bucket API request.',
      data: {
        error: error?.message,
      },
    });
    return null;
  }

  return session;
}

/**
 * List storage buckets for settings UI.
 */
export async function GET() {
  const traceId = `storage-buckets-get_${Date.now()}`;

  try {
    const session = await requireSession(traceId);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const storageAdmin = buildStorageAdminClient();
    if (!storageAdmin) {
      return NextResponse.json(
        { error: 'Storage admin integration is not configured.' },
        { status: 503 }
      );
    }

    const { data, error } = await storageAdmin.storage.listBuckets();
    if (error) {
      throw error;
    }

    const buckets = (data || []).map((bucket) => ({
      id: bucket.id,
      name: bucket.name,
      public: bucket.public,
      fileSizeLimit: bucket.file_size_limit,
      allowedMimeTypes: bucket.allowed_mime_types || [],
      createdAt: bucket.created_at,
      updatedAt: bucket.updated_at,
    }));

    logger.info({
      traceId,
      scope: 'storage-buckets-api',
      message: 'Storage buckets listed successfully.',
      data: {
        actorId: session.user.id,
        count: buckets.length,
      },
    });

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      buckets,
    });
  } catch (error: unknown) {
    logger.error({
      traceId,
      scope: 'storage-buckets-api',
      message: 'Failed to list storage buckets.',
      data: {
        error: error instanceof Error ? error.message : error,
      },
    });
    return NextResponse.json({ error: 'Unable to list storage buckets.' }, { status: 500 });
  }
}

/**
 * Create bucket via settings UI (service-role path).
 */
export async function POST(request: NextRequest) {
  const traceId = `storage-buckets-post_${Date.now()}`;

  try {
    const session = await requireSession(traceId);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const storageAdmin = buildStorageAdminClient();
    if (!storageAdmin) {
      return NextResponse.json(
        { error: 'Storage admin integration is not configured.' },
        { status: 503 }
      );
    }

    const payload = (await request.json()) as {
      name?: string;
      public?: boolean;
      fileSizeLimit?: number | null;
      allowedMimeTypes?: string[];
    };

    const validation = validateBucketName(payload.name || '');
    if (!validation.valid) {
      return NextResponse.json({ error: validation.reason }, { status: 400 });
    }

    const { data, error } = await storageAdmin.storage.createBucket(validation.normalizedName, {
      public: payload.public ?? false,
      fileSizeLimit: payload.fileSizeLimit ?? null,
      allowedMimeTypes: payload.allowedMimeTypes ?? [],
    });

    if (error) {
      throw error;
    }

    logger.info({
      traceId,
      scope: 'storage-buckets-api',
      message: 'Storage bucket created.',
      data: {
        actorId: session.user.id,
        bucketName: validation.normalizedName,
      },
    });

    return NextResponse.json({
      createdAt: new Date().toISOString(),
      bucket: data,
    });
  } catch (error: unknown) {
    logger.error({
      traceId,
      scope: 'storage-buckets-api',
      message: 'Failed to create storage bucket.',
      data: {
        error: error instanceof Error ? error.message : error,
      },
    });
    return NextResponse.json({ error: 'Unable to create storage bucket.' }, { status: 500 });
  }
}
