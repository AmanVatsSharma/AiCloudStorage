'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { FiArrowLeft, FiEdit, FiTrash, FiUserPlus } from 'react-icons/fi';
import { MemberList } from '@/app/components/teams/MemberList';
import { TeamDialog } from '@/app/components/teams/TeamDialog';
import { InviteMemberDialog } from '@/app/components/teams/InviteMemberDialog';

interface Team {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  created_at: string;
  is_owner?: boolean;
  member_count?: number;
}

export default function TeamDetailPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  const [team, setTeam] = useState<Team | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function checkUser() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          console.error('Error getting user:', error);
          router.push('/login');
          return;
        }
        
        setUserId(user.id);
        fetchTeam(user.id);
      } catch (error) {
        console.error('Error in auth check:', error);
        router.push('/login');
      }
    }
    
    checkUser();
  }, [teamId, fetchTeam, router, supabase.auth]);

  async function fetchTeam(userId: string) {
    setLoading(true);
    try {
      // Use get_user_teams function to get all teams for the user
      const { data, error } = await supabase
        .rpc('get_user_teams', {
          p_user_id: userId
        });
        
      if (error) throw error;
      
      // Find the specific team by ID
      const teamData = data?.find((t: Team) => t.id === teamId);
      
      if (!teamData) {
        toast({
          title: 'Team Not Found',
          description: 'You do not have access to this team',
          variant: 'destructive',
        });
        router.push('/teams');
        return;
      }
      
      setTeam(teamData);
      setIsOwner(teamData.is_owner || false);
    } catch (error: any) {
      console.error('Error fetching team:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load team details',
        variant: 'destructive',
      });
      router.push('/teams');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteTeam() {
    if (!isOwner || !team) return;
    
    if (!confirm(`Are you sure you want to delete the team "${team.name}"? This action cannot be undone and will remove all team members.`)) {
      return;
    }
    
    try {
      // Use delete_team RPC function
      const { data, error } = await supabase
        .rpc('delete_team', {
          p_team_id: teamId,
          p_user_id: userId
        });
        
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Team deleted successfully',
      });
      
      router.push('/teams');
    } catch (error: any) {
      console.error('Error deleting team:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete team',
        variant: 'destructive',
      });
    }
  }

  const handleBackToTeams = () => {
    router.push('/teams');
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex h-full items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardShell>
    );
  }

  if (!team) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-xl font-semibold mb-2">Team Not Found</h2>
          <p className="text-muted-foreground mb-4">The team you&apos;re looking for does not exist or you don&apos;t have access to it.</p>
          <Button onClick={handleBackToTeams}>Back to Teams</Button>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="mb-8">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleBackToTeams}
          className="mb-4"
        >
          <FiArrowLeft className="mr-2 h-4 w-4" />
          Back to Teams
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{team.name}</h2>
            {team.description && (
              <p className="text-muted-foreground mt-1">
                {team.description}
              </p>
            )}
          </div>
          
          {isOwner && (
            <div className="flex items-center gap-2">
              <TeamDialog
                userId={userId!}
                team={team}
                onSuccess={() => fetchTeam(userId!)}
                trigger={
                  <Button variant="outline" size="sm">
                    <FiEdit className="mr-2 h-4 w-4" />
                    Edit Team
                  </Button>
                }
              />
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleDeleteTeam}
              >
                <FiTrash className="mr-2 h-4 w-4" />
                Delete Team
              </Button>
            </div>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Team Members</CardTitle>
          {isOwner && (
            <InviteMemberDialog
              teamId={teamId}
              teamName={team.name}
              userId={userId!}
              onSuccess={() => fetchTeam(userId!)}
              trigger={
                <Button size="sm">
                  <FiUserPlus className="mr-2 h-4 w-4" />
                  Invite Member
                </Button>
              }
            />
          )}
        </CardHeader>
        <CardContent>
          <MemberList teamId={teamId} isOwner={isOwner} userId={userId!} />
        </CardContent>
      </Card>
    </DashboardShell>
  );
} 