'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FiPlus } from 'react-icons/fi';
// import { useToast } from '@/components/ui/use-toast';
import { TeamList } from '@/app/components/teams/TeamList';
import { TeamDialog } from '@/app/components/teams/TeamDialog';
import { logger } from '@/lib/logger';

export default function TeamsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my-teams');
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [traceId] = useState(() => `teams-page_${Date.now()}`);
//   const { toast } = useToast();

  useEffect(() => {
    async function checkUser() {
      setLoading(true);
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          logger.warn({
            traceId,
            scope: "teams-page",
            message: "No authenticated user for teams page.",
            data: {
              error: error?.message,
            },
          });
          router.push('/login');
          return;
        }
        
        setUserId(user.id);
      } catch (error: unknown) {
        logger.error({
          traceId,
          scope: "teams-page",
          message: "Error during teams page auth check.",
          data: {
            error: error instanceof Error ? error.message : error,
          },
        });
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    
    void checkUser();
  }, [supabase, router, traceId]);

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex h-full items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardShell>
    );
  }

  if (!userId) {
    return (
      <DashboardShell>
        <div className="flex h-full flex-col items-center justify-center">
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground mb-4">Please sign in to access the teams feature.</p>
          <Button onClick={() => router.push('/login')}>Sign In</Button>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="flex items-center justify-between space-y-2 mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Teams</h2>
          <p className="text-muted-foreground">
            Create and manage your teams to collaborate with others.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TeamDialog
            userId={userId}
            trigger={
              <Button>
                <FiPlus className="mr-2 h-4 w-4" />
                Create Team
              </Button>
            }
          />
        </div>
      </div>

      <Tabs defaultValue="my-teams" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="my-teams">My Teams</TabsTrigger>
          <TabsTrigger value="joined-teams">Joined Teams</TabsTrigger>
        </TabsList>
        <TabsContent value="my-teams">
          <Card>
            <CardHeader>
              <CardTitle>Teams You Own</CardTitle>
            </CardHeader>
            <CardContent>
              <TeamList userId={userId} filter="owned" />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="joined-teams">
          <Card>
            <CardHeader>
              <CardTitle>Teams You&apos;ve Joined</CardTitle>
            </CardHeader>
            <CardContent>
              <TeamList userId={userId} filter="joined" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
} 