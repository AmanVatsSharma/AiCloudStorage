import { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { DashboardShell } from '@/components/layout/DashboardShell';
import { createServerClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { OrganizationInvitationAcceptCard } from '@/app/components/organizations/OrganizationInvitationAcceptCard';

export const metadata: Metadata = {
  title: 'Accept Organization Invitation - AI Cloud Storage',
  description: 'Accept a pending organization invitation securely.',
};

interface OrganizationInvitationPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function OrganizationInvitationPage({ params }: OrganizationInvitationPageProps) {
  const traceId = `organization-invitation-page_${Date.now()}`;
  const { token } = await params;
  const supabase = await createServerClient();

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    logger.warn({
      traceId,
      scope: 'organization-invitation-page',
      message: 'Missing authenticated session for invitation acceptance.',
      data: {
        error: error?.message,
      },
    });
    redirect('/login');
  }

  const email = session.user.email;
  if (!email) {
    logger.warn({
      traceId,
      scope: 'organization-invitation-page',
      message: 'Authenticated account does not expose an email.',
      data: {
        userId: session.user.id,
      },
    });
    redirect('/organizations');
  }

  return (
    <DashboardShell>
      <div className="max-w-2xl mx-auto py-8">
        <OrganizationInvitationAcceptCard
          token={token}
          userId={session.user.id}
          userEmail={email}
        />
      </div>
    </DashboardShell>
  );
}
