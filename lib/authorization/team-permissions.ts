export type TeamRole = 'owner' | 'admin' | 'member';

/**
 * Centralized team authorization helpers.
 * Keep UI/business checks consistent and easy to unit test.
 */
export function canManageTeam(actorRole: TeamRole): boolean {
  return actorRole === 'owner';
}

export function canInviteMembers(actorRole: TeamRole): boolean {
  return actorRole === 'owner';
}

export function canDeleteTeam(actorRole: TeamRole): boolean {
  return actorRole === 'owner';
}

export function assignableRolesFor(actorRole: TeamRole): TeamRole[] {
  if (actorRole === 'owner') {
    return ['admin', 'member'];
  }

  return [];
}

export function canChangeMemberRole(
  actorRole: TeamRole,
  targetRole: TeamRole,
  desiredRole: TeamRole
): boolean {
  if (actorRole !== 'owner') return false;
  if (targetRole === 'owner') return false;
  return assignableRolesFor(actorRole).includes(desiredRole);
}

export function canRemoveMember(
  actorRole: TeamRole,
  targetRole: TeamRole,
  actorUserId: string,
  targetUserId: string
): boolean {
  if (actorRole !== 'owner') return false;
  if (targetRole === 'owner') return false;
  if (actorUserId === targetUserId) return false;
  return true;
}
