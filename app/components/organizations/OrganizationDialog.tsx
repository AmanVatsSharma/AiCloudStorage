'use client';

import { FormEvent, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { logger } from '@/lib/logger';
import { getUserErrorMessage } from '@/lib/errors';
import { trackAuditEvent } from '@/lib/audit';
import { FiPlus } from 'react-icons/fi';

interface OrganizationDialogProps {
  userId: string;
  onSuccess?: () => void;
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
}

/**
 * Organization creation dialog using secure RPC.
 */
export function OrganizationDialog({ userId, onSuccess }: OrganizationDialogProps) {
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [traceId] = useState(() => `organization-dialog_${Date.now()}`);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slug) {
      setSlug(toSlug(value));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedName = name.trim();
    const normalizedSlug = toSlug(slug || name);
    if (!normalizedName || !normalizedSlug) {
      toast({
        title: 'Invalid input',
        description: 'Organization name and slug are required.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: organizationId, error } = await supabase.rpc('create_organization_with_owner', {
        p_name: normalizedName,
        p_slug: normalizedSlug,
        p_owner_id: userId,
      });

      if (error) throw error;

      await trackAuditEvent({
        action: 'organization.create',
        resourceType: 'organization',
        resourceId: typeof organizationId === 'string' ? organizationId : undefined,
        details: {
          organizationName: normalizedName,
          organizationSlug: normalizedSlug,
        },
      });

      toast({
        title: 'Organization created',
        description: `${normalizedName} is ready.`,
      });

      setName('');
      setSlug('');
      setOpen(false);
      onSuccess?.();
    } catch (error: unknown) {
      logger.error({
        traceId,
        scope: 'organization-dialog',
        message: 'Organization creation failed.',
        data: {
          userId,
          name: normalizedName,
          slug: normalizedSlug,
          error: error instanceof Error ? error.message : error,
        },
      });

      toast({
        title: 'Unable to create organization',
        description: getUserErrorMessage(error, 'Please try again with a different name/slug.'),
        variant: 'destructive',
      });

      await trackAuditEvent({
        action: 'organization.create',
        resourceType: 'organization',
        status: 'failure',
        details: {
          organizationName: normalizedName,
          organizationSlug: normalizedSlug,
          reason: error instanceof Error ? error.message : String(error),
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <FiPlus className="h-4 w-4 mr-2" />
          Create Organization
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create organization</DialogTitle>
          <DialogDescription>
            Organizations represent your enterprise tenancy boundary.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="organization-name">Name</Label>
            <Input
              id="organization-name"
              value={name}
              onChange={(event) => handleNameChange(event.target.value)}
              placeholder="Acme Storage Operations"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organization-slug">Slug</Label>
            <Input
              id="organization-slug"
              value={slug}
              onChange={(event) => setSlug(toSlug(event.target.value))}
              placeholder="acme-storage-operations"
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
