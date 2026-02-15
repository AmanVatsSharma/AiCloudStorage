'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiUserX, FiRefreshCw, FiSlash } from 'react-icons/fi';

import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { getUserErrorMessage } from '@/lib/errors';
import { trackAuditEvent } from '@/lib/audit';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  assignableOrganizationRolesFor,
  canChangeOrganizationMemberRole,
  canRemoveOrganizationMember,
  canRevokeOrganizationInvitation,
  OrganizationRole,
} from '@/lib/authorization/organization-permissions';

interface OrganizationMembersManagerProps {
  organizationId: string;
  organizationName: string;
  actorUserId: string;
  actorRole: OrganizationRole;
}

interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  created_at: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface OrganizationInvitation {
  id: string;
  email: string;
  role: OrganizationRole;
  status: 'pending' | 'accepted' | 'revoked';
  created_at: string;
  expires_at: string;
}

function getMemberLabel(member: OrganizationMember): string {
  if (member.full_name?.trim()) return member.full_name;
  if (member.email?.trim()) return member.email;
  return `User ${member.user_id.slice(0, 8)}`;
}

/**
 * Organization member operations panel with server-authorized role/membership actions.
 */
export function OrganizationMembersManager({
  organizationId,
  organizationName,
  actorUserId,
  actorRole,
}: OrganizationMembersManagerProps) {
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();
  const [traceId] = useState(() => `organization-members-manager_${Date.now()}`);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [busyInvitationId, setBusyInvitationId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const assignableRoles = useMemo(
    () => assignableOrganizationRolesFor(actorRole),
    [actorRole]
  );

  const loadMemberData = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_organization_members', {
      p_organization_id: organizationId,
      p_user_id: actorUserId,
    });

    if (error) throw error;
    setMembers(((data as OrganizationMember[]) || []).sort((a, b) => a.created_at.localeCompare(b.created_at)));
  }, [actorUserId, organizationId, supabase]);

  const loadInvitationData = useCallback(async () => {
    const { data, error } = await supabase
      .from('organization_invitations')
      .select('id, email, role, status, created_at, expires_at')
      .eq('organization_id', organizationId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    setInvitations((data as OrganizationInvitation[]) || []);
  }, [organizationId, supabase]);

  const refreshAll = useCallback(async () => {
    try {
      await Promise.all([loadMemberData(), loadInvitationData()]);
    } catch (error: unknown) {
      logger.error({
        traceId,
        scope: 'organization-members-manager',
        message: 'Failed to refresh organization membership data.',
        data: {
          organizationId,
          actorUserId,
          actorRole,
          error: error instanceof Error ? error.message : error,
        },
      });
      toast({
        title: 'Unable to load members',
        description: getUserErrorMessage(error, 'Please refresh and try again.'),
        variant: 'destructive',
      });
    }
  }, [actorRole, actorUserId, loadInvitationData, loadMemberData, organizationId, toast, traceId]);

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      await refreshAll();
      setLoading(false);
    };

    void bootstrap();
  }, [refreshAll]);

  const handleRoleChange = async (member: OrganizationMember, desiredRole: OrganizationRole) => {
    if (desiredRole === member.role) return;

    if (
      !canChangeOrganizationMemberRole(
        actorRole,
        member.role,
        desiredRole,
        actorUserId,
        member.user_id
      )
    ) {
      toast({
        title: 'Permission denied',
        description: 'Your role cannot assign this member role transition.',
        variant: 'destructive',
      });
      return;
    }

    setBusyMemberId(member.id);
    try {
      const { error } = await supabase.rpc('update_organization_member_role', {
        p_organization_id: organizationId,
        p_actor_user_id: actorUserId,
        p_member_id: member.id,
        p_new_role: desiredRole,
      });
      if (error) throw error;

      await trackAuditEvent({
        action: 'organization.member.role_update',
        resourceType: 'organization_member',
        resourceId: member.id,
        details: {
          organizationId,
          organizationName,
          memberUserId: member.user_id,
          previousRole: member.role,
          desiredRole,
        },
      });

      toast({
        title: 'Member role updated',
        description: `${getMemberLabel(member)} is now ${desiredRole}.`,
      });
      await refreshAll();
    } catch (error: unknown) {
      logger.error({
        traceId,
        scope: 'organization-members-manager',
        message: 'Failed to update organization member role.',
        data: {
          organizationId,
          memberId: member.id,
          actorUserId,
          actorRole,
          desiredRole,
          error: error instanceof Error ? error.message : error,
        },
      });
      toast({
        title: 'Role update failed',
        description: getUserErrorMessage(error, 'Unable to update member role.'),
        variant: 'destructive',
      });
    } finally {
      setBusyMemberId(null);
    }
  };

  const handleRemoveMember = async (member: OrganizationMember) => {
    if (!canRemoveOrganizationMember(actorRole, member.role, actorUserId, member.user_id)) {
      toast({
        title: 'Permission denied',
        description: 'Your role cannot remove this member.',
        variant: 'destructive',
      });
      return;
    }

    const confirmed = window.confirm(
      `Remove ${getMemberLabel(member)} from ${organizationName}?`
    );
    if (!confirmed) return;

    setBusyMemberId(member.id);
    try {
      const { error } = await supabase.rpc('remove_organization_member', {
        p_organization_id: organizationId,
        p_actor_user_id: actorUserId,
        p_member_id: member.id,
      });
      if (error) throw error;

      await trackAuditEvent({
        action: 'organization.member.remove',
        resourceType: 'organization_member',
        resourceId: member.id,
        details: {
          organizationId,
          organizationName,
          removedUserId: member.user_id,
          removedRole: member.role,
        },
      });

      toast({
        title: 'Member removed',
        description: `${getMemberLabel(member)} has been removed.`,
      });
      await refreshAll();
    } catch (error: unknown) {
      logger.error({
        traceId,
        scope: 'organization-members-manager',
        message: 'Failed to remove organization member.',
        data: {
          organizationId,
          memberId: member.id,
          actorUserId,
          actorRole,
          error: error instanceof Error ? error.message : error,
        },
      });
      toast({
        title: 'Member removal failed',
        description: getUserErrorMessage(error, 'Unable to remove member.'),
        variant: 'destructive',
      });
    } finally {
      setBusyMemberId(null);
    }
  };

  const handleRevokeInvitation = async (invitation: OrganizationInvitation) => {
    if (!canRevokeOrganizationInvitation(actorRole, invitation.role)) {
      toast({
        title: 'Permission denied',
        description: 'Your role cannot revoke this invitation.',
        variant: 'destructive',
      });
      return;
    }

    setBusyInvitationId(invitation.id);
    try {
      const { error } = await supabase.rpc('revoke_organization_invitation', {
        p_organization_id: organizationId,
        p_actor_user_id: actorUserId,
        p_invitation_id: invitation.id,
      });
      if (error) throw error;

      await trackAuditEvent({
        action: 'organization.invitation.revoke',
        resourceType: 'organization_invitation',
        resourceId: invitation.id,
        details: {
          organizationId,
          organizationName,
          invitedEmail: invitation.email,
          invitedRole: invitation.role,
        },
      });

      toast({
        title: 'Invitation revoked',
        description: `Revoked invitation for ${invitation.email}.`,
      });
      await refreshAll();
    } catch (error: unknown) {
      logger.error({
        traceId,
        scope: 'organization-members-manager',
        message: 'Failed to revoke organization invitation.',
        data: {
          organizationId,
          invitationId: invitation.id,
          actorUserId,
          actorRole,
          error: error instanceof Error ? error.message : error,
        },
      });
      toast({
        title: 'Invitation revoke failed',
        description: getUserErrorMessage(error, 'Unable to revoke invitation.'),
        variant: 'destructive',
      });
    } finally {
      setBusyInvitationId(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="py-10 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Organization Members</CardTitle>
          <Button
            variant="outline"
            size="sm"
            disabled={refreshing}
            onClick={() => void handleRefresh()}
          >
            <FiRefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">No members found for this organization.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const roleOptions = assignableRoles.filter((candidateRole) =>
                    canChangeOrganizationMemberRole(
                      actorRole,
                      member.role,
                      candidateRole,
                      actorUserId,
                      member.user_id
                    )
                  );
                  const canRoleEdit = roleOptions.length > 0;
                  const canRemove = canRemoveOrganizationMember(
                    actorRole,
                    member.role,
                    actorUserId,
                    member.user_id
                  );

                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.avatar_url || ''} alt={getMemberLabel(member)} />
                            <AvatarFallback>
                              {getMemberLabel(member).charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{getMemberLabel(member)}</span>
                            {member.user_id === actorUserId && <Badge variant="outline">You</Badge>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{member.email || 'Unavailable'}</TableCell>
                      <TableCell>
                        {canRoleEdit ? (
                          <select
                            className="h-9 rounded-md border px-2 text-sm"
                            value={member.role}
                            disabled={busyMemberId === member.id}
                            onChange={(event) =>
                              void handleRoleChange(member, event.target.value as OrganizationRole)
                            }
                          >
                            {[member.role, ...roleOptions]
                              .filter((role, index, roles) => roles.indexOf(role) === index)
                              .map((roleOption) => (
                                <option key={roleOption} value={roleOption}>
                                  {roleOption === 'billing_viewer'
                                    ? 'Billing Viewer'
                                    : roleOption.charAt(0).toUpperCase() + roleOption.slice(1)}
                                </option>
                              ))}
                          </select>
                        ) : (
                          <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                            {member.role}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{new Date(member.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        {canRemove ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            disabled={busyMemberId === member.id}
                            onClick={() => void handleRemoveMember(member)}
                          >
                            <FiUserX className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">No action</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">No pending invitations.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Invited</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => {
                  const canRevoke = canRevokeOrganizationInvitation(actorRole, invitation.role);
                  return (
                    <TableRow key={invitation.id}>
                      <TableCell>{invitation.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {invitation.role === 'billing_viewer'
                            ? 'billing_viewer'
                            : invitation.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(invitation.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(invitation.expires_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        {canRevoke ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            disabled={busyInvitationId === invitation.id}
                            onClick={() => void handleRevokeInvitation(invitation)}
                          >
                            <FiSlash className="h-4 w-4 mr-1" />
                            Revoke
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">No action</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
