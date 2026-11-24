// ReferralCode — "Use code DENYD11D when you sign up — you get £25 after
// your first rent payment" with a Copy code button, under an "Open X"
// button (handover "testes reais", 24/11/2026, task 2). Several apps give
// the bonus only when the code is typed at sign-up, and the links do not
// carry it.
import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { referralLine } from '@/lib/affiliateLinks';
import { cn } from '@/lib/utils';

export function ReferralCode({ referral, className = '' }) {
  const [copied, setCopied] = useState(false);
  const line = referralLine(referral);
  if (!line) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(referral.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className={cn('rounded-md border border-dashed border-primary/40 bg-light-pink/30 px-3 py-2 text-xs space-y-1', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1">
          Use code <strong className="font-mono text-sm tracking-wide">{referral.code}</strong> when you sign up
          {referral.reward ? <> — you get {referral.reward}</> : null}
        </span>
        <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs shrink-0" onClick={copy}>
          {copied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
          {copied ? 'Copied' : 'Copy code'}
        </Button>
      </div>
      {referral.note && <div className="text-muted-foreground">{referral.note}</div>}
    </div>
  );
}
