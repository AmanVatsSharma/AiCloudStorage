'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';
import { getUserErrorMessage } from '@/lib/errors';
import { useToast } from '@/components/ui/use-toast';
import { trackAuditEvent } from '@/lib/audit';

interface StoragePolicyFormProps {
  userId: string;
}

/**
 * Baseline retention policy settings for storage governance.
 */
export function StoragePolicyForm({ userId }: StoragePolicyFormProps) {
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();
  const [traceId] = useState(() => `storage-policy-form_${Date.now()}`);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [retentionDays, setRetentionDays] = useState(30);
  const [permanentDeleteEnabled, setPermanentDeleteEnabled] = useState(false);

  useEffect(() => {
    const fetchPolicy = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('storage_policies')
          .select('retention_days, permanent_delete_enabled')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setRetentionDays(data.retention_days);
          setPermanentDeleteEnabled(data.permanent_delete_enabled);
        }
      } catch (error: unknown) {
        logger.error({
          traceId,
          scope: 'storage-policy-form',
          message: 'Failed to fetch storage policy.',
          data: {
            userId,
            error: error instanceof Error ? error.message : error,
          },
        });
        toast({
          title: 'Unable to load policy',
          description: getUserErrorMessage(error, 'Please try again.'),
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    void fetchPolicy();
  }, [supabase, toast, traceId, userId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const boundedRetention = Math.max(1, Math.min(retentionDays, 3650));
      const payload = {
        user_id: userId,
        retention_days: boundedRetention,
        permanent_delete_enabled: permanentDeleteEnabled,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('storage_policies')
        .upsert(payload, { onConflict: 'user_id' });

      if (error) throw error;

      await trackAuditEvent({
        action: 'storage.policy.update',
        resourceType: 'storage_policy',
        resourceId: userId,
        details: {
          retentionDays: boundedRetention,
          permanentDeleteEnabled,
        },
      });

      toast({
        title: 'Policy updated',
        description: 'Storage retention policy has been saved.',
      });
    } catch (error: unknown) {
      logger.error({
        traceId,
        scope: 'storage-policy-form',
        message: 'Failed to save storage policy.',
        data: {
          userId,
          retentionDays,
          permanentDeleteEnabled,
          error: error instanceof Error ? error.message : error,
        },
      });
      toast({
        title: 'Unable to save policy',
        description: getUserErrorMessage(error, 'Please try again.'),
        variant: 'destructive',
      });
      await trackAuditEvent({
        action: 'storage.policy.update',
        resourceType: 'storage_policy',
        resourceId: userId,
        status: 'failure',
        details: {
          retentionDays,
          permanentDeleteEnabled,
          reason: error instanceof Error ? error.message : String(error),
        },
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Storage Governance Policy</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading policy...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="retention-days">Retention days before permanent deletion</Label>
              <Input
                id="retention-days"
                type="number"
                min={1}
                max={3650}
                value={retentionDays}
                onChange={(event) => setRetentionDays(Number(event.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Recommended enterprise default: 30-90 days depending on compliance requirements.
              </p>
            </div>

            <div className="flex items-center justify-between border rounded-lg p-4">
              <div>
                <Label htmlFor="allow-permanent-delete">Allow permanent delete in UI</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  When disabled, users can restore only; permanent deletion can be restricted to policy admins.
                </p>
              </div>
              <Switch
                id="allow-permanent-delete"
                checked={permanentDeleteEnabled}
                onCheckedChange={setPermanentDeleteEnabled}
              />
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? 'Saving policy...' : 'Save policy'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
