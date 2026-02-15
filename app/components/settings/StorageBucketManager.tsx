'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';
import { getUserErrorMessage } from '@/lib/errors';
import { parseMimeTypeList, validateBucketName } from '@/lib/storage/buckets';

interface StorageBucketRecord {
  id: string;
  name: string;
  public: boolean;
  fileSizeLimit: number | null;
  allowedMimeTypes: string[];
  createdAt: string;
  updatedAt: string;
}

function formatByteLimit(limit: number | null): string {
  if (!limit) return 'No limit';
  const mb = limit / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(0)} MB`;
}

/**
 * Storage bucket management UI for account admins.
 */
export function StorageBucketManager() {
  const [traceId] = useState(() => `storage-bucket-manager_${Date.now()}`);
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [buckets, setBuckets] = useState<StorageBucketRecord[]>([]);
  const [bucketName, setBucketName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [fileSizeLimitMb, setFileSizeLimitMb] = useState('50');
  const [mimeList, setMimeList] = useState('image/png, image/jpeg, application/pdf');
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchBuckets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/storage/buckets', {
        method: 'GET',
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to fetch buckets.');
      }
      setBuckets((payload.buckets as StorageBucketRecord[]) || []);
      setApiError(null);
      console.info('settings-bucket-debug: fetched buckets', {
        count: payload.buckets?.length ?? 0,
      });
    } catch (error: unknown) {
      const errorMessage = getUserErrorMessage(error, 'Unable to fetch storage buckets.');
      logger.error({
        traceId,
        scope: 'storage-bucket-manager',
        message: 'Failed to fetch buckets.',
        data: {
          error: error instanceof Error ? error.message : error,
        },
      });
      setApiError(errorMessage);
      toast({
        title: 'Bucket management unavailable',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, traceId]);

  useEffect(() => {
    void fetchBuckets();
  }, [fetchBuckets]);

  const fileSizeLimitBytes = useMemo(() => {
    const numericMb = Number.parseInt(fileSizeLimitMb, 10);
    if (!Number.isFinite(numericMb) || numericMb <= 0) return null;
    return numericMb * 1024 * 1024;
  }, [fileSizeLimitMb]);

  const handleCreateBucket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validation = validateBucketName(bucketName);
    if (!validation.valid) {
      toast({
        title: 'Invalid bucket name',
        description: validation.reason,
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/storage/buckets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: validation.normalizedName,
          public: isPublic,
          fileSizeLimit: fileSizeLimitBytes,
          allowedMimeTypes: parseMimeTypeList(mimeList),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to create bucket.');
      }

      console.info('settings-bucket-debug: bucket created', {
        bucketName: validation.normalizedName,
      });
      toast({
        title: 'Bucket created',
        description: `Bucket "${validation.normalizedName}" is ready.`,
      });

      setBucketName('');
      await fetchBuckets();
    } catch (error: unknown) {
      logger.error({
        traceId,
        scope: 'storage-bucket-manager',
        message: 'Failed to create bucket.',
        data: {
          bucketName,
          error: error instanceof Error ? error.message : error,
        },
      });
      toast({
        title: 'Bucket creation failed',
        description: getUserErrorMessage(error, 'Please verify storage admin configuration.'),
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Storage Buckets</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleCreateBucket} className="space-y-4 border rounded-lg p-4">
          <div className="space-y-2">
            <Label htmlFor="bucket-name">Bucket name</Label>
            <Input
              id="bucket-name"
              value={bucketName}
              onChange={(event) => setBucketName(event.target.value)}
              placeholder="team-documents"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bucket-size-limit">File size limit (MB)</Label>
            <Input
              id="bucket-size-limit"
              type="number"
              min={1}
              max={10240}
              value={fileSizeLimitMb}
              onChange={(event) => setFileSizeLimitMb(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bucket-mime-list">Allowed MIME types (comma separated)</Label>
            <Input
              id="bucket-mime-list"
              value={mimeList}
              onChange={(event) => setMimeList(event.target.value)}
              placeholder="image/png, application/pdf"
            />
          </div>

          <div className="flex items-center justify-between border rounded-lg p-3">
            <div>
              <Label htmlFor="bucket-public">Public bucket</Label>
              <p className="text-xs text-muted-foreground">Public buckets allow unauthenticated object reads.</p>
            </div>
            <Switch id="bucket-public" checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          <Button type="submit" disabled={creating}>
            {creating ? 'Creating bucket...' : 'Create bucket'}
          </Button>
        </form>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading buckets...</p>
        ) : apiError ? (
          <p className="text-sm text-destructive">{apiError}</p>
        ) : buckets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No buckets found.</p>
        ) : (
          <div className="space-y-3">
            {buckets.map((bucket) => (
              <div key={bucket.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{bucket.name}</p>
                  <Badge variant={bucket.public ? 'destructive' : 'secondary'}>
                    {bucket.public ? 'Public' : 'Private'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Limit: {formatByteLimit(bucket.fileSizeLimit)} · MIME rules: {bucket.allowedMimeTypes.length || 'none'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Created {new Date(bucket.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
