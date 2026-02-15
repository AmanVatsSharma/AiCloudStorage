'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FiUser, FiUserX, FiUserCheck } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getUserErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';

interface Member {
  id: string;
  user_id: string;
  team_id: string;
  role: string;
  created_at: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
}

interface MemberListProps {
  teamId: string;
  isOwner: boolean;
  userId: string;
}

export function MemberList({ teamId, isOwner, userId }: MemberListProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();
  const [traceId] = useState(() => `member-list_${Date.now()}`);

  useEffect(() => {
    fetchMembers();
  }, [teamId]);

  async function fetchMembers() {
    setLoading(true);
    try {
      // Use the database function to get team members
      const { data, error } = await supabase
        .rpc('get_team_members', {
          p_team_id: teamId,
          p_user_id: userId
        });

      if (error) {
        logger.error({
          traceId,
          scope: "member-list",
          message: "Failed to fetch team members.",
          data: {
            teamId,
            userId,
            error: error.message,
          },
        });
        toast({
          title: 'Error',
          description: 'Failed to load team members',
          variant: 'destructive',
        });
        return;
      }

      setMembers(data || []);
    } catch (error: unknown) {
      logger.error({
        traceId,
        scope: "member-list",
        message: "Unexpected error while fetching team members.",
        data: {
          teamId,
          userId,
          error: error instanceof Error ? error.message : error,
        },
      });
      toast({
        title: 'Error',
        description: getUserErrorMessage(error, 'Failed to load team members'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!isOwner) return;
    
    if (!confirm('Are you sure you want to remove this member from the team?')) {
      return;
    }

    try {
      // Use the database function to remove a team member
      const { error } = await supabase
        .rpc('remove_team_member', {
          p_team_id: teamId,
          p_user_id: userId,
          p_member_id: memberId
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Member removed successfully',
      });

      // Refresh the member list
      fetchMembers();
    } catch (error: unknown) {
      logger.error({
        traceId,
        scope: "member-list",
        message: "Failed to remove team member.",
        data: {
          teamId,
          memberId,
          userId,
          error: error instanceof Error ? error.message : error,
        },
      });
      toast({
        title: 'Error',
        description: getUserErrorMessage(error, 'Failed to remove member'),
        variant: 'destructive',
      });
    }
  }

  // Note: We'll need to create a new database function for changing member roles
  // But for now, we'll keep this function as is and it will be updated later
  async function handleChangeMemberRole(memberId: string, newRole: string) {
    if (!isOwner) return;

    try {
      const { error } = await supabase
        .from('team_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Role updated to ${newRole}`,
      });

      // Refresh the member list
      fetchMembers();
    } catch (error: unknown) {
      logger.error({
        traceId,
        scope: "member-list",
        message: "Failed to update member role.",
        data: {
          teamId,
          memberId,
          newRole,
          userId,
          error: error instanceof Error ? error.message : error,
        },
      });
      toast({
        title: 'Error',
        description: getUserErrorMessage(error, 'Failed to update member role'),
        variant: 'destructive',
      });
    }
  }

  if (loading) {
    return (
      <div className="py-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-12">
        <FiUser className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No members in this team yet
        </h3>
        <p className="text-gray-500 mb-6">
          Invite people to collaborate with you
        </p>
        {isOwner && (
          <Button>
            <FiUserCheck className="mr-2 h-4 w-4" />
            Invite Members
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">User</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            {isOwner && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member.avatar_url || ''} alt={member.full_name || 'User'} />
                  <AvatarFallback>
                    {member.full_name?.charAt(0) || member.email?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </TableCell>
              <TableCell className="font-medium">{member.full_name || 'Unknown'}</TableCell>
              <TableCell>{member.email || 'No email'}</TableCell>
              <TableCell>
                {isOwner ? (
                  <select 
                    value={member.role}
                    onChange={(e) => handleChangeMemberRole(member.id, e.target.value)}
                    className="p-1 border rounded text-sm"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Owner</option>
                  </select>
                ) : (
                  <span>{member.role}</span>
                )}
              </TableCell>
              <TableCell>{new Date(member.created_at).toLocaleDateString()}</TableCell>
              {isOwner && (
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => handleRemoveMember(member.id)}
                  >
                    <FiUserX className="h-4 w-4" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 