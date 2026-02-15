'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { getUserErrorMessage } from '@/lib/errors';
import { trackAuditEvent } from '@/lib/audit';

interface OrganizationInvitationAcceptCardProps {
  token: string;
  userId: string;
  userEmail: string;
}

/**
 * Accept organization invitation token for authenticated user.
 */
export function OrganizationInvitationAcceptCard({
  token,
  userId,
  userEmail,
}: OrganizationInvitationAcceptCardProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { toast } = useToast();
  const [traceId] = useState(() => `organization-invitation-accept_${Date.now()}`);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState<{
    organizationId: string;
    organizationName: string;
    assignedRole: string;
  } | null>(null);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const { data, error } = await supabase.rpc('accept_organization_invitation', {
        p_token: token,
        p_user_id: userId,
        p_user_email: userEmail,
      });

      if (error) throw error;
      const payload = data?.[0];
      if (!payload) {
        throw new Error('No invitation payload returned.');
      }

      const result = {
        organizationId: payload.organization_id,
        organizationName: payload.organization_name,
        assignedRole: payload.assigned_role,
      };
      setAccepted(result);

      await trackAuditEvent({
        action: 'organization.invitation.accept',
        resourceType: 'organization_invitation',
        resourceId: token,
        details: {
          organizationId: result.organizationId,
          organizationName: result.organizationName,
          assignedRole: result.assignedRole,
        },
      });

      toast({
        title: 'Invitation accepted',
        description: `You now have ${result.assignedRole} access to ${result.organizationName}.`,
      });
    } catch (error: unknown) {
      logger.error({
        traceId,
        scope: 'organization-invitation-accept-card',
        message: 'Failed to accept organization invitation.',
        data: {
          userId,
          userEmail,
          token,
          error: error instanceof Error ? error.message : error,
        },
      });

      await trackAuditEvent({
        action: 'organization.invitation.accept',
        resourceType: 'organization_invitation',
        resourceId: token,
        status: 'failure',
        details: {
          userId,
          userEmail,
          reason: error instanceof Error ? error.message : String(error),
        },
      });

      toast({
        title: 'Unable to accept invitation',
        description: getUserErrorMessage(error, 'The invitation may be expired or invalid.'),
        variant: 'destructive',
      });
    } finally {
      setAccepting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Invitation</CardTitle>
        <CardDescription>
          Accept this invitation to join the organization with your authenticated account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Signed in as <span className="font-medium">{userEmail}</span>
        </p>
        {accepted ? (
          <div className="space-y-3">
            <p className="text-sm">
              Added to <span className="font-semibold">{accepted.organizationName}</span> as{' '}
              <span className="font-semibold">{accepted.assignedRole}</span>.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => router.push('/organizations')}>Go to Organizations</Button>
              <Button variant="outline" onClick={() => router.push('/dashboard')}>
                Go to Dashboard
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => void handleAccept()} disabled={accepting}>
            {accepting ? 'Accepting invitation...' : 'Accept Invitation'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
