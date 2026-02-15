'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { getUserErrorMessage } from '@/lib/errors';
import { useToast } from '@/components/ui/use-toast';
import { trackAuditEvent } from '@/lib/audit';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FiRotateCcw, FiTrash2 } from 'react-icons/fi';
import { formatRetentionCountdown, getPurgeEligibility } from '@/lib/storage/trash-policy';

type TrashedFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  path: string | null;
  is_folder: boolean;
  trashed_at: string | null;
  updated_at: string;
  created_at: string;
};

type StoragePolicy = {
  retention_days: number;
  permanent_delete_enabled: boolean;
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Trash manager implementing restore and permanent delete flows.
 */
export function TrashManager() {
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();
  const [traceId] = useState(() => `trash-manager_${Date.now()}`);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyFileId, setBusyFileId] = useState<string | null>(null);
  const [files, setFiles] = useState<TrashedFile[]>([]);
  const [policy, setPolicy] = useState<StoragePolicy>({
    retention_days: 30,
    permanent_delete_enabled: false,
  });

  const fetchTrashedFiles = useCallback(async (resolvedUserId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('files')
        .select('id, name, size, type, path, is_folder, trashed_at, updated_at, created_at')
        .eq('user_id', resolvedUserId)
        .eq('is_trashed', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setFiles((data as TrashedFile[]) || []);
      logger.info({
        traceId,
        scope: "trash-manager",
        message: "Fetched trashed items.",
        data: {
          userId: resolvedUserId,
          count: data?.length ?? 0,
        },
      });
    } catch (error: unknown) {
      logger.error({
        traceId,
        scope: "trash-manager",
        message: "Failed to fetch trashed items.",
        data: {
          userId: resolvedUserId,
          error: error instanceof Error ? error.message : error,
        },
      });
      toast({
        title: 'Unable to load trash',
        description: getUserErrorMessage(error, 'Failed to load trash contents.'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [supabase, toast, traceId]);

  const fetchStoragePolicy = useCallback(async (resolvedUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('storage_policies')
        .select('retention_days, permanent_delete_enabled')
        .eq('user_id', resolvedUserId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setPolicy(data);
      }
    } catch (error: unknown) {
      logger.warn({
        traceId,
        scope: 'trash-manager',
        message: 'Failed to load storage policy; using defaults.',
        data: {
          userId: resolvedUserId,
          error: error instanceof Error ? error.message : error,
        },
      });
    }
  }, [supabase, traceId]);

  useEffect(() => {
    const bootstrap = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        toast({
          title: 'Authentication required',
          description: 'Please sign in to access trash.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      setUserId(user.id);
      await Promise.all([fetchTrashedFiles(user.id), fetchStoragePolicy(user.id)]);
    };

    void bootstrap();
  }, [fetchStoragePolicy, fetchTrashedFiles, supabase, toast]);

  const handleRestore = async (file: TrashedFile) => {
    if (!userId) return;
    setBusyFileId(file.id);

    try {
      const { error } = await supabase
        .from('files')
        .update({
          is_trashed: false,
          trashed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', file.id)
        .eq('user_id', userId);

      if (error) throw error;

      await trackAuditEvent({
        action: 'file.trash.restore',
        resourceType: 'file',
        resourceId: file.id,
        details: {
          fileName: file.name,
          isFolder: file.is_folder,
        },
      });

      toast({
        title: 'Restored',
        description: `${file.name} was restored from trash.`,
      });
      await fetchTrashedFiles(userId);
    } catch (error: unknown) {
      logger.error({
        traceId,
        scope: "trash-manager",
        message: "Failed to restore trashed item.",
        data: {
          userId,
          fileId: file.id,
          error: error instanceof Error ? error.message : error,
        },
      });
      toast({
        title: 'Restore failed',
        description: getUserErrorMessage(error, 'Unable to restore item.'),
        variant: 'destructive',
      });
    } finally {
      setBusyFileId(null);
    }
  };

  const handlePermanentDelete = async (file: TrashedFile) => {
    if (!userId) return;

    if (!policy.permanent_delete_enabled) {
      toast({
        title: 'Policy restriction',
        description: 'Permanent delete is disabled by storage governance policy.',
        variant: 'destructive',
      });
      return;
    }

    const purgeEligibility = getPurgeEligibility(file.trashed_at, policy.retention_days);
    if (!purgeEligibility.eligible) {
      toast({
        title: 'Retention window active',
        description: `Permanent delete available on ${new Date(
          purgeEligibility.eligibleAt || Date.now()
        ).toLocaleString()}.`,
        variant: 'destructive',
      });
      return;
    }

    const confirmed = window.confirm(`Permanently delete "${file.name}"? This cannot be undone.`);
    if (!confirmed) return;
    setBusyFileId(file.id);

    try {
      if (!file.is_folder && file.path) {
        const { error: storageError } = await supabase.storage
          .from('files')
          .remove([file.path]);
        if (storageError) {
          logger.warn({
            traceId,
            scope: "trash-manager",
            message: "Storage remove failed during permanent delete; continuing with DB delete.",
            data: {
              userId,
              fileId: file.id,
              storageError: storageError.message,
            },
          });
        }
      }

      const { error } = await supabase
        .from('files')
        .delete()
        .eq('id', file.id)
        .eq('user_id', userId);

      if (error) throw error;

      await trackAuditEvent({
        action: 'file.trash.delete_permanent',
        resourceType: 'file',
        resourceId: file.id,
        details: {
          fileName: file.name,
          isFolder: file.is_folder,
        },
      });

      toast({
        title: 'Deleted permanently',
        description: `${file.name} has been permanently deleted.`,
      });
      await fetchTrashedFiles(userId);
    } catch (error: unknown) {
      logger.error({
        traceId,
        scope: "trash-manager",
        message: "Permanent delete failed.",
        data: {
          userId,
          fileId: file.id,
          error: error instanceof Error ? error.message : error,
        },
      });
      toast({
        title: 'Delete failed',
        description: getUserErrorMessage(error, 'Unable to permanently delete item.'),
        variant: 'destructive',
      });
    } finally {
      setBusyFileId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trash Contents</CardTitle>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Retention window: {policy.retention_days} days</span>
          <Badge variant={policy.permanent_delete_enabled ? 'secondary' : 'outline'}>
            Permanent delete {policy.permanent_delete_enabled ? 'enabled' : 'disabled'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground py-6">Loading trashed items...</p>
        ) : files.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6">Trash is empty.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Deleted At</TableHead>
                <TableHead>Purge Eligibility</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => {
                const purgeEligibility = getPurgeEligibility(file.trashed_at, policy.retention_days);
                const deleteDisabled =
                  busyFileId === file.id ||
                  !policy.permanent_delete_enabled ||
                  !purgeEligibility.eligible;

                return (
                  <TableRow key={file.id}>
                    <TableCell>{file.name}</TableCell>
                    <TableCell>{file.is_folder ? 'Folder' : (file.type || 'Unknown')}</TableCell>
                    <TableCell>{file.is_folder ? '-' : formatBytes(file.size)}</TableCell>
                    <TableCell>
                      {new Date(file.trashed_at || file.updated_at || file.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <span
                        className={purgeEligibility.eligible ? 'text-green-600 font-medium' : 'text-muted-foreground'}
                      >
                        {formatRetentionCountdown(purgeEligibility.remainingMs)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyFileId === file.id}
                          onClick={() => void handleRestore(file)}
                        >
                          <FiRotateCcw className="h-4 w-4 mr-1" />
                          Restore
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={deleteDisabled}
                          onClick={() => void handlePermanentDelete(file)}
                        >
                          <FiTrash2 className="h-4 w-4 mr-1" />
                          Delete Permanently
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
