import { evaluateReadiness } from '@/lib/health/readiness';

describe('evaluateReadiness', () => {
  it('returns ok when required configuration is present', () => {
    const result = evaluateReadiness({
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'anon-key',
      openAiKeyConfigured: true,
    });

    expect(result.status).toBe('ok');
    expect(result.checks.every((check) => check.status === 'pass')).toBe(true);
  });

  it('returns degraded when config has placeholder values', () => {
    const result = evaluateReadiness({
      supabaseUrl: 'https://placeholder.supabase.co',
      supabaseAnonKey: 'placeholder-anon-key',
      openAiKeyConfigured: false,
    });

    expect(result.status).toBe('degraded');
    expect(result.checks.some((check) => check.status === 'warn')).toBe(true);
  });
});
