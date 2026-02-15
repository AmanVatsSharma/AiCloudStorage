import { redirect } from 'next/navigation';
import { Metadata } from 'next';

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
  title: 'Favorites - AI Cloud Storage',
  description: 'Your favorited files and folders for rapid access.',
};

type FavoriteEntry = {
  id: string;
  name: string;
  type: string;
  size: number;
  is_folder: boolean;
  updated_at: string;
};

export default async function FavoritesPage() {
  const traceId = `favorites-page_${Date.now()}`;
  const supabase = await createServerClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    logger.warn({
      traceId,
      scope: 'favorites-page',
      message: 'Missing session while opening favorites page.',
      data: { error: sessionError?.message },
    });
    redirect('/login');
  }

  const { data, error } = await supabase
    .from('files')
    .select('id, name, type, size, is_folder, updated_at')
    .eq('user_id', session.user.id)
    .eq('is_trashed', false)
    .eq('is_favorite', true)
    .order('updated_at', { ascending: false })
    .limit(100);

  if (error) {
    logger.error({
      traceId,
      scope: 'favorites-page',
      message: 'Failed to load favorite files.',
      data: { error: error.message, userId: session.user.id },
    });
  }

  const favorites = (data as FavoriteEntry[] | null) || [];

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Favorites</h1>
          <p className="text-muted-foreground mt-2">
            Fast access to your pinned files and folders.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Favorited Items</CardTitle>
            <CardDescription>{favorites.length} items</CardDescription>
          </CardHeader>
          <CardContent>
            {favorites.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6">
                No favorites yet. Mark frequently accessed files as favorites to surface them here.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Size</TableHead>
                    <TableHead className="text-right">Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {favorites.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.name}</TableCell>
                      <TableCell>{entry.is_folder ? 'Folder' : entry.type || 'Unknown'}</TableCell>
                      <TableCell className="text-right">
                        {entry.is_folder ? '-' : formatBytesCompact(entry.size)}
                      </TableCell>
                      <TableCell className="text-right">
                        {new Date(entry.updated_at).toLocaleString()}
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
