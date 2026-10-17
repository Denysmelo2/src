import React from 'react';
import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

// Affiliate disclosure shown near outbound partner links (CAP Code
// rules 2.1 / 2.4 and ASA guidance on affiliate marketing: the
// commercial relationship must be obvious before the click, not only
// in the Terms). Keep the wording plain and unconditional; SnapGain is
// a paid product, so never say commissions "keep it free".
//
// Outbound partner anchors should also carry rel="sponsored noopener
// noreferrer" (see AFFILIATE_REL).

export const AFFILIATE_REL = 'sponsored noopener noreferrer';

export function AffiliateDisclosure({ className, compact = false }) {
  return (
    <div
      role="note"
      className={cn(
        'flex items-start gap-2 rounded-md border border-border bg-muted/40 text-muted-foreground',
        compact ? 'px-3 py-2 text-xs' : 'px-3.5 py-2.5 text-xs md:text-sm',
        className
      )}
    >
      <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" aria-hidden="true" />
      <p>
        <strong className="text-foreground">Affiliate links:</strong> we earn a
        commission if you sign up or buy through some links on this page. It
        doesn&rsquo;t change the price you pay.{' '}
        <Link to="/terms-of-service#affiliates" className="underline hover:text-primary">
          How we make money
        </Link>
      </p>
    </div>
  );
}

export default AffiliateDisclosure;
