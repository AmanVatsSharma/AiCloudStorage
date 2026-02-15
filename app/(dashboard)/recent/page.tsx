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
import { createServerClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { formatBytesCompact } from '@/lib/analytics/storage-metrics';

export const metadata: Metadata = {
  title: 'Recent - AI Cloud Storage',
  description: 'Recent file and folder activity for your account.',
};

type RecentEntry = {
  id: string;
  name: string;
  type: string;
  size: number;
  is_folder: boolean;
  updated_at: string;
  created_at: string;
};

export default async function RecentPage() {
  const traceId = `recent-page_${Date.now()}`;
  const supabase = await createServerClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    logger.warn({
      traceId,
      scope: 'recent-page',
      message: 'Missing session while opening recent page.',
      data: { error: sessionError?.message },
    });
    redirect('/login');
  }

  const { data, error } = await supabase
    .from('files')
    .select('id, name, type, size, is_folder, updated_at, created_at')
    .eq('user_id', session.user.id)
    .eq('is_trashed', false)
    .order('updated_at', { ascending: false })
    .limit(100);

  if (error) {
    logger.error({
      traceId,
      scope: 'recent-page',
      message: 'Failed to load recent files.',
      data: { error: error.message, userId: session.user.id },
    });
  }

  const recentEntries = (data as RecentEntry[] | null) || [];

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recent</h1>
          <p className="text-muted-foreground mt-2">
            Most recently updated files and folders in your workspace.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>{recentEntries.length} recent records</CardDescription>
          </CardHeader>
          <CardContent>
            {recentEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6">
                No recent activity yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Size</TableHead>
                    <TableHead className="text-right">Updated</TableHead>
                    <TableHead className="text-right">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.name}</TableCell>
                      <TableCell>{entry.is_folder ? 'Folder' : entry.type || 'Unknown'}</TableCell>
                      <TableCell className="text-right">
                        {entry.is_folder ? '-' : formatBytesCompact(entry.size)}
                      </TableCell>
                      <TableCell className="text-right">
                        {new Date(entry.updated_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {new Date(entry.created_at).toLocaleString()}
                      </TableCell>
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
