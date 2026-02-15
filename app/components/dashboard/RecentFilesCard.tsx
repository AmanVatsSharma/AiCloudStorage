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
import { FiClock, FiFolder, FiFile } from 'react-icons/fi';
import Link from 'next/link';
import { isValidUUID } from '@/lib/utils';

interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  path: string;
  created_at: string;
  updated_at: string;
  is_folder: boolean;
}

interface RecentFilesCardProps {
  userId: string;
  className?: string;
}

export function RecentFilesCard({ userId, className = '' }: RecentFilesCardProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function fetchRecentFiles() {
      if (!isValidUUID(userId)) {
        console.error("RecentFiles: Invalid UUID format for user ID:", userId);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('files')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(5);

        if (error) {
          if (error.code === 'PGRST116') {
            // Table doesn't exist yet, just show empty state
            console.info("Files table does not exist yet");
          } else {
            console.error("Error fetching recent files:", error);
          }
          setFiles([]);
        } else {
          setFiles(data || []);
        }
      } catch (error) {
        console.error('Error fetching recent files:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRecentFiles();
  }, [userId, supabase]);

  const formatDate = (date: string) => {
    if (!date) return '';
    
    const now = new Date();
    const fileDate = new Date(date);
    const diffTime = Math.abs(now.getTime() - fileDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffMinutes < 5) return 'Just now';
    if (diffHours < 1) return `${diffMinutes} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 30) return `${diffDays} days ago`;
    
    return fileDate.toLocaleDateString();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <FiClock className="mr-2 h-5 w-5 text-primary" />
          Recent Files
        </CardTitle>
        <CardDescription>
          Files you&apos;ve worked on recently
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          // Loading skeleton
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded mr-2"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="w-16 h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <FiFolder className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
            <p>No recent files found</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left font-medium p-2">Name</th>
                  <th className="text-left font-medium p-2">Modified</th>
                  <th className="text-left font-medium p-2">Size</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.id} className="hover:bg-muted/50">
                    <td className="p-2 flex items-center">
                      {file.is_folder ? (
                        <FiFolder className="mr-2 h-4 w-4 text-blue-500" />
                      ) : (
                        <FiFile className="mr-2 h-4 w-4 text-blue-500" />
                      )}
                      <span className="truncate max-w-[200px]">{file.name}</span>
                    </td>
                    <td className="p-2 text-muted-foreground">
                      {formatDate(file.updated_at || file.created_at)}
                    </td>
                    <td className="p-2 text-muted-foreground">
                      {file.is_folder ? 'Folder' : formatFileSize(file.size)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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