export type HealthStatus = 'ok' | 'degraded';

export interface ReadinessCheck {
  name: string;
  status: 'pass' | 'warn';
  message: string;
}

export interface ReadinessInput {
  supabaseUrl: string;
  supabaseAnonKey: string;
  openAiKeyConfigured: boolean;
}

export interface ReadinessResult {
  status: HealthStatus;
  checks: ReadinessCheck[];
}

function isPlaceholder(value: string): boolean {
  return value.includes('placeholder') || value.trim().length === 0;
}

/**
 * Build readiness status from runtime configuration signals.
 */
export function evaluateReadiness(input: ReadinessInput): ReadinessResult {
  const checks: ReadinessCheck[] = [];

  const supabaseConfigured = !isPlaceholder(input.supabaseUrl) && !isPlaceholder(input.supabaseAnonKey);
  checks.push({
    name: 'supabase_public_config',
    status: supabaseConfigured ? 'pass' : 'warn',
    message: supabaseConfigured
      ? 'Supabase public URL and anon key are configured.'
      : 'Supabase public config is using placeholder/fallback values.',
  });

  checks.push({
    name: 'openai_key_configured',
    status: input.openAiKeyConfigured ? 'pass' : 'warn',
    message: input.openAiKeyConfigured
      ? 'OPENAI_API_KEY is configured.'
      : 'OPENAI_API_KEY is not configured; AI requests will use heuristic fallback.',
  });

  const hasWarnings = checks.some((check) => check.status === 'warn');
  return {
    status: hasWarnings ? 'degraded' : 'ok',
    checks,
  };
}
