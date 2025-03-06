'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FiPlus } from 'react-icons/fi';
import { useToast } from '@/components/ui/use-toast';
import { TeamList } from '@/app/components/teams/TeamList';
import { TeamDialog } from '@/app/components/teams/TeamDialog';

export default function TeamsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my-teams');
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    async function checkUser() {
      setLoading(true);
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          console.error('Error getting user:', error);
          router.push('/login');
          return;
        }
        
        setUserId(user.id);
      } catch (error) {
        console.error('Error in auth check:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    
    checkUser();
  }, [supabase, router]);

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
              <CardTitle>Teams You've Joined</CardTitle>
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