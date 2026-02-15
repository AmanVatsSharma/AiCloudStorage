import {
  assignableRolesFor,
  canChangeMemberRole,
  canDeleteTeam,
  canInviteMembers,
  canManageTeam,
  canRemoveMember,
} from '@/lib/authorization/team-permissions';

describe('team permission matrix', () => {
  it('allows only owner to manage and delete team', () => {
    expect(canManageTeam('owner')).toBe(true);
    expect(canManageTeam('admin')).toBe(false);
    expect(canDeleteTeam('owner')).toBe(true);
    expect(canDeleteTeam('member')).toBe(false);
  });

  it('returns assignable roles for owner only', () => {
    expect(assignableRolesFor('owner')).toEqual(['admin', 'member']);
    expect(assignableRolesFor('admin')).toEqual([]);
  });

  it('prevents owner role reassignment via UI helper', () => {
    expect(canChangeMemberRole('owner', 'member', 'admin')).toBe(true);
    expect(canChangeMemberRole('owner', 'owner', 'admin')).toBe(false);
    expect(canChangeMemberRole('owner', 'member', 'owner')).toBe(false);
    expect(canChangeMemberRole('admin', 'member', 'admin')).toBe(false);
  });

  it('prevents unsafe removals', () => {
    expect(canRemoveMember('owner', 'member', 'u1', 'u2')).toBe(true);
    expect(canRemoveMember('owner', 'owner', 'u1', 'u2')).toBe(false);
    expect(canRemoveMember('owner', 'member', 'u1', 'u1')).toBe(false);
    expect(canRemoveMember('admin', 'member', 'u1', 'u2')).toBe(false);
  });

  it('allows invite only for owner in current backend model', () => {
    expect(canInviteMembers('owner')).toBe(true);
    expect(canInviteMembers('admin')).toBe(false);
    expect(canInviteMembers('member')).toBe(false);
  });
});
