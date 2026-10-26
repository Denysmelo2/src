// /auth/request-reset: "Forgot password?" page. Sends the Supabase
// password-reset email; the link lands on /reset-password
// (Reset-password.jsx), which sets the new password.
//
// Styled to match AuthPage/AuthForm and Reset-password.jsx. The
// confirmation message is the same whether or not the address has an
// account, so the page can't be used to find out who is registered.

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Mail, MailCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { useAuthCaptcha } from '@/components/auth/AuthCaptcha';

export default function RequestReset() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const captcha = useAuthCaptcha();

  const submit = async (e) => {
    e.preventDefault();
    if (busy || !captcha.ready) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${import.meta.env.VITE_SITE_URL || window.location.origin}/reset-password`,
        captchaToken: captcha.token,
      });
      // Rate-limit and network errors are worth showing; anything else
      // gets the neutral confirmation below.
      if (error && (error.status === 429 || /rate|network|fetch/i.test(error.message || ''))) {
        throw error;
      }
      setSent(true);
    } catch (err) {
      toast({
        title: 'Could not send the reset email',
        description: err?.message || 'Please try again in a few minutes.',
        variant: 'destructive',
      });
    } finally {
      captcha.reset();
      setBusy(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Reset your password — SnapGain</title>
      </Helmet>

      <div className="flex items-center justify-center min-h-[calc(100vh-150px)] bg-gray-50 p-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <Card>
            <CardHeader className="text-center pb-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary text-white mx-auto flex items-center justify-center mb-3 shadow-md">
                {sent ? <MailCheck className="w-7 h-7" /> : <Mail className="w-7 h-7" />}
              </div>
              <CardTitle className="text-2xl">
                {sent ? 'Check your email' : 'Forgot your password?'}
              </CardTitle>
              {!sent && (
                <p className="text-sm text-muted-foreground mt-1">
                  Enter the email you signed up with and we&rsquo;ll send you a
                  link to set a new password.
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-5">
              {sent ? (
                <div className="space-y-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    If an account exists for <strong className="text-foreground break-all">{email.trim()}</strong>,
                    a password reset link is on its way. It can take a few
                    minutes; check your junk or spam folder too.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Signed up with Google? You don&rsquo;t need a password:
                    use &ldquo;Continue with Google&rdquo; on the sign-in page.
                  </p>
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/auth/login">Back to sign in</Link>
                  </Button>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email address</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  {captcha.widget}
                  <Button
                    type="submit"
                    disabled={busy || !captcha.ready}
                    className="w-full bg-primary hover:bg-primary/90 text-white"
                  >
                    {busy ? 'Sending…' : 'Send reset link'}
                  </Button>
                  <p className="text-sm text-center text-muted-foreground">
                    Remembered it?{' '}
                    <Link to="/auth/login" className="font-semibold text-primary hover:underline">
                      Sign in
                    </Link>
                  </p>
                  <p className="text-xs text-center text-muted-foreground">
                    Need help? Email{' '}
                    <a href="mailto:support@snapgain.uk" className="text-primary hover:underline">
                      support@snapgain.uk
                    </a>
                    .
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
}
