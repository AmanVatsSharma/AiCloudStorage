import {
  canInviteOrganizationMembers,
  canInviteOrganizationRole,
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
});
