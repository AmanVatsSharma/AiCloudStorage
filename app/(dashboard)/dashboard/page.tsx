import { Metadata } from "next"
import { DashboardShell } from '@/components/layout/DashboardShell'
import { RecentFilesCard } from '@/app/components/dashboard/RecentFilesCard'
import { FavoritesCard } from '@/app/components/dashboard/FavoritesCard'
import { StatsCards } from '@/app/components/dashboard/StatsCards'
import { 
  FiFolder, 
} from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: "Dashboard - AI Cloud Storage",
  description: "Manage your files and AI features",
}

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/auth/login');
  }

  // Make sure we have a valid user ID
  const userId = session.user?.id;
  if (!userId) {
    console.error("User ID not available in session");
    redirect('/auth/login');
  }

  // Log the userId to confirm it's a valid UUID
  console.log(`Dashboard loading with user ID: ${userId}`);

  return (
    <DashboardShell>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back to your AI-powered storage platform
            </p>
          </div>
          <Button asChild>
            <Link href="/files">
            <FiFolder className="mr-2 h-4 w-4" />
              Manage Files
            </Link>
          </Button>
        </div>

        {/* Storage Overview */}
        {userId && <StatsCards userId={userId} />}

        {/* Recent Files and Favorites */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
          {userId && <RecentFilesCard userId={userId} className="col-span-2" />}
          {userId && <FavoritesCard userId={userId} />}
        </div>
      </div>
    </DashboardShell>
  )
} 