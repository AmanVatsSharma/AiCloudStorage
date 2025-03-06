'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { FiUser, FiUsers, FiEdit, FiTrash, FiPlusCircle, FiEye, FiUserPlus } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { TeamDialog } from './TeamDialog';

interface Team {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  created_at: string;
  is_owner: boolean;
  member_count: number;
}

interface TeamListProps {
  userId: string;
  filter: 'owned' | 'joined';
}

export function TeamList({ userId, filter }: TeamListProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchTeams();
  }, [userId, filter]);

  async function fetchTeams() {
    setLoading(true);
    try {
      // Use the new database function to get teams
      const { data, error } = await supabase
        .rpc('get_user_teams', {
          p_user_id: userId
        });
        
      if (error) throw error;
      
      if (!data) {
        setTeams([]);
        return;
      }
      
      // Filter the teams based on the 'filter' prop
      const filteredTeams = data.filter((team: Team) => {
        if (filter === 'owned') {
          return team.is_owner;
        } else {
          return !team.is_owner;
        }
      });
      
      setTeams(filteredTeams);
      console.log(`${filter} teams data:`, filteredTeams);
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast({
        title: 'Error',
        description: 'Failed to load teams',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteTeam(teamId: string, teamName: string) {
    if (!confirm(`Are you sure you want to delete the team "${teamName}"?`)) {
      return;
    }
    
    try {
      // Use the new database function to delete a team
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
      
      // Refresh the list
      fetchTeams();
    } catch (error: any) {
      console.error('Error deleting team:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete team',
        variant: 'destructive',
      });
    }
  }

  function handleViewTeam(teamId: string) {
    router.push(`/teams/${teamId}`);
  }

  if (loading) {
    return (
      <div className="py-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="text-center py-12">
        <FiUsers className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {filter === 'owned' ? 'No teams created yet' : 'You haven\'t joined any teams yet'}
        </h3>
        <p className="text-gray-500 mb-6">
          {filter === 'owned' 
            ? 'Create a team to collaborate with others on files and projects' 
            : 'Join a team to collaborate with others'}
        </p>
        {filter === 'owned' && (
          <TeamDialog
            userId={userId}
            onSuccess={fetchTeams}
          />
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {teams.map((team) => (
        <div 
          key={team.id} 
          className="flex flex-col border rounded-lg shadow-sm overflow-hidden"
        >
          <div className="p-5 flex-grow">
            <h3 className="text-lg font-medium text-gray-900 mb-1">{team.name}</h3>
            <p className="text-gray-500 text-sm mb-3 line-clamp-2">
              {team.description || 'No description'}
            </p>
            <div className="flex items-center text-sm text-gray-500">
              <FiUser className="mr-1 h-4 w-4" />
              <span>{team.member_count} member{team.member_count !== 1 ? 's' : ''}</span>
            </div>
          </div>
          
          <div className="border-t p-3 bg-gray-50 flex justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleViewTeam(team.id)}
            >
              <FiEye className="mr-1 h-4 w-4" />
              View
            </Button>
            
            <div className="flex space-x-2">
              {team.is_owner && (
                <>
                  <TeamDialog
                    userId={userId}
                    team={team}
                    onSuccess={fetchTeams}
                    trigger={
                      <Button variant="outline" size="sm">
                        <FiEdit className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteTeam(team.id, team.name)}
                  >
                    <FiTrash className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 