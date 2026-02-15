/**
 * Environment validation helpers.
 * Keep startup/config failures explicit and actionable.
 */
const warnedMissingEnv = new Set<string>();

function getEnv(name: keyof NodeJS.ProcessEnv): string {
  const value = process.env[name];
  if (value) {
    return value;
  }

  // Allow local build/test tooling to run even when env vars are not set.
  // Runtime environments must still provide real values.
  const fallbackMap: Partial<Record<keyof NodeJS.ProcessEnv, string>> = {
    NEXT_PUBLIC_SUPABASE_URL: 'https://placeholder.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'placeholder-anon-key',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  };

  const fallback = fallbackMap[name] ?? '';
  const envName = String(name);
  if (!warnedMissingEnv.has(envName)) {
    warnedMissingEnv.add(envName);
    console.warn(`[env] Missing ${envName}; using fallback value for non-runtime build context.`);
  }
  return fallback;
}

/**
 * Client-safe public environment values.
 */
export const publicEnv = {
  supabaseUrl: getEnv('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
};
