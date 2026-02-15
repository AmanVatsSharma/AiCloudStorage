import { Suspense } from 'react';
import { AuthCallbackClient } from './AuthCallbackClient';

export const dynamic = 'force-dynamic';

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-secondary-900">
          <div className="rounded-lg bg-white dark:bg-secondary-800 shadow p-6 w-full max-w-md text-center">
            <h1 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              Authentication in progress
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Finalizing sign-in...
            </p>
          </div>
        </div>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  );
}
