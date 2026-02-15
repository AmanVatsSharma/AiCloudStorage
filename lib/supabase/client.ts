import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '../types/supabase';
import { publicEnv } from '@/lib/env';

// Create a Supabase client for use in the browser
export const createClient = () => {
  return createClientComponentClient<Database>({
    supabaseUrl: publicEnv.supabaseUrl,
    supabaseKey: publicEnv.supabaseAnonKey,
  });
}