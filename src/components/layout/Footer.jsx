import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { openCookieSettings } from '@/lib/observability';

export function Footer() {
  const { user } = useAuth();
  // Signed-in users clicking the footer logo should land on their
  // dashboard, not the visitor marketing page.
  const homeHref = user ? '/home' : '/';
  return (
    <footer className="bg-background border-t">
      <div className="container mx-auto px-3 md:px-4 py-6 md:py-10">
        {/* 2026-07-05 (Bárbara): match the desktop shape on mobile —
            brand block left (logo above tagline) with the three link
            columns aligned to the right, still in 4 columns. Just
            tighter fonts, smaller logo, and smaller gaps so it fits
            a 375px viewport. Desktop layout is unchanged (larger
            logo + text as before). */}
        <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-3 md:gap-8 md:grid-cols-4">
          {/* Brand block — logo on top, tagline below */}
          <div className="md:col-span-1">
            <Link to={homeHref} aria-label="SnapGain home" className="inline-block mb-2 md:mb-4">
              <img
                src="/snapgain-bigger.png"
                alt="SnapGain"
                className="h-12 md:h-24 w-auto object-contain"
              />
            </Link>
            <p className="text-muted-foreground text-[10px] md:text-sm leading-snug">
              {/* Mobile: break in 3 so the brand column is narrower,
                  which gives the three link columns (and the support
                  email) more horizontal room. Desktop: keep the 2-line
                  wrap it had before. */}
              <span className="md:hidden">
                Helping you save
                <br />
                and earn more
                <br />
                through smart strategy.
              </span>
              <span className="hidden md:inline">
                Helping you save and earn more
                <br />
                through smart strategy.
              </span>
            </p>
          </div>

          {/* Company */}
          <div>
            <p className="font-semibold mb-2 md:mb-3 text-xs md:text-base">Company</p>
            <nav className="flex flex-col space-y-1.5 md:space-y-2">
              <Link to="/features" className="text-[11px] md:text-sm text-muted-foreground hover:text-primary">Features</Link>
              <Link to="/pricing" className="text-[11px] md:text-sm text-muted-foreground hover:text-primary">Pricing</Link>
              <Link to="/about" className="text-[11px] md:text-sm text-muted-foreground hover:text-primary">About</Link>
            </nav>
          </div>

          {/* Support */}
          <div>
            <p className="font-semibold mb-2 md:mb-3 text-xs md:text-base">Support</p>
            <nav className="flex flex-col space-y-1.5 md:space-y-2">
              <Link to="/faq" className="text-[11px] md:text-sm text-muted-foreground hover:text-primary">FAQ</Link>
              <Link to="/contact" className="text-[11px] md:text-sm text-muted-foreground hover:text-primary">Contact</Link>
              <a
                href="mailto:support@snapgain.uk"
                className="text-[11px] md:text-sm text-muted-foreground hover:text-primary break-all"
              >
                support@snapgain.uk
              </a>
            </nav>
          </div>

          {/* Legal */}
          <div>
            <p className="font-semibold mb-2 md:mb-3 text-xs md:text-base">Legal</p>
            <nav className="flex flex-col space-y-1.5 md:space-y-2">
              <Link to="/terms-of-service" className="text-[11px] md:text-sm text-muted-foreground hover:text-primary">Terms</Link>
              <Link to="/privacy-policy" className="text-[11px] md:text-sm text-muted-foreground hover:text-primary">Privacy</Link>
              <Link to="/cookie-policy" className="text-[11px] md:text-sm text-muted-foreground hover:text-primary">Cookies</Link>
              <Link to="/refund-policy" className="text-[11px] md:text-sm text-muted-foreground hover:text-primary">Refunds</Link>
              {/* Reopens the consent banner so visitors can change or
                  withdraw their choice at any time (PECR / UK GDPR). */}
              <button
                type="button"
                onClick={openCookieSettings}
                className="text-left text-[11px] md:text-sm text-muted-foreground hover:text-primary"
              >
                Cookie settings
              </button>
              <Link to="/contact" className="text-[11px] md:text-sm text-muted-foreground hover:text-primary">Contact</Link>
            </nav>
          </div>
        </div>

        {/* Trader identity (Consumer Contracts Regulations 2013 /
            Electronic Commerce Regulations 2002: name, geographic
            address and email must be easy to find). Sole trader, not a
            company: do NOT add a company name or number here. */}
        <div className="text-center text-muted-foreground text-[10px] md:text-xs mt-6 md:mt-10 border-t pt-4 md:pt-6 space-y-1.5 leading-relaxed">
          <p>
            SnapGain is a trading name of Denys Ferreira Goncalves de Melo
            (sole trader), 3 Union Way, Ambrose House, London NW10 6FH,
            United Kingdom ·{' '}
            <a href="mailto:support@snapgain.uk" className="hover:text-primary underline">
              support@snapgain.uk
            </a>
          </p>
          <p>
            Some links on SnapGain are affiliate links. If you sign up or
            buy through one, we earn a commission. It doesn't change the
            price you pay.
          </p>
          <p>© {new Date().getFullYear()} SnapGain. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
