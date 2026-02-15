'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { logger } from '@/lib/logger';
import { getUserErrorMessage } from '@/lib/errors';
import { trackAuditEvent } from '@/lib/audit';
import { FiUserPlus } from 'react-icons/fi';
import {
  canInviteOrganizationRole,
  getInvitableOrganizationRoles,
  OrganizationRole,
} from '@/lib/authorization/organization-permissions';

interface OrganizationInviteDialogProps {
  organizationId: string;
  organizationName: string;
  actorUserId: string;
  actorRole: OrganizationRole;
  onSuccess?: () => void;
}

/**
 * Invite dialog for organization membership onboarding.
 */
export function OrganizationInviteDialog({
  organizationId,
  organizationName,
  actorUserId,
  actorRole,
  onSuccess,
}: OrganizationInviteDialogProps) {
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();
  const [traceId] = useState(() => `organization-invite_${Date.now()}`);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrganizationRole>('member');
  const [loading, setLoading] = useState(false);
  const allowedRoles = useMemo(() => getInvitableOrganizationRoles(actorRole), [actorRole]);

  const roleOptions = useMemo(
    () =>
      allowedRoles.map((value) => ({
        value,
        label: value === 'billing_viewer' ? 'Billing Viewer' : value.charAt(0).toUpperCase() + value.slice(1),
      })),
    [allowedRoles]
  );

  useEffect(() => {
    if (allowedRoles.length === 0) {
      return;
    }

    if (!allowedRoles.includes(role)) {
      setRole(allowedRoles[0]);
    }
  }, [allowedRoles, role]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;

    if (!canInviteOrganizationRole(actorRole, role)) {
      logger.warn({
        traceId,
        scope: 'organization-invite-dialog',
        message: 'Invite blocked by organization permission matrix.',
        data: {
          actorRole,
          targetRole: role,
          organizationId,
        },
      });
      toast({
        title: 'Permission denied',
        description: 'Your organization role does not allow inviting this member role.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const token = crypto.randomUUID();
      const { error } = await supabase
        .from('organization_invitations')
        .insert({
          organization_id: organizationId,
          email: normalizedEmail,
          role,
          token,
          invited_by: actorUserId,
        });

      if (error) throw error;

      await trackAuditEvent({
        action: 'organization.invitation.create',
        resourceType: 'organization',
        resourceId: organizationId,
        details: {
          organizationName,
          invitedEmail: normalizedEmail,
          role,
        },
      });

      toast({
        title: 'Invitation created',
        description: `${normalizedEmail} has been invited to ${organizationName}.`,
      });
      setEmail('');
      setRole('member');
      setOpen(false);
      onSuccess?.();
    } catch (error: unknown) {
      logger.error({
        traceId,
        scope: 'organization-invite-dialog',
        message: 'Failed to create organization invitation.',
        data: {
          organizationId,
          invitedEmail: normalizedEmail,
          role,
          error: error instanceof Error ? error.message : error,
        },
      });
      toast({
        title: 'Invitation failed',
        description: getUserErrorMessage(error, 'Unable to create invitation.'),
        variant: 'destructive',
      });
      await trackAuditEvent({
        action: 'organization.invitation.create',
        resourceType: 'organization',
        resourceId: organizationId,
        status: 'failure',
        details: {
          invitedEmail: normalizedEmail,
          role,
          reason: error instanceof Error ? error.message : String(error),
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FiUserPlus className="h-4 w-4 mr-1" />
          Invite
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite to {organizationName}</DialogTitle>
          <DialogDescription>
            Create an invitation for a new organization member.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-invite-email">Email</Label>
            <Input
              id="org-invite-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="member@company.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-invite-role">Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as OrganizationRole)}>
              <SelectTrigger id="org-invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((roleOption) => (
                  <SelectItem key={roleOption.value} value={roleOption.value}>
                    {roleOption.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating invitation...' : 'Create invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
