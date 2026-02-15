import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/lib/types/supabase'
import { publicEnv } from '@/lib/env'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  // Create a Supabase client configured to use cookies
  const supabase = createMiddlewareClient<Database>({
    req,
    res,
  }, {
    supabaseUrl: publicEnv.supabaseUrl,
    supabaseKey: publicEnv.supabaseAnonKey,
  })
  
  // Refresh session if expired
  await supabase.auth.getSession()
  
  return res
}

// Specify which routes this middleware should run on
export const config = {
  matcher: [
    // Apply this middleware to all routes except static files and api routes
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
} 