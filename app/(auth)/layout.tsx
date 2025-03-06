import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import Image from "next/image";
import { createServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Authentication - AI Cloud Storage",
  description: "Sign in to your AI Cloud Storage account",
};

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get the Supabase client
  const supabase = await createServerClient();
  
  // Check if user is already authenticated
  const { data: { session } } = await supabase.auth.getSession();
  
  // If authenticated, redirect to dashboard
  if (session) {
    redirect('/dashboard');
  }
  
  return (
    <div className="flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50 dark:bg-secondary-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Image
            src="/file.svg"
            alt="AI Cloud Storage"
            width={64}
            height={64}
            className="h-12 w-auto"
            priority
          />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          AI Cloud Storage
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-secondary-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {children}
        </div>
      </div>
    </div>
  );
} 