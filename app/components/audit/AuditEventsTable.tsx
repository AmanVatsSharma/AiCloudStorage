'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { getUserErrorMessage } from '@/lib/errors';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';

type AuditEvent = {
  id: string;
  actor_id: string;
  team_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  status: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

/**
 * Enterprise audit events table with lightweight filtering.
 */
export function AuditEventsTable() {
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();
  const [traceId] = useState(() => `audit-events-table_${Date.now()}`);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchAuditEvents = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_events')
        .select('id, actor_id, team_id, action, resource_type, resource_id, status, details, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (actionFilter.trim()) {
        query = query.ilike('action', `%${actionFilter.trim()}%`);
      }

      if (statusFilter.trim()) {
        query = query.ilike('status', `%${statusFilter.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      setEvents((data as AuditEvent[]) || []);
      logger.info({
        traceId,
        scope: "audit-events-table",
        message: "Fetched audit events.",
        data: {
          count: data?.length ?? 0,
          actionFilter,
          statusFilter,
        },
      });
    } catch (error: unknown) {
      logger.error({
        traceId,
        scope: "audit-events-table",
        message: "Failed to fetch audit events.",
        data: {
          actionFilter,
          statusFilter,
          error: error instanceof Error ? error.message : error,
        },
      });
      toast({
        title: 'Audit events unavailable',
        description: getUserErrorMessage(error, 'Unable to load audit events.'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [actionFilter, statusFilter, supabase, toast, traceId]);

  useEffect(() => {
    void fetchAuditEvents();
  }, [fetchAuditEvents]);

  const formatDate = (value: string) => {
    return new Date(value).toLocaleString();
  };

  const statusVariant = (status: string): 'default' | 'destructive' | 'secondary' => {
    const normalized = status.toLowerCase();
    if (normalized === 'failure') return 'destructive';
    if (normalized === 'success') return 'default';
    return 'secondary';
  };

  return (
    <Card>
      <CardHeader className="space-y-4">
        <CardTitle>Audit Events</CardTitle>
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            placeholder="Filter by action (e.g. team.create)"
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
          />
          <Input
            placeholder="Filter by status (success/failure)"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          />
          <Button variant="outline" onClick={() => void fetchAuditEvents()} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground py-6">Loading audit events...</div>
        ) : events.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6">No audit events found for current filters.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Actor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(event.created_at)}</TableCell>
                  <TableCell className="font-mono text-xs">{event.action}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(event.status)}>{event.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {event.resource_type || 'n/a'}{event.resource_id ? `:${event.resource_id}` : ''}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{event.actor_id}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
