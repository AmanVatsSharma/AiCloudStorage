'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { OrganizationDialog } from '@/app/components/organizations/OrganizationDialog';
import { OrganizationList } from '@/app/components/organizations/OrganizationList';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';

export default function OrganizationsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [traceId] = useState(() => `organizations-page_${Date.now()}`);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          logger.warn({
            traceId,
            scope: 'organizations-page',
            message: 'No authenticated user found for organizations page.',
            data: {
              error: error?.message,
            },
          });
          router.push('/login');
          return;
        }
        setUserId(user.id);
      } catch (error: unknown) {
        logger.error({
          traceId,
          scope: 'organizations-page',
          message: 'Failed to bootstrap organizations page.',
          data: {
            error: error instanceof Error ? error.message : error,
          },
        });
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, [router, supabase, traceId]);

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex h-full items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </DashboardShell>
    );
  }

  if (!userId) {
    return (
      <DashboardShell>
        <div className="flex h-full flex-col items-center justify-center">
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground mb-4">Please sign in to access organizations.</p>
          <Button onClick={() => router.push('/login')}>Sign In</Button>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
            <p className="text-muted-foreground mt-2">
              Manage enterprise tenancy boundaries and membership ownership model.
            </p>
          </div>
          <OrganizationDialog
            userId={userId}
            onSuccess={() => setRefreshKey((current) => current + 1)}
          />
        </div>

        <OrganizationList userId={userId} refreshKey={refreshKey} />
      </div>
    </DashboardShell>
  );
}
