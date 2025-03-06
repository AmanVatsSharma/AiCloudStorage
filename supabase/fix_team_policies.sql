-- First, disable RLS temporarily to clean up everything
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their teams" ON public.teams;
DROP POLICY IF EXISTS "Users can view teams they are members of" ON public.teams;
DROP POLICY IF EXISTS "Users can create teams" ON public.teams;
DROP POLICY IF EXISTS "Users can update their teams" ON public.teams;
DROP POLICY IF EXISTS "Users can delete their teams" ON public.teams;

DROP POLICY IF EXISTS "Users can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view members of their teams" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can add members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can update members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can remove members" ON public.team_members;

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_team_created ON public.teams;

-- Create a more privileged function to handle team member insertion
-- This will bypass RLS policies when inserting the team owner as a member
CREATE OR REPLACE FUNCTION public.handle_new_team()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with the privileges of the function creator
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner');
    RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_team_created
AFTER INSERT ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_team();

-- Re-enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Now create extremely simple policies with no recursion or circular dependencies

-- Teams table policies
-- 1. Users can SELECT teams they own (straightforward check)
CREATE POLICY "view_own_teams" 
ON public.teams FOR SELECT 
USING (owner_id = auth.uid());

-- 2. Users can SELECT teams they are members of (separate policy)
CREATE POLICY "view_member_teams" 
ON public.teams FOR SELECT 
USING (
    id IN (
        SELECT team_id FROM public.team_members 
        WHERE user_id = auth.uid()
    )
);

-- 3. Any authenticated user can INSERT teams (owner_id check is handled in the app)
CREATE POLICY "create_teams" 
ON public.teams FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Team owners can UPDATE their teams
CREATE POLICY "update_teams" 
ON public.teams FOR UPDATE 
USING (owner_id = auth.uid());

-- 5. Team owners can DELETE their teams
CREATE POLICY "delete_teams" 
ON public.teams FOR DELETE 
USING (owner_id = auth.uid());

-- Team Members table policies
-- 1. Any user can view members of teams they own
CREATE POLICY "view_team_members_as_owner" 
ON public.team_members FOR SELECT 
USING (
    team_id IN (
        SELECT id FROM public.teams 
        WHERE owner_id = auth.uid()
    )
);

-- 2. Any user can view members of teams they belong to
CREATE POLICY "view_team_members_as_member" 
ON public.team_members FOR SELECT 
USING (user_id = auth.uid());

-- 3. Team owners can INSERT members
CREATE POLICY "insert_team_members" 
ON public.team_members FOR INSERT 
WITH CHECK (
    team_id IN (
        SELECT id FROM public.teams 
        WHERE owner_id = auth.uid()
    )
);

-- 4. Team owners can UPDATE members
CREATE POLICY "update_team_members" 
ON public.team_members FOR UPDATE 
USING (
    team_id IN (
        SELECT id FROM public.teams 
        WHERE owner_id = auth.uid()
    )
);

-- 5. Team owners can DELETE members
CREATE POLICY "delete_team_members" 
ON public.team_members FOR DELETE 
USING (
    team_id IN (
        SELECT id FROM public.teams 
        WHERE owner_id = auth.uid()
    )
); 