'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { AuthError } from '@supabase/supabase-js';

const DEMO_EMAIL = 'demo@gmail.com';
const DEMO_PASSWORD = 'Password@123';

function isAlreadyRegisteredError(message: string): boolean {
  return /(already registered|already exists|user already)/i.test(message);
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const completeLogin = () => {
    toast({
      title: 'Success',
      description: 'You have been logged in successfully.',
    });

    router.push('/dashboard');
    router.refresh();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      console.info('auth-login-debug: standard sign-in successful', {
        email,
      });
      completeLogin();
    } catch (error: unknown) {
      const authError = error as AuthError;
      console.error('auth-login-debug: standard sign-in failed', {
        email,
        error: authError.message,
      });
      toast({
        title: 'Error',
        description: authError.message || 'Failed to sign in',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Demo login flow for quick product walkthroughs:
   * 1) attempt sign-in with hardcoded credentials
   * 2) if user not found, create account
   * 3) retry sign-in and continue to dashboard
   */
  const handleDemoSignIn = async () => {
    setIsLoading(true);
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    console.info('auth-login-debug: attempting demo sign-in', { email: DEMO_EMAIL });

    try {
      const firstAttempt = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });

      if (!firstAttempt.error) {
        console.info('auth-login-debug: demo sign-in succeeded (existing account)');
        completeLogin();
        return;
      }

      console.warn('auth-login-debug: demo account sign-in failed, trying sign-up', {
        error: firstAttempt.error.message,
      });

      const signUpAttempt = await supabase.auth.signUp({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        options: {
          data: {
            full_name: 'Demo User',
          },
        },
      });

      if (signUpAttempt.error && !isAlreadyRegisteredError(signUpAttempt.error.message)) {
        throw signUpAttempt.error;
      }

      const retryAttempt = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });

      if (retryAttempt.error) {
        throw retryAttempt.error;
      }

      console.info('auth-login-debug: demo sign-in succeeded after provisioning');
      toast({
        title: 'Demo account ready',
        description: 'Demo credentials are active and ready for testing.',
      });
      completeLogin();
    } catch (error: unknown) {
      const authError = error as AuthError;
      console.error('auth-login-debug: demo sign-in flow failed', {
        email: DEMO_EMAIL,
        error: authError.message,
      });
      toast({
        title: 'Demo login failed',
        description:
          authError.message ||
          'Unable to sign in with demo credentials. Check Supabase auth signup settings.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error: unknown) {
      const authError = error as AuthError;
      toast({
        title: 'Error',
        description: authError.message || `Failed to sign in with ${provider}`,
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sign in to your account</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Or{' '}
          <Link href="/register" className="font-medium text-primary hover:text-primary/80">
            create a new account
          </Link>
        </p>
      </div>

      <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-3 space-y-2">
        <p className="text-sm font-medium text-primary">Quick demo credentials</p>
        <p className="text-xs text-muted-foreground">
          Email: <span className="font-mono">{DEMO_EMAIL}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Password: <span className="font-mono">{DEMO_PASSWORD}</span>
        </p>
        <Button type="button" variant="outline" className="w-full" onClick={handleDemoSignIn} disabled={isLoading}>
          {isLoading ? 'Preparing demo account...' : 'Use Demo Account'}
        </Button>
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Password
          </label>
          <div className="mt-1">
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Remember me
            </label>
          </div>

          <div className="text-sm">
            <Link href="/forgot-password" className="font-medium text-primary hover:text-primary/80">
              Forgot your password?
            </Link>
          </div>
        </div>

        <div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>
        </div>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-700" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white dark:bg-secondary-800 px-2 text-gray-500 dark:text-gray-400">
              Or continue with
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOAuthSignIn('google')}
            disabled={isLoading}
            className="w-full"
          >
            Google
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOAuthSignIn('github')}
            disabled={isLoading}
            className="w-full"
          >
            GitHub
          </Button>
        </div>
      </div>
    </div>
  );
} 