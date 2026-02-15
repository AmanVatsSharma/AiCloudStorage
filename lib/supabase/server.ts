import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '../types/supabase';
import { cache } from 'react';
import { publicEnv } from '@/lib/env';

// Private implementation that uses cookies directly
const _createServerClient = cache(() => {
  const { supabaseUrl, supabaseAnonKey } = publicEnv;
  void supabaseUrl;
  void supabaseAnonKey;

  const cookieStore = cookies();
  return createServerComponentClient<Database>({ cookies: () => cookieStore });
});

// Public async wrapper to enforce awaiting
export const createServerClient = async () => {
  // We make this async to force consumers to await it
  // This addresses the "cookies() should be awaited" issue
  return _createServerClient();
};