import { Metadata } from 'next'
import { FileExplorer } from '@/app/components/files/FileExplorer'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { FiFolder } from 'react-icons/fi'
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: "My Files - AI Cloud Storage",
  description: "Manage your files and folders",
};

export default async function FilesPage() {
  // Verify authentication
  const supabase = await createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <DashboardShell>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Files</h1>
            <Breadcrumb className="mt-2">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/dashboard">Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/files">Files</BreadcrumbLink>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>

        <Card className="border shadow-sm">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-lg flex items-center">
              <FiFolder className="mr-2 h-5 w-5 text-primary" />
              File Explorer
            </CardTitle>
            <CardDescription>
              Manage your files and folders
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[calc(100vh-230px)] overflow-hidden">
              <FileExplorer />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
} 