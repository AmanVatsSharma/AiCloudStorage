-- =============================================================================
-- Audit Events Foundation Migration
-- Date: 2026-02-15
--
-- Purpose:
-- - Create immutable audit trail table for critical user and admin actions.
-- - Add RLS policies for safe event visibility.
-- - Provide RPC function for standardized event insertion.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  team_id UUID NULL REFERENCES public.teams(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NULL,
  resource_id TEXT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address INET NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.audit_events IS 'Immutable enterprise audit log for user/admin actions.';
COMMENT ON COLUMN public.audit_events.action IS 'Action identifier (e.g., team.create, file.share.create).';
COMMENT ON COLUMN public.audit_events.details IS 'Structured context payload without secrets.';

CREATE INDEX IF NOT EXISTS idx_audit_events_actor_id ON public.audit_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_team_id ON public.audit_events(team_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_action ON public.audit_events(action);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at_desc ON public.audit_events(created_at DESC);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_events_select_actor_or_team_owner" ON public.audit_events;
DROP POLICY IF EXISTS "audit_events_insert_actor_only" ON public.audit_events;

CREATE POLICY "audit_events_select_actor_or_team_owner"
  ON public.audit_events
  FOR SELECT
  USING (
    actor_id = auth.uid()
    OR (
      team_id IS NOT NULL
      AND public.is_team_owner(team_id, auth.uid())
    )
  );

CREATE POLICY "audit_events_insert_actor_only"
  ON public.audit_events
  FOR INSERT
  WITH CHECK (actor_id = auth.uid());

CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'success',
  p_details JSONB DEFAULT '{}'::jsonb,
  p_team_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
  v_event_id UUID;
BEGIN
  v_actor_id := auth.uid();

  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated users cannot write audit events';
  END IF;

  INSERT INTO public.audit_events (
    actor_id,
    team_id,
    action,
    resource_type,
    resource_id,
    status,
    details,
    ip_address,
    user_agent
  )
  VALUES (
    v_actor_id,
    p_team_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_status,
    COALESCE(p_details, '{}'::jsonb),
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_audit_event(
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  JSONB,
  UUID,
  INET,
  TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.log_audit_event(
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  JSONB,
  UUID,
  INET,
  TEXT
) TO authenticated;
