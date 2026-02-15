'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/lib/logger';
import { useToast } from '@/components/ui/use-toast';
import { getUserErrorMessage } from '@/lib/errors';
import { FiBriefcase } from 'react-icons/fi';
import { OrganizationInviteDialog } from '@/app/components/organizations/OrganizationInviteDialog';
import {
  canInviteOrganizationMembers,
  OrganizationRole,
} from '@/lib/authorization/organization-permissions';

type OrganizationMembership = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  role: OrganizationRole;
  created_at: string;
};

interface OrganizationListProps {
  userId: string;
  refreshKey: number;
}

/**
 * Read-only organization list for current user.
 */
export function OrganizationList({ userId, refreshKey }: OrganizationListProps) {
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();
  const [traceId] = useState(() => `organization-list_${Date.now()}`);
  const [organizations, setOrganizations] = useState<OrganizationMembership[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrganizations = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_user_organizations', {
        p_user_id: userId,
      });

      if (error) throw error;

      setOrganizations((data as OrganizationMembership[]) || []);
      logger.info({
        traceId,
        scope: 'organization-list',
        message: 'Fetched organizations for user.',
        data: {
          userId,
          count: data?.length ?? 0,
        },
      });
    } catch (error: unknown) {
      logger.error({
        traceId,
        scope: 'organization-list',
        message: 'Failed to fetch organizations.',
        data: {
          userId,
          error: error instanceof Error ? error.message : error,
        },
      });
      toast({
        title: 'Unable to load organizations',
        description: getUserErrorMessage(error, 'Please try again.'),
        variant: 'destructive',
      });
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, toast, traceId, userId]);

  useEffect(() => {
    void fetchOrganizations();
  }, [fetchOrganizations, refreshKey]);

  if (loading) {
    return <div className="text-sm text-muted-foreground py-6">Loading organizations...</div>;
  }

  if (organizations.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <FiBriefcase className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            No organizations yet. Create one to establish enterprise tenancy boundaries.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {organizations.map((organization) => (
        <Card key={organization.id}>
          <CardHeader className="pb-2 space-y-3">
            <CardTitle className="text-base flex items-center justify-between gap-2">
              <span className="truncate">{organization.name}</span>
              <Badge variant="secondary">{organization.role}</Badge>
            </CardTitle>
            {canInviteOrganizationMembers(organization.role) && (
              <div className="flex justify-end">
                <OrganizationInviteDialog
                  organizationId={organization.id}
                  organizationName={organization.name}
                  actorUserId={userId}
                  actorRole={organization.role}
                  onSuccess={() => void fetchOrganizations()}
                />
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>Slug: <span className="font-mono">{organization.slug}</span></p>
            <p>Created: {new Date(organization.created_at).toLocaleDateString()}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
