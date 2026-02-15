-- =============================================================================
-- Organization Invitation Acceptance RPC
-- Date: 2026-02-15
--
-- Purpose:
-- - Allow invited users to securely accept pending organization invitations.
-- - Enforce token validity, expiry window, and email matching server-side.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.accept_organization_invitation(
  p_token TEXT,
  p_user_id UUID,
  p_user_email TEXT
)
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  assigned_role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Actor must match authenticated user';
  END IF;

  SELECT
    oi.id,
    oi.organization_id,
    oi.email,
    oi.role,
    oi.status,
    oi.expires_at,
    o.name AS organization_name
  INTO v_invitation
  FROM public.organization_invitations oi
  JOIN public.organizations o
    ON o.id = oi.organization_id
  WHERE oi.token = p_token
    AND oi.status = 'pending'
  FOR UPDATE;

  IF v_invitation.id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found or already processed';
  END IF;

  IF v_invitation.expires_at < NOW() THEN
    RAISE EXCEPTION 'Invitation has expired';
  END IF;

  IF LOWER(COALESCE(v_invitation.email, '')) <> LOWER(COALESCE(p_user_email, '')) THEN
    RAISE EXCEPTION 'Invitation email does not match authenticated account';
  END IF;

  INSERT INTO public.organization_members (
    organization_id,
    user_id,
    role
  )
  VALUES (
    v_invitation.organization_id,
    p_user_id,
    v_invitation.role
  )
  ON CONFLICT (organization_id, user_id)
  DO UPDATE
    SET role = EXCLUDED.role,
        updated_at = NOW();

  UPDATE public.organization_invitations
  SET status = 'accepted'
  WHERE id = v_invitation.id;

  RETURN QUERY
  SELECT
    v_invitation.organization_id::UUID,
    v_invitation.organization_name::TEXT,
    v_invitation.role::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_organization_invitation(TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_organization_invitation(TEXT, UUID, TEXT) TO authenticated;
