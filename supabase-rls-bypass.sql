-- WARNING: Use this only for development/testing purposes
-- This creates policies that allow all operations for authenticated users
-- Remove or replace with proper policies before going to production

-- Create bypass policies for all tables
CREATE POLICY "Temporary full access to profiles for authenticated users"
  ON public.profiles
  FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Temporary full access to files for authenticated users"
  ON public.files
  FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Temporary full access to file_versions for authenticated users"
  ON public.file_versions
  FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Temporary full access to shared_files for authenticated users"
  ON public.shared_files
  FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Temporary full access to tags for authenticated users"
  ON public.tags
  FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Temporary full access to file_tags for authenticated users"
  ON public.file_tags
  FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Temporary full access to teams for authenticated users"
  ON public.teams
  FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Temporary full access to team_members for authenticated users"
  ON public.team_members
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Optional: Completely disable RLS (use with extreme caution, only for local development)
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.files DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.file_versions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.shared_files DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.tags DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.file_tags DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.team_members DISABLE ROW LEVEL SECURITY; 