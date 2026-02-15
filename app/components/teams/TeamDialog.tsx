'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { FiUsers } from 'react-icons/fi';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getUserErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';

interface TeamData {
  id?: string;
  name: string;
  description?: string;
}

interface TeamDialogProps {
  userId: string;
  team?: TeamData;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function TeamDialog({ userId, team, onSuccess, trigger }: TeamDialogProps) {
  const isEditing = !!team?.id;
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<TeamData>({
    name: team?.name || '',
    description: team?.description || '',
  });
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { toast } = useToast();
  const [traceId] = useState(() => `team-dialog_${Date.now()}`);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Team name is required',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    
    try {
      if (isEditing) {
        // Update existing team using the new database function
        const { error } = await supabase
          .rpc('update_team', {
            p_team_id: team.id,
            p_user_id: userId,
            p_name: formData.name,
            p_description: formData.description || null
          });
          
        if (error) throw error;
        
        toast({
          title: 'Success',
          description: 'Team updated successfully',
        });
      } else {
        // Create new team using the new database function
        const { error } = await supabase
          .rpc('create_team_with_owner', {
            p_name: formData.name,
            p_description: formData.description || null,
            p_owner_id: userId
          });
          
        if (error) throw error;
        
        toast({
          title: 'Success',
          description: 'Team created successfully',
        });
      }
      
      // Reset form and close dialog
      setFormData({ name: '', description: '' });
      setOpen(false);
      
      // Refresh the data
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch (error: unknown) {
      logger.error({
        traceId,
        scope: "team-dialog",
        message: "Team create/update failed.",
        data: {
          userId,
          teamId: team?.id,
          isEditing,
          error: error instanceof Error ? error.message : error,
        },
      });
      toast({
        title: 'Error',
        description: getUserErrorMessage(error, 'Failed to save team'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <FiUsers className="mr-2 h-4 w-4" />
            {isEditing ? 'Edit Team' : 'Create Team'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Team' : 'Create New Team'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update your team details below.'
              : 'Create a new team to collaborate with others.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="Team name"
                value={formData.name}
                onChange={handleChange}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe your team"
                value={formData.description || ''}
                onChange={handleChange}
                className="col-span-3"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></span>
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditing ? 'Update Team' : 'Create Team'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 