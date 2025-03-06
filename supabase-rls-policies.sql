-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Policy for profiles: users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy for profiles: users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy for files: users can view their own files
CREATE POLICY "Users can view own files"
  ON public.files
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy for files: users can insert their own files
CREATE POLICY "Users can insert own files"
  ON public.files
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy for files: users can update their own files
CREATE POLICY "Users can update own files"
  ON public.files
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy for files: users can delete their own files
CREATE POLICY "Users can delete own files"
  ON public.files
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy for viewing shared files (files shared with the user)
CREATE POLICY "Users can view files shared with them"
  ON public.files
  FOR SELECT
  USING (id IN (
    SELECT file_id FROM public.shared_files WHERE shared_with = auth.uid()
  ));

-- Policy for file_versions: users can access versions of files they own
CREATE POLICY "Users can access versions of own files"
  ON public.file_versions
  FOR ALL
  USING (file_id IN (
    SELECT id FROM public.files WHERE user_id = auth.uid()
  ));

-- Policy for shared_files: users can see files shared by them or with them
CREATE POLICY "Users can see files shared by them or with them"
  ON public.shared_files
  FOR SELECT
  USING (owner_id = auth.uid() OR shared_with = auth.uid());

-- Policy for shared_files: users can insert new shares for files they own
CREATE POLICY "Users can share their own files"
  ON public.shared_files
  FOR INSERT
  WITH CHECK (owner_id = auth.uid() AND 
    file_id IN (SELECT id FROM public.files WHERE user_id = auth.uid()));

-- Policy for shared_files: users can delete shares they created
CREATE POLICY "Users can delete their own shares"
  ON public.shared_files
  FOR DELETE
  USING (owner_id = auth.uid());

-- Policy for tags: users can see their own tags
CREATE POLICY "Users can see own tags"
  ON public.tags
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy for tags: users can insert their own tags
CREATE POLICY "Users can insert own tags"
  ON public.tags
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy for tags: users can update their own tags
CREATE POLICY "Users can update own tags"
  ON public.tags
  FOR UPDATE
  USING (user_id = auth.uid());

-- Policy for tags: users can delete their own tags
CREATE POLICY "Users can delete own tags"
  ON public.tags
  FOR DELETE
  USING (user_id = auth.uid());

-- Policy for file_tags: users can see tags for their files
CREATE POLICY "Users can see tags for their files"
  ON public.file_tags
  FOR SELECT
  USING (file_id IN (
    SELECT id FROM public.files WHERE user_id = auth.uid()
  ));

-- Policy for file_tags: users can insert tags for their files
CREATE POLICY "Users can insert tags for their files"
  ON public.file_tags
  FOR INSERT
  WITH CHECK (file_id IN (
    SELECT id FROM public.files WHERE user_id = auth.uid()
  ));

-- Policy for file_tags: users can delete tags for their files
CREATE POLICY "Users can delete tags for their files"
  ON public.file_tags
  FOR DELETE
  USING (file_id IN (
    SELECT id FROM public.files WHERE user_id = auth.uid()
  ));

-- Policy for teams: users can see teams they are in
CREATE POLICY "Users can see teams they are in"
  ON public.teams
  FOR SELECT
  USING (id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  ) OR owner_id = auth.uid());

-- Policy for teams: users can create their own teams
CREATE POLICY "Users can create own teams"
  ON public.teams
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Policy for teams: only owners can update their teams
CREATE POLICY "Only owners can update their teams"
  ON public.teams
  FOR UPDATE
  USING (owner_id = auth.uid());

-- Policy for teams: only owners can delete their teams
CREATE POLICY "Only owners can delete their teams"
  ON public.teams
  FOR DELETE
  USING (owner_id = auth.uid());

-- Policy for team_members: users can see members of teams they are in
CREATE POLICY "Users can see members of teams they are in"
  ON public.team_members
  FOR SELECT
  USING (team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  ) OR team_id IN (
    SELECT id FROM public.teams WHERE owner_id = auth.uid()
  ));

-- Policy for team_members: team owners can add members
CREATE POLICY "Team owners can add members"
  ON public.team_members
  FOR INSERT
  WITH CHECK (team_id IN (
    SELECT id FROM public.teams WHERE owner_id = auth.uid()
  ));

-- Policy for team_members: team owners can update members
CREATE POLICY "Team owners can update members"
  ON public.team_members
  FOR UPDATE
  USING (team_id IN (
    SELECT id FROM public.teams WHERE owner_id = auth.uid()
  ));

-- Policy for team_members: team owners can remove members
CREATE POLICY "Team owners can remove members"
  ON public.team_members
  FOR DELETE
  USING (team_id IN (
    SELECT id FROM public.teams WHERE owner_id = auth.uid()
  )); 