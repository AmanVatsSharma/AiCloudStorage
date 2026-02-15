-- =============================================================================
-- Organization & IAM Foundation Migration
-- Date: 2026-02-15
--
-- Purpose:
-- - Introduce organization-level tenancy model primitives.
-- - Provide membership + invitation structures.
-- - Add secure helper functions and initial RLS policies.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'billing_viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'billing_viewer')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invitations_org_id ON public.organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invitations_email ON public.organization_invitations(email);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Authorization helper functions
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_org_owner(
  p_org_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.id = p_org_id
      AND o.owner_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(
  p_org_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = p_org_id
      AND om.user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(
  p_org_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = p_org_id
      AND om.user_id = p_user_id
      AND om.role IN ('owner', 'admin')
  );
$$;

-- -----------------------------------------------------------------------------
-- RLS policies: organizations
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "organizations_select_owner_or_member" ON public.organizations;
DROP POLICY IF EXISTS "organizations_insert_owner_only" ON public.organizations;
DROP POLICY IF EXISTS "organizations_update_owner_only" ON public.organizations;
DROP POLICY IF EXISTS "organizations_delete_owner_only" ON public.organizations;

CREATE POLICY "organizations_select_owner_or_member"
  ON public.organizations
  FOR SELECT
  USING (
    owner_id = auth.uid()
    OR public.is_org_member(id, auth.uid())
  );

CREATE POLICY "organizations_insert_owner_only"
  ON public.organizations
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "organizations_update_owner_only"
  ON public.organizations
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "organizations_delete_owner_only"
  ON public.organizations
  FOR DELETE
  USING (owner_id = auth.uid());

-- -----------------------------------------------------------------------------
-- RLS policies: organization_members
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "organization_members_select_member_or_owner" ON public.organization_members;
DROP POLICY IF EXISTS "organization_members_insert_admin_or_owner" ON public.organization_members;
DROP POLICY IF EXISTS "organization_members_update_admin_or_owner" ON public.organization_members;
DROP POLICY IF EXISTS "organization_members_delete_admin_or_owner" ON public.organization_members;

CREATE POLICY "organization_members_select_member_or_owner"
  ON public.organization_members
  FOR SELECT
  USING (
    public.is_org_member(organization_id, auth.uid())
    OR public.is_org_owner(organization_id, auth.uid())
  );

CREATE POLICY "organization_members_insert_admin_or_owner"
  ON public.organization_members
  FOR INSERT
  WITH CHECK (
    public.is_org_admin(organization_id, auth.uid())
  );

CREATE POLICY "organization_members_update_admin_or_owner"
  ON public.organization_members
  FOR UPDATE
  USING (
    public.is_org_admin(organization_id, auth.uid())
  )
  WITH CHECK (
    public.is_org_admin(organization_id, auth.uid())
  );

CREATE POLICY "organization_members_delete_admin_or_owner"
  ON public.organization_members
  FOR DELETE
  USING (
    public.is_org_admin(organization_id, auth.uid())
  );

-- -----------------------------------------------------------------------------
-- RLS policies: organization_invitations
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "organization_invitations_select_admin_or_owner" ON public.organization_invitations;
DROP POLICY IF EXISTS "organization_invitations_insert_admin_or_owner" ON public.organization_invitations;
DROP POLICY IF EXISTS "organization_invitations_update_admin_or_owner" ON public.organization_invitations;
DROP POLICY IF EXISTS "organization_invitations_delete_admin_or_owner" ON public.organization_invitations;

CREATE POLICY "organization_invitations_select_admin_or_owner"
  ON public.organization_invitations
  FOR SELECT
  USING (
    public.is_org_admin(organization_id, auth.uid())
    OR public.is_org_owner(organization_id, auth.uid())
  );

CREATE POLICY "organization_invitations_insert_admin_or_owner"
  ON public.organization_invitations
  FOR INSERT
  WITH CHECK (
    public.is_org_admin(organization_id, auth.uid())
    OR public.is_org_owner(organization_id, auth.uid())
  );

CREATE POLICY "organization_invitations_update_admin_or_owner"
  ON public.organization_invitations
  FOR UPDATE
  USING (
    public.is_org_admin(organization_id, auth.uid())
    OR public.is_org_owner(organization_id, auth.uid())
  )
  WITH CHECK (
    public.is_org_admin(organization_id, auth.uid())
    OR public.is_org_owner(organization_id, auth.uid())
  );

CREATE POLICY "organization_invitations_delete_admin_or_owner"
  ON public.organization_invitations
  FOR DELETE
  USING (
    public.is_org_admin(organization_id, auth.uid())
    OR public.is_org_owner(organization_id, auth.uid())
  );

-- -----------------------------------------------------------------------------
-- Convenience RPCs
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_organization_with_owner(
  p_name TEXT,
  p_slug TEXT,
  p_owner_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_owner_id THEN
    RAISE EXCEPTION 'Owner must match authenticated user';
  END IF;

  INSERT INTO public.organizations (name, slug, owner_id)
  VALUES (p_name, p_slug, p_owner_id)
  RETURNING id INTO v_org_id;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (v_org_id, p_owner_id, 'owner')
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  RETURN v_org_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_organizations(
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  owner_id UUID,
  role TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id,
    o.name,
    o.slug,
    o.owner_id,
    om.role,
    o.created_at
  FROM public.organizations o
  JOIN public.organization_members om
    ON om.organization_id = o.id
  WHERE om.user_id = p_user_id;
$$;

REVOKE ALL ON FUNCTION public.create_organization_with_owner(TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_organization_with_owner(TEXT, TEXT, UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.get_user_organizations(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_organizations(UUID) TO authenticated;
