-- =============================================================================
-- Storage Policy Baseline Migration
-- Date: 2026-02-15
--
-- Purpose:
-- - Add per-user storage retention policy baseline.
-- - Enable policy-aware governance controls in settings UI.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.storage_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  retention_days INTEGER NOT NULL DEFAULT 30 CHECK (retention_days BETWEEN 1 AND 3650),
  permanent_delete_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.storage_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "storage_policies_select_own" ON public.storage_policies;
DROP POLICY IF EXISTS "storage_policies_insert_own" ON public.storage_policies;
DROP POLICY IF EXISTS "storage_policies_update_own" ON public.storage_policies;
DROP POLICY IF EXISTS "storage_policies_delete_own" ON public.storage_policies;

CREATE POLICY "storage_policies_select_own"
  ON public.storage_policies
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "storage_policies_insert_own"
  ON public.storage_policies
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "storage_policies_update_own"
  ON public.storage_policies
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "storage_policies_delete_own"
  ON public.storage_policies
  FOR DELETE
  USING (auth.uid() = user_id);
