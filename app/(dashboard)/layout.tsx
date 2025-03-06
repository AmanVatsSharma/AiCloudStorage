import React from "react";
import { Metadata } from "next";
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: "Dashboard - AI Cloud Storage",
  description: "Manage your files and AI features",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  return (
    <>
      {children}
      <Toaster />
    </>
  )
}