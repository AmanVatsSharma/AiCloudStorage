-- =============================================================================
-- Enterprise Security Baseline Migration
-- Date: 2026-02-15
--
-- Purpose:
-- 1) Remove temporary permissive RLS/storage policies used during prototyping.
-- 2) Introduce least-privilege, tenant-safe policies for core tables.
-- 3) Establish reusable authorization helper functions for team membership checks.
--
-- Notes:
-- - This script is idempotent (safe to run repeatedly).
-- - Validate in staging before production rollout.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Ensure RLS is enabled on all application tables.
-- -----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.file_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shared_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.file_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS storage.objects ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 2) Drop known temporary/broad policies created during bootstrap.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Temporary full access to profiles for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Temporary full access to files for authenticated users" ON public.files;
DROP POLICY IF EXISTS "Temporary full access to file_versions for authenticated users" ON public.file_versions;
DROP POLICY IF EXISTS "Temporary full access to shared_files for authenticated users" ON public.shared_files;
DROP POLICY IF EXISTS "Temporary full access to tags for authenticated users" ON public.tags;
DROP POLICY IF EXISTS "Temporary full access to file_tags for authenticated users" ON public.file_tags;
DROP POLICY IF EXISTS "Temporary full access to teams for authenticated users" ON public.teams;
DROP POLICY IF EXISTS "Temporary full access to team_members for authenticated users" ON public.team_members;
DROP POLICY IF EXISTS "Temporary full access to files bucket for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users full access to files bucket" ON storage.objects;

-- Remove deny-all placeholder policies from earlier experiments if present.
DROP POLICY IF EXISTS "deny_all_teams" ON public.teams;
DROP POLICY IF EXISTS "deny_all_team_members" ON public.team_members;

-- -----------------------------------------------------------------------------
-- 3) Authorization helper functions (team ownership + membership checks).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_team_owner(
  p_team_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teams t
    WHERE t.id = p_team_id
      AND t.owner_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_team_member(
  p_team_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.team_id = p_team_id
      AND tm.user_id = p_user_id
  );
$$;

-- -----------------------------------------------------------------------------
-- 4) Profiles policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- 5) Files policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own files" ON public.files;
DROP POLICY IF EXISTS "Users can insert own files" ON public.files;
DROP POLICY IF EXISTS "Users can update own files" ON public.files;
DROP POLICY IF EXISTS "Users can delete own files" ON public.files;
DROP POLICY IF EXISTS "Users can view files shared with them" ON public.files;

CREATE POLICY "files_select_own"
  ON public.files
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "files_insert_own"
  ON public.files
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "files_update_own"
  ON public.files
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "files_delete_own"
  ON public.files
  FOR DELETE
  USING (auth.uid() = user_id);

-- Allow access to files explicitly shared to current user.
CREATE POLICY "files_select_shared_to_user"
  ON public.files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.shared_files sf
      WHERE sf.file_id = public.files.id
        AND (
          sf.shared_with = auth.uid()
          OR sf.is_public = TRUE
        )
        AND (
          sf.expires_at IS NULL
          OR sf.expires_at > NOW()
        )
    )
  );

-- -----------------------------------------------------------------------------
-- 6) File versions, tags, and file_tags policies.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can access versions of own files" ON public.file_versions;
DROP POLICY IF EXISTS "Users can see own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can insert own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can update own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can delete own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can see tags for their files" ON public.file_tags;
DROP POLICY IF EXISTS "Users can insert tags for their files" ON public.file_tags;
DROP POLICY IF EXISTS "Users can delete tags for their files" ON public.file_tags;

CREATE POLICY "file_versions_all_owner"
  ON public.file_versions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.files f
      WHERE f.id = public.file_versions.file_id
        AND f.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.files f
      WHERE f.id = public.file_versions.file_id
        AND f.user_id = auth.uid()
    )
  );

CREATE POLICY "tags_select_owner"
  ON public.tags
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "tags_insert_owner"
  ON public.tags
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "tags_update_owner"
  ON public.tags
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "tags_delete_owner"
  ON public.tags
  FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "file_tags_select_owner"
  ON public.file_tags
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.files f
      WHERE f.id = public.file_tags.file_id
        AND f.user_id = auth.uid()
    )
  );

