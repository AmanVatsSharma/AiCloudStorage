'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { getUserErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [traceId] = useState(() => `forgot-password_${Date.now()}`);
  const supabase = createClient();
  const { toast } = useToast();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) throw error;

      logger.info({
        traceId,
        scope: "forgot-password",
        message: "Password reset email initiated.",
        data: { email },
      });

      toast({
        title: 'Reset email sent',
        description: 'Check your inbox for password reset instructions.',
      });
    } catch (error: unknown) {
      logger.error({
        traceId,
        scope: "forgot-password",
        message: "Failed to send password reset email.",
        data: { error: error instanceof Error ? error.message : error },
      });
      toast({
        title: 'Unable to send reset email',
        description: getUserErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Forgot password</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Enter your email and we&apos;ll send a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email address
          </label>
          <div className="mt-1">
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Sending reset email...' : 'Send reset email'}
        </Button>
      </form>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        Remembered your password?{' '}
        <Link href="/login" className="font-medium text-primary hover:text-primary/80">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
