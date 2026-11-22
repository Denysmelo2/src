import React, { useEffect, useState } from 'react';
import { Shield, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { verifiedTotp, startTotpEnroll, verifyCode, disableTotp, cleanCode } from '@/lib/mfa';

/**
 * Two-factor sign-in with an authenticator app (owner's tests
 * 21/11/2026, D1; lib/mfa.js). Replaces a switch that only wrote to
 * localStorage. On: scan the QR code, type the code. Off: type a code.
 */
export function TwoFactorSection() {
  const { toast } = useToast();
  const [factor, setFactor] = useState(undefined); // undefined = loading, null = off
  const [enroll, setEnroll] = useState(null); // { factorId, qrCode, secret }
  const [disabling, setDisabling] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const reload = () =>
    verifiedTotp()
      .then(setFactor)
      .catch(() => setFactor(null));
  useEffect(() => {
    reload();
  }, []);

  const reset = () => {
    setEnroll(null);
    setDisabling(false);
    setCode('');
    setError(null);
  };

  const begin = async () => {
    setBusy(true);
    setError(null);
    try {
      setEnroll(await startTotpEnroll());
    } catch (err) {
      setError(err?.message || 'Could not start. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (e) => {
    e.preventDefault();
    const c = cleanCode(code);
    if (!c) return setError('Type the 6-digit code from your authenticator app.');
    setBusy(true);
    setError(null);
    try {
      if (enroll) {
        await verifyCode(enroll.factorId, c);
        toast({ title: 'Two-factor sign-in is on', description: 'From now on SnapGain asks for a code from your app when you sign in.' });
      } else if (disabling && factor) {
        await disableTotp(factor.id, c);
        toast({ title: 'Two-factor sign-in is off' });
      }
      reset();
      await reload();
    } catch (err) {
      setError(err?.message?.toLowerCase().includes('invalid') ? 'That code did not work. Try the newest one.' : err?.message || 'Could not check the code.');
    } finally {
      setBusy(false);
    }
  };

  const on = !!factor;
  return (
    <Card id="two-factor">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          {on ? <ShieldCheck className="w-5 h-5 text-emerald-600" /> : <Shield className="w-5 h-5 text-primary" />}
          Two-factor sign-in
        </CardTitle>
        <CardDescription>
          {on
            ? 'On. SnapGain asks for a 6-digit code from your authenticator app when you sign in.'
            : 'Off. Turn it on to ask for a 6-digit code from an authenticator app (Google Authenticator, 1Password, Authy…) when you sign in.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {factor === undefined ? (
          <p className="text-sm text-muted-foreground">Checking…</p>
        ) : enroll ? (
          <form onSubmit={confirm} className="space-y-3">
            <p className="text-sm">1. Scan this code with your authenticator app.</p>
            <img src={enroll.qrCode} alt="QR code for your authenticator app" className="w-44 h-44 border rounded-md bg-white p-2" />
            <p className="text-xs text-muted-foreground break-all">
              Can&rsquo;t scan? Type this key in the app: <span className="font-mono">{enroll.secret}</span>
            </p>
            <p className="text-sm">2. Type the 6-digit code it shows.</p>
            <Input inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" aria-label="6-digit code" className="max-w-[10rem]" />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>{busy ? 'Checking…' : 'Turn on'}</Button>
              <Button type="button" variant="ghost" onClick={reset} disabled={busy}>Cancel</Button>
            </div>
          </form>
        ) : disabling ? (
          <form onSubmit={confirm} className="space-y-3">
            <p className="text-sm">Type a code from your authenticator app to turn two-factor sign-in off.</p>
            <Input inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" aria-label="6-digit code" className="max-w-[10rem]" />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" variant="destructive" disabled={busy}>{busy ? 'Checking…' : 'Turn off'}</Button>
              <Button type="button" variant="ghost" onClick={reset} disabled={busy}>Cancel</Button>
            </div>
          </form>
        ) : (
          <>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {on ? (
              <Button variant="outline" onClick={() => setDisabling(true)}>Turn off</Button>
            ) : (
              <Button onClick={begin} disabled={busy}>{busy ? 'Starting…' : 'Turn on'}</Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default TwoFactorSection;
