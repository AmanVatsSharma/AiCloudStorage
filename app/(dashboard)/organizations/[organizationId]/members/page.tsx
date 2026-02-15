import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';

import { DashboardShell } from '@/components/layout/DashboardShell';
import { Button } from '@/components/ui/button';
import { OrganizationMembersManager } from '@/app/components/organizations/OrganizationMembersManager';
import { createServerClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { OrganizationRole } from '@/lib/authorization/organization-permissions';

export const metadata: Metadata = {
  title: 'Organization Members - AI Cloud Storage',
  description: 'Manage organization members, roles, and invitations.',
};

interface OrganizationMembersPageProps {
  params: Promise<{
    organizationId: string;
  }>;
}

interface UserOrganization {
  id: string;
  name: string;
  role: OrganizationRole;
}

function normalizeOrganizationRole(role: string): OrganizationRole {
  if (role === 'owner' || role === 'admin' || role === 'billing_viewer') {
    return role;
  }

  return 'member';
}

export default async function OrganizationMembersPage({ params }: OrganizationMembersPageProps) {
  const traceId = `organization-members-page_${Date.now()}`;
  const { organizationId } = await params;
  const supabase = await createServerClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    logger.warn({
      traceId,
      scope: 'organization-members-page',
      message: 'Missing authenticated session while opening organization members page.',
      data: {
        organizationId,
        error: sessionError?.message,
      },
    });
    redirect('/login');
  }

  const { data: organizations, error } = await supabase.rpc('get_user_organizations', {
    p_user_id: session.user.id,
  });

  if (error) {
    logger.error({
      traceId,
      scope: 'organization-members-page',
      message: 'Failed to resolve organization access for member management page.',
      data: {
        organizationId,
        userId: session.user.id,
        error: error.message,
      },
    });
    redirect('/organizations');
  }

  const organization = (organizations as UserOrganization[] | null)?.find(
    (candidate) => candidate.id === organizationId
  );

  if (!organization) {
    notFound();
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link href="/organizations">
            <FiArrowLeft className="h-4 w-4 mr-2" />
            Back to Organizations
          </Link>
        </Button>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">{organization.name}</h1>
          <p className="text-muted-foreground mt-2">
            Manage member roles, enforce least-privilege access, and control pending invitations.
          </p>
        </div>

        <OrganizationMembersManager
          organizationId={organization.id}
          organizationName={organization.name}
          actorUserId={session.user.id}
          actorRole={normalizeOrganizationRole(organization.role)}
        />
      </div>
    </DashboardShell>
  );
}
