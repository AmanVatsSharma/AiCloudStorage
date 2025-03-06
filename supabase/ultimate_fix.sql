-- First, disable RLS completely to reset everything
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their teams" ON public.teams;
DROP POLICY IF EXISTS "Users can view teams they are members of" ON public.teams;
DROP POLICY IF EXISTS "Users can create teams" ON public.teams;
DROP POLICY IF EXISTS "Users can update their teams" ON public.teams;
DROP POLICY IF EXISTS "Users can delete their teams" ON public.teams;
DROP POLICY IF EXISTS "view_own_teams" ON public.teams;
DROP POLICY IF EXISTS "view_member_teams" ON public.teams;
DROP POLICY IF EXISTS "create_teams" ON public.teams;
DROP POLICY IF EXISTS "update_teams" ON public.teams;
DROP POLICY IF EXISTS "delete_teams" ON public.teams;

DROP POLICY IF EXISTS "Users can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view members of their teams" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can add members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can update members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can remove members" ON public.team_members;
DROP POLICY IF EXISTS "view_team_members_as_owner" ON public.team_members;
DROP POLICY IF EXISTS "view_team_members_as_member" ON public.team_members;
DROP POLICY IF EXISTS "insert_team_members" ON public.team_members;
DROP POLICY IF EXISTS "update_team_members" ON public.team_members;
DROP POLICY IF EXISTS "delete_team_members" ON public.team_members;

-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS on_team_created ON public.teams;
DROP FUNCTION IF EXISTS public.handle_new_team();

-- APPROACH: Create a stored procedure that handles team creation with owner
-- This function will run with special privileges and bypass RLS completely
CREATE OR REPLACE FUNCTION public.create_team_with_owner(
  p_name TEXT,
  p_description TEXT,
  p_owner_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with the privileges of the function creator
SET search_path = public
AS $$
DECLARE
  v_team_id UUID;
BEGIN
  -- Insert the team
  INSERT INTO teams (name, description, owner_id)
  VALUES (p_name, p_description, p_owner_id)
  RETURNING id INTO v_team_id;
  
  -- Insert the owner as a team member with owner role
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (v_team_id, p_owner_id, 'owner');
  
  RETURN v_team_id;
END;
$$;

-- Create a function to get teams a user belongs to (handles both owned and joined)
CREATE OR REPLACE FUNCTION public.get_user_teams(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  owner_id UUID,
  created_at TIMESTAMPTZ,
  is_owner BOOLEAN,
  member_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.description,
    t.owner_id,
    t.created_at,
    t.owner_id = p_user_id AS is_owner,
    COUNT(tm.id) AS member_count
  FROM
    teams t
  JOIN
    team_members tm ON t.id = tm.team_id
  WHERE
    t.id IN (
      -- Teams the user is a member of (includes owned teams)
      SELECT DISTINCT team_id FROM team_members WHERE user_id = p_user_id
    )
  GROUP BY
    t.id, t.name, t.description, t.owner_id, t.created_at;
END;
$$;

-- Create function to get team members - FIX the ambiguous team_id column
CREATE OR REPLACE FUNCTION public.get_team_members(p_team_id UUID, p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  team_id UUID,
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
  -- Check if user is a member of the team
  IF NOT EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_id = p_team_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied: User is not a member of this team';
  END IF;

  RETURN QUERY
  SELECT 
    tm.id,
    tm.user_id,
    tm.team_id,  -- Explicitly specify the table (tm)
    tm.role,
    tm.created_at,
    u.email,
    p.full_name,
    p.avatar_url
  FROM
    team_members tm
  JOIN
    auth.users u ON tm.user_id = u.id
  LEFT JOIN
    profiles p ON tm.user_id = p.id
  WHERE
    tm.team_id = p_team_id;  -- Explicitly specify the table (tm)
END;
$$;

-- Create function to add a member to a team
CREATE OR REPLACE FUNCTION public.add_team_member(
  p_team_id UUID,
  p_user_id UUID,
  p_member_email TEXT,
  p_role TEXT DEFAULT 'member'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id UUID;
  v_member_user_id UUID;
BEGIN
  -- Check if user is an owner of the team
  IF NOT EXISTS (
    SELECT 1 FROM teams 
    WHERE id = p_team_id AND owner_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied: Only team owners can add members';
  END IF;

  -- Find the user by email
  SELECT id INTO v_member_user_id
  FROM auth.users
  WHERE email = p_member_email;

  IF v_member_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', p_member_email;
  END IF;

  -- Check if already a member
  IF EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id AND user_id = v_member_user_id
  ) THEN
    RAISE EXCEPTION 'User is already a member of this team';
  END IF;

  -- Add the member
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (p_team_id, v_member_user_id, p_role)
  RETURNING id INTO v_member_id;

  RETURN v_member_id;
END;
$$;

-- Create function to remove a member from a team
CREATE OR REPLACE FUNCTION public.remove_team_member(
  p_team_id UUID,
  p_user_id UUID,
  p_member_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is an owner of the team
  IF NOT EXISTS (
    SELECT 1 FROM teams 
    WHERE id = p_team_id AND owner_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied: Only team owners can remove members';
  END IF;

  -- Remove the member
  DELETE FROM team_members
  WHERE id = p_member_id AND team_id = p_team_id;

  RETURN FOUND;
END;
$$;

-- Create function to update a team - FIX the missing updated_at column
CREATE OR REPLACE FUNCTION public.update_team(
  p_team_id UUID,
  p_user_id UUID,
  p_name TEXT,
  p_description TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is an owner of the team
  IF NOT EXISTS (
    SELECT 1 FROM teams 
    WHERE id = p_team_id AND owner_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied: Only team owners can update teams';
  END IF;

  -- Update the team - Remove the updated_at field since it doesn't exist
  UPDATE teams
  SET 
    name = p_name,
    description = p_description
  WHERE id = p_team_id;

  RETURN FOUND;
END;
$$;

-- Create function to delete a team
CREATE OR REPLACE FUNCTION public.delete_team(
  p_team_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is an owner of the team
  IF NOT EXISTS (
    SELECT 1 FROM teams 
    WHERE id = p_team_id AND owner_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied: Only team owners can delete teams';
  END IF;

  -- Delete team members first (cascade will handle this, but being explicit)
  DELETE FROM team_members
  WHERE team_id = p_team_id;

  -- Delete the team
  DELETE FROM teams
  WHERE id = p_team_id;

  RETURN FOUND;
END;
$$;

-- Enable RLS but don't create any policies - we'll use functions instead
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Drop existing deny policies if they exist
DROP POLICY IF EXISTS "deny_all_teams" ON public.teams;
DROP POLICY IF EXISTS "deny_all_team_members" ON public.team_members;

-- Create a default deny policy for each table
CREATE POLICY "deny_all_teams" ON public.teams
  FOR ALL USING (false);

CREATE POLICY "deny_all_team_members" ON public.team_members
  FOR ALL USING (false); 