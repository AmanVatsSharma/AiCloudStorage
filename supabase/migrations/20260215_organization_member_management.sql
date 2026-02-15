-- =============================================================================
-- Organization Member Management RPCs
-- Date: 2026-02-15
--
-- Purpose:
-- - Provide secure, centralized member-management operations for organizations.
-- - Keep sensitive role transition checks server-side (not only UI-side).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_organization_members(
  p_organization_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  user_id UUID,
  role TEXT,
  created_at TIMESTAMPTZ,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Actor must match authenticated user';
  END IF;

  IF NOT public.is_org_member(p_organization_id, p_user_id) THEN
    RAISE EXCEPTION 'Insufficient permissions to view organization members';
  END IF;

  RETURN QUERY
  SELECT
    om.id,
    om.organization_id,
    om.user_id,
    om.role,
    om.created_at,
    au.email,
    p.full_name,
    p.avatar_url
  FROM public.organization_members om
  JOIN auth.users au
    ON au.id = om.user_id
  LEFT JOIN public.profiles p
    ON p.id = om.user_id
  WHERE om.organization_id = p_organization_id
  ORDER BY
    CASE om.role
      WHEN 'owner' THEN 0
      WHEN 'admin' THEN 1
      WHEN 'member' THEN 2
      ELSE 3
    END,
    om.created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_organization_member_role(
  p_organization_id UUID,
  p_actor_user_id UUID,
  p_member_id UUID,
  p_new_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role TEXT;
  v_target_role TEXT;
  v_target_user_id UUID;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_actor_user_id THEN
    RAISE EXCEPTION 'Actor must match authenticated user';
  END IF;

  IF p_new_role NOT IN ('admin', 'member', 'billing_viewer') THEN
    RAISE EXCEPTION 'Invalid role transition target';
  END IF;

  SELECT role
  INTO v_actor_role
  FROM public.organization_members
  WHERE organization_id = p_organization_id
    AND user_id = p_actor_user_id;

  IF v_actor_role IS NULL THEN
    RAISE EXCEPTION 'Actor is not an organization member';
  END IF;

  SELECT user_id, role
  INTO v_target_user_id, v_target_role
  FROM public.organization_members
  WHERE id = p_member_id
    AND organization_id = p_organization_id;

  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION 'Target member not found';
  END IF;

  IF v_target_role = 'owner' THEN
    RAISE EXCEPTION 'Owner role cannot be modified';
  END IF;

  IF v_target_user_id = p_actor_user_id THEN
    RAISE EXCEPTION 'Self role changes are not allowed';
  END IF;

  IF v_actor_role = 'admin' THEN
    IF v_target_role IN ('owner', 'admin') THEN
      RAISE EXCEPTION 'Admins cannot modify owner/admin members';
    END IF;

    IF p_new_role IN ('owner', 'admin') THEN
      RAISE EXCEPTION 'Admins cannot assign owner/admin roles';
    END IF;
  ELSIF v_actor_role <> 'owner' THEN
    RAISE EXCEPTION 'Only organization owner/admin can change roles';
  END IF;

  UPDATE public.organization_members
  SET role = p_new_role,
      updated_at = NOW()
  WHERE id = p_member_id
    AND organization_id = p_organization_id;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_organization_member(
  p_organization_id UUID,
  p_actor_user_id UUID,
  p_member_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role TEXT;
  v_target_role TEXT;
  v_target_user_id UUID;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_actor_user_id THEN
    RAISE EXCEPTION 'Actor must match authenticated user';
  END IF;

  SELECT role
  INTO v_actor_role
  FROM public.organization_members
  WHERE organization_id = p_organization_id
    AND user_id = p_actor_user_id;

  IF v_actor_role IS NULL THEN
    RAISE EXCEPTION 'Actor is not an organization member';
  END IF;

  SELECT user_id, role
  INTO v_target_user_id, v_target_role
  FROM public.organization_members
  WHERE id = p_member_id
    AND organization_id = p_organization_id;

  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION 'Target member not found';
  END IF;

  IF v_target_role = 'owner' THEN
    RAISE EXCEPTION 'Owner cannot be removed';
  END IF;

  IF v_target_user_id = p_actor_user_id THEN
    RAISE EXCEPTION 'Self removal is not allowed';
  END IF;

  IF v_actor_role = 'admin' AND v_target_role IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Admins cannot remove owner/admin members';
  END IF;

  IF v_actor_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Only organization owner/admin can remove members';
  END IF;

  DELETE FROM public.organization_members
  WHERE id = p_member_id
    AND organization_id = p_organization_id;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_organization_invitation(
  p_organization_id UUID,
  p_actor_user_id UUID,
  p_invitation_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role TEXT;
  v_invitation_role TEXT;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_actor_user_id THEN
    RAISE EXCEPTION 'Actor must match authenticated user';
  END IF;

  SELECT role
  INTO v_actor_role
  FROM public.organization_members
  WHERE organization_id = p_organization_id
    AND user_id = p_actor_user_id;

  IF v_actor_role IS NULL THEN
    RAISE EXCEPTION 'Actor is not an organization member';
  END IF;

  IF v_actor_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Only organization owner/admin can revoke invitations';
  END IF;

  SELECT role
  INTO v_invitation_role
  FROM public.organization_invitations
  WHERE id = p_invitation_id
    AND organization_id = p_organization_id
    AND status = 'pending';

  IF v_invitation_role IS NULL THEN
    RAISE EXCEPTION 'Pending invitation not found';
  END IF;

  IF v_actor_role = 'admin' AND v_invitation_role = 'admin' THEN
    RAISE EXCEPTION 'Admins cannot revoke admin invitations';
  END IF;

  UPDATE public.organization_invitations
  SET status = 'revoked'
  WHERE id = p_invitation_id
    AND organization_id = p_organization_id
    AND status = 'pending';

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.get_organization_members(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_organization_members(UUID, UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.update_organization_member_role(UUID, UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_organization_member_role(UUID, UUID, UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.remove_organization_member(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_organization_member(UUID, UUID, UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.revoke_organization_invitation(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_organization_invitation(UUID, UUID, UUID) TO authenticated;
