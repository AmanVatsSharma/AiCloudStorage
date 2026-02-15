export type OrganizationRole = 'owner' | 'admin' | 'member' | 'billing_viewer';

interface InviteRoleMap {
  [key: string]: OrganizationRole[];
}

const inviteRoleMap: InviteRoleMap = {
  owner: ['admin', 'member', 'billing_viewer'],
  admin: ['member', 'billing_viewer'],
  member: [],
  billing_viewer: [],
};

/**
 * Whether the actor can create organization invitations.
 */
export function canInviteOrganizationMembers(actorRole: OrganizationRole): boolean {
  return actorRole === 'owner' || actorRole === 'admin';
}

/**
 * Which roles the actor is allowed to invite.
 */
export function getInvitableOrganizationRoles(actorRole: OrganizationRole): OrganizationRole[] {
  return inviteRoleMap[actorRole] ?? [];
}

/**
 * Whether actor can invite a specific role in organization.
 */
export function canInviteOrganizationRole(
  actorRole: OrganizationRole,
  targetRole: OrganizationRole
): boolean {
  const allowedRoles = getInvitableOrganizationRoles(actorRole);
  return allowedRoles.includes(targetRole);
}
