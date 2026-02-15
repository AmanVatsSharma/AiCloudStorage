import {
  assignableOrganizationRolesFor,
  canChangeOrganizationMemberRole,
  canInviteOrganizationMembers,
  canInviteOrganizationRole,
  canManageOrganizationMembers,
  canRemoveOrganizationMember,
  canRevokeOrganizationInvitation,
  getInvitableOrganizationRoles,
} from '@/lib/authorization/organization-permissions';

describe('organization permissions', () => {
  it('allows only owner and admin to invite members', () => {
    expect(canInviteOrganizationMembers('owner')).toBe(true);
    expect(canInviteOrganizationMembers('admin')).toBe(true);
    expect(canInviteOrganizationMembers('member')).toBe(false);
    expect(canInviteOrganizationMembers('billing_viewer')).toBe(false);
  });

  it('returns invitable roles by actor role', () => {
    expect(getInvitableOrganizationRoles('owner')).toEqual(['admin', 'member', 'billing_viewer']);
    expect(getInvitableOrganizationRoles('admin')).toEqual(['member', 'billing_viewer']);
    expect(getInvitableOrganizationRoles('member')).toEqual([]);
  });

  it('blocks admin from inviting admin role', () => {
    expect(canInviteOrganizationRole('admin', 'admin')).toBe(false);
    expect(canInviteOrganizationRole('admin', 'member')).toBe(true);
  });

  it('allows only owner/admin to manage members', () => {
    expect(canManageOrganizationMembers('owner')).toBe(true);
    expect(canManageOrganizationMembers('admin')).toBe(true);
    expect(canManageOrganizationMembers('member')).toBe(false);
  });

  it('maps assignable roles from actor role', () => {
    expect(assignableOrganizationRolesFor('owner')).toEqual(['admin', 'member', 'billing_viewer']);
    expect(assignableOrganizationRolesFor('admin')).toEqual(['member', 'billing_viewer']);
  });

  it('prevents self-role change and owner role changes', () => {
    expect(
      canChangeOrganizationMemberRole('owner', 'member', 'admin', 'actor-1', 'actor-1')
    ).toBe(false);
    expect(
      canChangeOrganizationMemberRole('owner', 'owner', 'admin', 'actor-1', 'target-1')
    ).toBe(false);
  });

  it('restricts admin from promoting peers', () => {
    expect(
      canChangeOrganizationMemberRole('admin', 'member', 'member', 'actor-1', 'target-1')
    ).toBe(true);
    expect(
      canChangeOrganizationMemberRole('admin', 'member', 'admin', 'actor-1', 'target-1')
    ).toBe(false);
    expect(
      canChangeOrganizationMemberRole('admin', 'admin', 'member', 'actor-1', 'target-1')
    ).toBe(false);
  });

  it('allows owner/admin member removal with safeguards', () => {
    expect(canRemoveOrganizationMember('owner', 'member', 'actor-1', 'target-1')).toBe(true);
    expect(canRemoveOrganizationMember('owner', 'owner', 'actor-1', 'target-1')).toBe(false);
    expect(canRemoveOrganizationMember('admin', 'admin', 'actor-1', 'target-1')).toBe(false);
    expect(canRemoveOrganizationMember('admin', 'member', 'actor-1', 'actor-1')).toBe(false);
  });

  it('enforces invitation revoke role boundaries', () => {
    expect(canRevokeOrganizationInvitation('owner', 'admin')).toBe(true);
    expect(canRevokeOrganizationInvitation('admin', 'member')).toBe(true);
    expect(canRevokeOrganizationInvitation('admin', 'admin')).toBe(false);
    expect(canRevokeOrganizationInvitation('member', 'member')).toBe(false);
  });
});
