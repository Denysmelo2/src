import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SplashScreen } from '@/components/SplashScreen';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { needsSecondFactor, verifiedTotp, verifyCode, cleanCode } from '@/lib/mfa';

/**
 * MfaGate — after the password (or Google), a user who turned on
 * two-factor sign-in gives the 6-digit code before any protected page
 * opens (owner's tests 21/11/2026, D1; lib/mfa.js). Everyone else goes
 * straight through.
 */
// The last user who passed, so moving between pages does not show the
// splash screen again (owner, 23/10/2026); the check still runs.
let passedFor = null;

export function MfaGate({ children }) {
  const { user, signOut } = useAuth();
  const [state, setState] = useState(passedFor && passedFor === user?.id ? 'ok' : 'checking'); // checking | needed | ok
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    if (passedFor !== user?.id) setState('checking');
    needsSecondFactor().then((need) => {
      if (!alive) return;
      passedFor = need ? null : user?.id || null;
      setState(need ? 'needed' : 'ok');
    });
    return () => {
      alive = false;
    };
  }, [user?.id]);

  if (state === 'checking') return <SplashScreen />;
  if (state === 'ok') return children;

  const submit = async (e) => {
    e.preventDefault();
    const c = cleanCode(code);
    if (!c) {
      setError('Type the 6-digit code from your authenticator app.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const factor = await verifiedTotp();
      if (!factor) {
        setState('ok');
        return;
      }
      await verifyCode(factor.id, c);
      passedFor = user?.id || null;
      setState('ok');
    } catch (err) {
      setError(err?.message?.toLowerCase().includes('invalid') ? 'That code did not work. Try the newest one.' : err?.message || 'Could not check the code.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Two-factor sign-in
          </CardTitle>
          <CardDescription>Open your authenticator app and type the 6-digit code for SnapGain.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={7}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              aria-label="6-digit code"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={busy} className="flex-1">
                {busy ? 'Checking…' : 'Continue'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => signOut?.()}>
                Sign out
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default MfaGate;
