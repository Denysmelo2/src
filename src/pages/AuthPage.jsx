import React from 'react';
import { useParams, Navigate, useSearchParams, Link } from 'react-router-dom';
import AuthForm from '@/components/auth/AuthForm';
import ResendConfirmationEmail from '@/components/auth/ResendConfirmationEmail';

function AuthPage() {
  const { mode } = useParams();
  // ?link=expired|invalid: an email link Supabase rejected (see
  // AuthLinkErrorRedirect). Explain it here instead of an error screen.
  const [searchParams] = useSearchParams();
  const linkProblem = searchParams.get('link');

  // Trial-first policy (Alt A): visitors can sign up free with email +
  // phone. They get a 7-day trial with comparison engine + 1 strategy
  // unlocked. Subscription gates the other 8 strategies and advanced
  // features.
  if (mode !== 'login' && mode !== 'signup') {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 min-h-[calc(100vh-150px)] bg-gray-50 p-4">
      {linkProblem && (
        <div role="alert" className="w-full max-w-md rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm space-y-3">
          <p className="font-semibold text-amber-900">
            {linkProblem === 'expired'
              ? 'That email link has expired or was already used.'
              : 'That email link did not work.'}
          </p>
          <p className="text-amber-900/90">
            If you signed up more than once, only the newest confirmation email
            works. Use that one, or send a new one here:
          </p>
          <ResendConfirmationEmail />
          <p className="text-amber-900/90">
            Already confirmed? Just sign in below. Resetting your password?{' '}
            <Link to="/auth/request-reset" className="font-semibold underline">
              Ask for a new reset link
            </Link>
            .
          </p>
        </div>
      )}
      <AuthForm mode={mode} />
    </div>
  );
}

export default AuthPage;
