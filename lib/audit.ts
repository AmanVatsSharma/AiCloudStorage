import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

type AuditStatus = 'success' | 'failure';

interface TrackAuditEventInput {
  action: string;
  resourceType?: string;
  resourceId?: string;
  status?: AuditStatus;
  details?: Record<string, unknown>;
  teamId?: string | null;
}

/**
 * Best-effort audit event tracker.
 * This should never block user flows.
 */
export async function trackAuditEvent({
  action,
  resourceType,
  resourceId,
  status = 'success',
  details = {},
  teamId = null,
}: TrackAuditEventInput): Promise<void> {
  const traceId = `audit_${Date.now()}`;

  try {
    const supabase = createClient();
    const { error } = await supabase.rpc('log_audit_event', {
      p_action: action,
      p_resource_type: resourceType ?? null,
      p_resource_id: resourceId ?? null,
      p_status: status,
      p_details: details,
      p_team_id: teamId,
      p_ip_address: null,
      p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    });

    if (error) {
      throw error;
    }

    logger.info({
      traceId,
      scope: "audit-tracker",
      message: "Audit event persisted.",
      data: {
        action,
        resourceType,
        resourceId,
        status,
      },
    });
  } catch (error: unknown) {
    logger.warn({
      traceId,
      scope: "audit-tracker",
      message: "Audit event persistence failed; continuing without blocking UX.",
      data: {
        action,
        resourceType,
        resourceId,
        status,
        error: error instanceof Error ? error.message : error,
      },
    });
  }
}
