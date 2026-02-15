import { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { createServerClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export const metadata: Metadata = {
  title: 'Shared - AI Cloud Storage',
  description: 'Manage active shared links and recipient access posture.',
};

type SharedLinkEntry = {
  id: string;
  file_id: string;
  shared_with: string | null;
  is_public: boolean;
  expires_at: string | null;
  allow_download: boolean;
  access_level: string;
  created_at: string;
};

type SharedFileLookup = {
  id: string;
  name: string;
};

export default async function SharedPage() {
  const traceId = `shared-page_${Date.now()}`;
  const supabase = await createServerClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    logger.warn({
      traceId,
      scope: 'shared-page',
      message: 'Missing session while opening shared links page.',
      data: { error: sessionError?.message },
    });
    redirect('/login');
  }

  const { data, error } = await supabase
    .from('shared_files')
    .select('id, file_id, shared_with, is_public, expires_at, allow_download, access_level, created_at')
    .eq('owner_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    logger.error({
      traceId,
      scope: 'shared-page',
      message: 'Failed to load shared links.',
      data: { error: error.message, userId: session.user.id },
    });
  }

  const sharedLinks = (data as SharedLinkEntry[] | null) || [];
  const fileIds = Array.from(new Set(sharedLinks.map((item) => item.file_id)));

  const fileNames = new Map<string, string>();
  if (fileIds.length > 0) {
    const { data: fileRows, error: fileError } = await supabase
      .from('files')
      .select('id, name')
      .in('id', fileIds);

    if (fileError) {
      logger.warn({
        traceId,
        scope: 'shared-page',
        message: 'Unable to resolve file names for shared links.',
        data: { error: fileError.message, fileIdsCount: fileIds.length },
      });
    } else {
      for (const row of (fileRows as SharedFileLookup[] | null) || []) {
        fileNames.set(row.id, row.name);
      }
    }
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shared Files</h1>
          <p className="text-muted-foreground mt-2">
            Review and govern all share links created from your account.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Active Share Links</CardTitle>
            <CardDescription>{sharedLinks.length} shared records</CardDescription>
          </CardHeader>
          <CardContent>
            {sharedLinks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6">
                No shared links yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Access</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Download</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sharedLinks.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {fileNames.get(entry.file_id) || `File ${entry.file_id.slice(0, 8)}`}
                      </TableCell>
                      <TableCell>
                        <Badge variant={entry.is_public ? 'destructive' : 'secondary'}>
                          {entry.is_public ? 'Public' : entry.access_level}
                        </Badge>
                      </TableCell>
                      <TableCell>{entry.shared_with || (entry.is_public ? 'Public link' : 'N/A')}</TableCell>
                      <TableCell>{entry.allow_download ? 'Allowed' : 'Blocked'}</TableCell>
                      <TableCell>
                        {entry.expires_at ? new Date(entry.expires_at).toLocaleString() : 'No expiry'}
                      </TableCell>
                      <TableCell className="text-right">{new Date(entry.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
