'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FiFolder, FiUsers, FiShare2, FiHardDrive } from 'react-icons/fi';
import { isValidUUID } from '@/lib/utils';

interface StatsCardsProps {
  userId: string;
}

export function StatsCards({ userId }: StatsCardsProps) {
  const [stats, setStats] = useState({
    storageUsed: 0,
    storageLimit: 25 * 1024 * 1024 * 1024, // 25 GB
    totalFiles: 0,
    sharedFiles: 0,
    teamMembers: 0
  });
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function fetchStats() {
      if (!isValidUUID(userId)) {
        console.error("Stats: Invalid UUID format for user ID:", userId);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch user storage info from profiles table instead of users
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('storage_used, storage_limit')
          .eq('id', userId)
          .single();

        if (profileError) {
          console.error("Profile data error:", profileError);
          // Don't throw, just proceed with default values
        }

        // Fetch files count
        const { count: filesCount, error: filesError } = await supabase
          .from('files')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        if (filesError && filesError.code !== 'PGRST116') {
          // PGRST116 is "relation does not exist" which we might get if the table is newly created
          console.error("Files count error:", filesError);
        }

        // Fetch shared files count
        const { count: sharedCount, error: sharedError } = await supabase
          .from('shared_files')
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', userId);

        if (sharedError && sharedError.code !== 'PGRST116') {
          console.error("Shared files error:", sharedError);
        }

        // Fetch team members count (first get teams owned by user)
        const { data: teams, error: teamsError } = await supabase
          .from('teams')
          .select('id')
          .eq('owner_id', userId);
        
        let teamMembers = 0;
        if (!teamsError && teams && teams.length > 0) {
          const teamIds = teams.map(team => team.id);
          const { count: membersCount, error: membersError } = await supabase
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .in('team_id', teamIds);
          
          if (!membersError) {
            teamMembers = membersCount || 0;
          }
        }

        setStats({
          storageUsed: profileData?.storage_used || 0,
          storageLimit: profileData?.storage_limit || 25 * 1024 * 1024 * 1024,
          totalFiles: filesCount || 0,
          sharedFiles: sharedCount || 0,
          teamMembers
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [userId, supabase]);

  const usagePercentage = (stats.storageUsed / stats.storageLimit) * 100;

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  const shimmer = loading ? "animate-pulse bg-gray-200" : "";

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Storage Used
          </CardTitle>
          <FiHardDrive className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${shimmer}`}>
            {loading ? '\u00A0' : formatBytes(stats.storageUsed)}
          </div>
          <p className={`text-xs text-muted-foreground ${shimmer}`}>
            {loading 
              ? '\u00A0' 
              : `${Math.round(usagePercentage)}% of your storage (${formatBytes(stats.storageLimit)})`}
          </p>
          <div className="mt-3 h-2 w-full rounded-full bg-muted">
            <div 
              className="h-full rounded-full bg-primary"
              style={{ width: loading ? '0%' : `${Math.min(usagePercentage, 100)}%` }}
            ></div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Files
          </CardTitle>
          <FiFolder className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${shimmer}`}>
            {loading ? '\u00A0' : stats.totalFiles}
          </div>
          <p className="text-xs text-muted-foreground">
            {loading ? '\u00A0' : 'Total files in your storage'}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Shared Files
          </CardTitle>
          <FiShare2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${shimmer}`}>
            {loading ? '\u00A0' : stats.sharedFiles}
          </div>
          <p className="text-xs text-muted-foreground">
            {loading ? '\u00A0' : 'Files shared with others'}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Team Members
          </CardTitle>
          <FiUsers className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${shimmer}`}>
            {loading ? '\u00A0' : stats.teamMembers}
          </div>
          <p className="text-xs text-muted-foreground">
            {loading ? '\u00A0' : 'Across all your teams'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 