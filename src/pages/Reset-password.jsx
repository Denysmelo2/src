// /reset-password — destination after the user clicks the "Reset
// Password" email link. Supabase already signed them in via the link
// (PASSWORD_RECOVERY event); this form just calls updateUser({password})
// to set the new one.
//
// Also serves as the "Set password" flow for users who signed in via
// magic-link / invite and want to choose a password they can use later
// (since magic-link sign-ins create a session without a password).

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { CheckCircle2, KeyRound } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { PasswordInput, isPasswordValid } from '@/components/auth/PasswordInput';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [pwd, setPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;

    if (!isPasswordValid(pwd)) {
      toast({
        title: 'Password too weak',
        description: 'Your password must meet all 4 requirements shown.',
        variant: 'destructive',
      });
      return;
    }
    if (pwd !== confirmPwd) {
      toast({
        title: 'Passwords do not match',
        description: 'Re-type both fields so they match exactly.',
        variant: 'destructive',
      });
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) throw error;
      setDone(true);
      toast({
        title: 'Password updated',
        description: 'You can sign in with your new password now.',
      });
      // After 2.5s give them a route forward
      setTimeout(() => navigate('/home', { replace: true }), 2500);
    } catch (err) {
      toast({
        title: 'Could not update password',
        description: err?.message || 'Try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Set a new password — SnapGain</title>
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
                {done ? (
                  <CheckCircle2 className="w-7 h-7" />
                ) : (
                  <KeyRound className="w-7 h-7" />
                )}
              </div>
              <CardTitle className="text-2xl">
                {done ? 'Password updated' : 'Set your new password'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {done ? (
                <p className="text-center text-sm text-muted-foreground">
                  Redirecting you to your dashboard…
                </p>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <PasswordInput
                    id="new-password"
                    label="New password"
                    value={pwd}
                    onChange={setPwd}
                    showValidation
                    autoComplete="new-password"
                  />
                  <PasswordInput
                    id="confirm-new-password"
                    label="Confirm new password"
                    value={confirmPwd}
                    onChange={setConfirmPwd}
                    matchAgainst={pwd}
                    autoComplete="new-password"
                  />
                  <Button
                    type="submit"
                    disabled={busy}
                    className="w-full bg-primary hover:bg-primary/90 text-white"
                  >
                    {busy ? 'Saving…' : 'Save new password'}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Link expired?{' '}
                    <Link to="/auth/request-reset" className="text-primary hover:underline">
                      Request a new one
                    </Link>
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
