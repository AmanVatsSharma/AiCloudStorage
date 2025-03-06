-- Create teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(team_id, user_id)
);

-- Create RLS policies for teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Safely create policies (only if they don't exist)
DO $$
BEGIN
    -- Teams policies
    IF NOT EXISTS (
        SELECT FROM pg_policies WHERE tablename = 'teams' AND policyname = 'Users can view their teams'
    ) THEN
        CREATE POLICY "Users can view their teams" ON public.teams
        FOR SELECT USING (
            auth.uid() = owner_id OR 
            EXISTS (
                SELECT 1 FROM public.team_members 
                WHERE team_id = public.teams.id AND user_id = auth.uid()
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT FROM pg_policies WHERE tablename = 'teams' AND policyname = 'Users can create teams'
    ) THEN
        CREATE POLICY "Users can create teams" ON public.teams
        FOR INSERT WITH CHECK (auth.uid() = owner_id);
    END IF;

    IF NOT EXISTS (
        SELECT FROM pg_policies WHERE tablename = 'teams' AND policyname = 'Users can update their teams'
    ) THEN
        CREATE POLICY "Users can update their teams" ON public.teams
        FOR UPDATE USING (auth.uid() = owner_id);
    END IF;

    IF NOT EXISTS (
        SELECT FROM pg_policies WHERE tablename = 'teams' AND policyname = 'Users can delete their teams'
    ) THEN
        CREATE POLICY "Users can delete their teams" ON public.teams
        FOR DELETE USING (auth.uid() = owner_id);
    END IF;

    -- Team members policies
    ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
        SELECT FROM pg_policies WHERE tablename = 'team_members' AND policyname = 'Users can view team members'
    ) THEN
        CREATE POLICY "Users can view team members" ON public.team_members
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.teams 
                WHERE id = public.team_members.team_id AND owner_id = auth.uid()
            ) OR 
            EXISTS (
                SELECT 1 FROM public.team_members AS tm
                WHERE tm.team_id = public.team_members.team_id AND tm.user_id = auth.uid()
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT FROM pg_policies WHERE tablename = 'team_members' AND policyname = 'Team owners can add members'
    ) THEN
        CREATE POLICY "Team owners can add members" ON public.team_members
        FOR INSERT WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.teams 
                WHERE id = public.team_members.team_id AND owner_id = auth.uid()
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT FROM pg_policies WHERE tablename = 'team_members' AND policyname = 'Team owners can update members'
    ) THEN
        CREATE POLICY "Team owners can update members" ON public.team_members
        FOR UPDATE USING (
            EXISTS (
                SELECT 1 FROM public.teams 
                WHERE id = public.team_members.team_id AND owner_id = auth.uid()
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT FROM pg_policies WHERE tablename = 'team_members' AND policyname = 'Team owners can remove members'
    ) THEN
        CREATE POLICY "Team owners can remove members" ON public.team_members
        FOR DELETE USING (
            EXISTS (
                SELECT 1 FROM public.teams 
                WHERE id = public.team_members.team_id AND owner_id = auth.uid()
            )
        );
    END IF;
END
$$;

-- Create function to automatically add owner as team member if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_new_team()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'on_team_created'
    ) THEN
        CREATE TRIGGER on_team_created
        AFTER INSERT ON public.teams
        FOR EACH ROW
        EXECUTE PROCEDURE public.handle_new_team();
    END IF;
END
$$; 