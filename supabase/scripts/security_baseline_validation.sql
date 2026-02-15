-- =============================================================================
-- Security Baseline Validation Script
-- Usage:
--   Run in Supabase SQL editor or psql against staging/production after applying
--   security migrations. Review all result sets and confirm expected PASS rows.
-- =============================================================================

-- 1) Verify RLS is enabled for critical tables.
WITH required_tables AS (
  SELECT unnest(ARRAY[
    'profiles',
    'files',
    'file_versions',
    'shared_files',
    'tags',
    'file_tags',
    'teams',
    'team_members',
    'organizations',
    'organization_members',
    'organization_invitations'
  ]) AS table_name
),
rls_state AS (
  SELECT
    c.relname AS table_name,
    c.relrowsecurity AS rls_enabled
  FROM pg_class c
  JOIN pg_namespace n
    ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN (SELECT table_name FROM required_tables)
)
SELECT
  rt.table_name,
  COALESCE(rs.rls_enabled, false) AS rls_enabled,
  CASE WHEN COALESCE(rs.rls_enabled, false) THEN 'PASS' ELSE 'FAIL' END AS result
FROM required_tables rt
LEFT JOIN rls_state rs
  ON rs.table_name = rt.table_name
ORDER BY rt.table_name;

-- 2) Verify helper authorization functions exist.
SELECT
  p.proname AS function_name,
  CASE WHEN p.proname IS NOT NULL THEN 'PASS' ELSE 'FAIL' END AS result
FROM (
  SELECT unnest(ARRAY[
    'is_team_owner',
    'is_team_member',
    'is_org_owner',
    'is_org_member',
    'is_org_admin',
    'log_audit_event'
  ]) AS expected_function
) expected
LEFT JOIN pg_proc p
  ON p.proname = expected.expected_function
LEFT JOIN pg_namespace n
  ON n.oid = p.pronamespace
WHERE n.nspname = 'public' OR n.nspname IS NULL
ORDER BY expected.expected_function;

-- 3) Ensure temporary permissive policies are absent.
WITH forbidden_policies AS (
  SELECT unnest(ARRAY[
    'Temporary full access to profiles for authenticated users',
    'Temporary full access to files for authenticated users',
    'Temporary full access to file_versions for authenticated users',
    'Temporary full access to shared_files for authenticated users',
    'Temporary full access to tags for authenticated users',
    'Temporary full access to file_tags for authenticated users',
    'Temporary full access to teams for authenticated users',
    'Temporary full access to team_members for authenticated users',
    'Temporary full access to files bucket for authenticated users'
  ]) AS policy_name
)
SELECT
  fp.policy_name,
  CASE WHEN pol.policyname IS NULL THEN 'PASS' ELSE 'FAIL' END AS result
FROM forbidden_policies fp
LEFT JOIN pg_policies pol
  ON pol.policyname = fp.policy_name
ORDER BY fp.policy_name;

-- 4) Check storage prefix policy exists for files bucket.
SELECT
  policyname,
  tablename,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname IN (
    'storage_objects_select_own_prefix',
    'storage_objects_insert_own_prefix',
    'storage_objects_update_own_prefix',
    'storage_objects_delete_own_prefix'
  )
ORDER BY policyname;