CREATE POLICY "file_tags_insert_owner"
  ON public.file_tags
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.files f
      WHERE f.id = public.file_tags.file_id
        AND f.user_id = auth.uid()
    )
  );

CREATE POLICY "file_tags_delete_owner"
  ON public.file_tags
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.files f
      WHERE f.id = public.file_tags.file_id
        AND f.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 7) Shared files policies.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can see files shared by them or with them" ON public.shared_files;
DROP POLICY IF EXISTS "Users can share their own files" ON public.shared_files;
DROP POLICY IF EXISTS "Users can delete their own shares" ON public.shared_files;

CREATE POLICY "shared_files_select_owner_or_recipient"
  ON public.shared_files
  FOR SELECT
  USING (
    owner_id = auth.uid()
    OR shared_with = auth.uid()
  );

CREATE POLICY "shared_files_insert_owner"
  ON public.shared_files
  FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.files f
      WHERE f.id = file_id
        AND f.user_id = auth.uid()
    )
  );

CREATE POLICY "shared_files_delete_owner"
  ON public.shared_files
  FOR DELETE
  USING (owner_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 8) Teams and team members policies.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can see teams they are in" ON public.teams;
DROP POLICY IF EXISTS "Users can create own teams" ON public.teams;
DROP POLICY IF EXISTS "Only owners can update their teams" ON public.teams;
DROP POLICY IF EXISTS "Only owners can delete their teams" ON public.teams;
DROP POLICY IF EXISTS "Users can see members of teams they are in" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can add members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can update members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can remove members" ON public.team_members;
DROP POLICY IF EXISTS "view_own_teams" ON public.teams;
DROP POLICY IF EXISTS "view_member_teams" ON public.teams;
DROP POLICY IF EXISTS "create_teams" ON public.teams;
DROP POLICY IF EXISTS "update_teams" ON public.teams;
DROP POLICY IF EXISTS "delete_teams" ON public.teams;
DROP POLICY IF EXISTS "view_team_members_as_owner" ON public.team_members;
DROP POLICY IF EXISTS "view_team_members_as_member" ON public.team_members;
DROP POLICY IF EXISTS "insert_team_members" ON public.team_members;
DROP POLICY IF EXISTS "update_team_members" ON public.team_members;
DROP POLICY IF EXISTS "delete_team_members" ON public.team_members;

CREATE POLICY "teams_select_owner_or_member"
  ON public.teams
  FOR SELECT
  USING (
    owner_id = auth.uid()
    OR public.is_team_member(id, auth.uid())
  );

CREATE POLICY "teams_insert_owner_only"
  ON public.teams
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "teams_update_owner_only"
  ON public.teams
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "teams_delete_owner_only"
  ON public.teams
  FOR DELETE
  USING (owner_id = auth.uid());

CREATE POLICY "team_members_select_owner_or_member"
  ON public.team_members
  FOR SELECT
  USING (
    public.is_team_owner(team_id, auth.uid())
    OR public.is_team_member(team_id, auth.uid())
  );

CREATE POLICY "team_members_insert_owner_only"
  ON public.team_members
  FOR INSERT
  WITH CHECK (public.is_team_owner(team_id, auth.uid()));

CREATE POLICY "team_members_update_owner_only"
  ON public.team_members
  FOR UPDATE
  USING (public.is_team_owner(team_id, auth.uid()))
  WITH CHECK (public.is_team_owner(team_id, auth.uid()));

CREATE POLICY "team_members_delete_owner_only"
  ON public.team_members
  FOR DELETE
  USING (public.is_team_owner(team_id, auth.uid()));

-- -----------------------------------------------------------------------------
-- 9) Harden storage bucket access by owner folder prefix.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "storage_files_select_own_prefix" ON storage.objects;
DROP POLICY IF EXISTS "storage_files_insert_own_prefix" ON storage.objects;
DROP POLICY IF EXISTS "storage_files_update_own_prefix" ON storage.objects;
DROP POLICY IF EXISTS "storage_files_delete_own_prefix" ON storage.objects;

CREATE POLICY "storage_files_select_own_prefix"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'files'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "storage_files_insert_own_prefix"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'files'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "storage_files_update_own_prefix"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'files'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  )
  WITH CHECK (
    bucket_id = 'files'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "storage_files_delete_own_prefix"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'files'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );
