'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

/**
 * Client-side OAuth callback handler.
 */
export function AuthCallbackClient() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [message, setMessage] = useState('Finalizing sign-in...');
  const [traceId] = useState(() => `auth-callback_${Date.now()}`);

  useEffect(() => {
    const completeSignIn = async () => {
      try {
        const code = params.get('code');

        if (!code) {
          setMessage('No authorization code was provided. Redirecting to login...');
          router.replace('/login');
          return;
        }

        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;

        logger.info({
          traceId,
          scope: "auth-callback",
          message: "OAuth callback completed successfully.",
        });
        setMessage('Sign-in complete. Redirecting to dashboard...');
        router.replace('/dashboard');
      } catch (error: unknown) {
        logger.error({
          traceId,
          scope: "auth-callback",
          message: "OAuth callback failed.",
          data: {
            error: error instanceof Error ? error.message : error,
          },
        });
        setMessage('Authentication failed. Redirecting to login...');
        router.replace('/login');
      }
    };

    void completeSignIn();
  }, [params, router, supabase, traceId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-secondary-900">
      <div className="rounded-lg bg-white dark:bg-secondary-800 shadow p-6 w-full max-w-md text-center">
        <h1 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
          Authentication in progress
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
      </div>
    </div>
  );
}
