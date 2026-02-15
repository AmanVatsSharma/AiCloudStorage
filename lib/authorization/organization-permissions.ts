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
  invitedRole: OrganizationRole
): boolean {
  const allowedRoles = getInvitableOrganizationRoles(actorRole);
  return allowedRoles.includes(invitedRole);
}

/**
 * Whether actor can open organization member-management actions.
 */
export function canManageOrganizationMembers(actorRole: OrganizationRole): boolean {
  return actorRole === 'owner' || actorRole === 'admin';
}

/**
 * Returns assignable roles for member role updates.
 */
export function assignableOrganizationRolesFor(actorRole: OrganizationRole): OrganizationRole[] {
  return getInvitableOrganizationRoles(actorRole);
}

/**
 * Determines whether actor can change a member role.
 */
export function canChangeOrganizationMemberRole(
  actorRole: OrganizationRole,
  targetRole: OrganizationRole,
  desiredRole: OrganizationRole,
  actorUserId: string,
  targetUserId: string
): boolean {
  if (!canManageOrganizationMembers(actorRole)) return false;
  if (targetRole === 'owner') return false;
  if (actorRole === 'admin' && targetRole === 'admin') return false;
  if (actorUserId === targetUserId) return false;

  return assignableOrganizationRolesFor(actorRole).includes(desiredRole);
}

/**
 * Determines whether actor can remove a member from organization.
 */
export function canRemoveOrganizationMember(
  actorRole: OrganizationRole,
  targetRole: OrganizationRole,
  actorUserId: string,
  targetUserId: string
): boolean {
  if (!canManageOrganizationMembers(actorRole)) return false;
  if (targetRole === 'owner') return false;
  if (actorRole === 'admin' && targetRole === 'admin') return false;
  if (actorUserId === targetUserId) return false;
  return true;
}

/**
 * Whether actor can revoke an invitation for the target role.
 */
export function canRevokeOrganizationInvitation(
  actorRole: OrganizationRole,
  invitationRole: OrganizationRole
): boolean {
  if (!canManageOrganizationMembers(actorRole)) return false;
  if (actorRole === 'owner') return true;
  return invitationRole === 'member' || invitationRole === 'billing_viewer';
}
