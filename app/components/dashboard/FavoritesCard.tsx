'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FiStar, FiFolder, FiFile } from 'react-icons/fi';
import Link from 'next/link';
import { isValidUUID } from '@/lib/utils';

interface FavoriteItem {
  id: string;
  file_id: string;
  user_id: string;
  file: {
    id: string;
    name: string;
    type: string;
    is_folder: boolean;
    size: number;
  };
}

interface FavoritesCardProps {
  userId: string;
  className?: string;
}

export function FavoritesCard({ userId, className = '' }: FavoritesCardProps) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function fetchFavorites() {
      if (!isValidUUID(userId)) {
        console.error("Favorites: Invalid UUID format for user ID:", userId);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Check if files table exists
        const { error: tableCheckError } = await supabase
          .from('files')
          .select('id')
          .limit(1);

        if (tableCheckError && tableCheckError.code === 'PGRST116') {
          // Table doesn't exist yet, just show empty state
          console.info("Files table does not exist yet");
          setFavorites([]);
          setLoading(false);
          return;
        }

        // In a real app, you would have a favorites table and join with files
        // For now, we'll simulate by getting a random subset of files and marking them as favorites
        const { data, error } = await supabase
          .from('files')
          .select('*')
          .eq('user_id', userId)
          .limit(4);

        if (error) {
          console.error("Error fetching favorite files:", error);
          setFavorites([]);
        } else {
          // Transform to the favorite format
          const fakeFavorites = (data || []).map(file => ({
            id: `fav-${file.id}`,
            file_id: file.id,
            user_id: userId,
            file: {
              id: file.id,
              name: file.name,
              type: file.type,
              is_folder: file.is_folder,
              size: file.size
            }
          }));

          setFavorites(fakeFavorites);
        }
      } catch (error) {
        console.error('Error fetching favorites:', error);
        setFavorites([]);
      } finally {
        setLoading(false);
      }
    }

    fetchFavorites();
  }, [userId, supabase]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <FiStar className="mr-2 h-5 w-5 text-primary" />
          Favorites
        </CardTitle>
        <CardDescription>
          Your favorite files and folders
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          // Loading skeleton
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center animate-pulse p-3 border rounded-md">
                <div className="w-6 h-6 bg-gray-200 rounded-full mr-3"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <FiStar className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
            <p>No favorites yet</p>
            <p className="text-sm">Add files to your favorites for quick access</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {favorites.map((favorite) => (
                <div key={favorite.id} className="flex items-center space-x-3 rounded-md border p-3">
                  {favorite.file.is_folder ? (
                    <FiFolder className="h-5 w-5 text-blue-500" />
                  ) : (
                    <FiFile className="h-5 w-5 text-blue-500" />
                  )}
                  <div className="flex-1 space-y-1 truncate">
                    <p className="font-medium leading-none truncate">
                      {favorite.file.name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {favorite.file.is_folder ? 'Folder' : favorite.file.type}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/files">View All</Link>
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
} 