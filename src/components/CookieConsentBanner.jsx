import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  getConsentRecord,
  setConsent,
  OPEN_COOKIE_SETTINGS_EVENT,
} from '@/lib/observability';

// Cookie / storage consent banner (UK GDPR + PECR).
//
// Behaviour:
//   - Shows until the visitor makes a choice. "Reject non-essential" and
//     "Accept all" are equally prominent (ICO guidance: rejecting must be
//     as easy as accepting).
//   - "Choose" opens per-category toggles: Analytics (Google Analytics 4
//     + Sentry session replay on errors) and Marketing attribution
//     (campaign/UTM parameters and ad click IDs). Both default OFF.
//   - Strictly necessary storage (sign-in session, this choice, display
//     preferences) is always on and needs no consent.
//   - The footer "Cookie settings" link reopens this panel at any time
//     (observability.openCookieSettings → OPEN_COOKIE_SETTINGS_EVENT).
//   - Withdrawing analytics deletes GA cookies and stops GA4 + replay;
//     withdrawing marketing clears the stored UTM snapshot. See
//     lib/observability.js.

function Toggle({ id, checked, onChange, label, description, disabled = false }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-t first:border-t-0">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-semibold text-foreground">
          {label}
        </label>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <input
        id={id}
        type="checkbox"
        role="switch"
        className="mt-1 h-5 w-5 shrink-0 accent-primary disabled:opacity-60"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        aria-checked={checked}
      />
    </div>
  );
}

function CookieConsentBanner() {
  const [show, setShow] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  const loadCurrent = useCallback(() => {
    const rec = getConsentRecord();
    setAnalytics(!!rec?.analytics);
    setMarketing(!!rec?.marketing);
    return rec;
  }, []);

  useEffect(() => {
    if (!loadCurrent()) setShow(true);
    const reopen = () => {
      loadCurrent();
      setExpanded(true);
      setShow(true);
    };
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
  }, [loadCurrent]);

  if (!show) return null;

  const decide = (value) => {
    setConsent(value);
    setShow(false);
    setExpanded(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      className="fixed bottom-0 inset-x-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-lg max-h-[85vh] overflow-y-auto"
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-6">
          <div className="flex-1 text-sm text-muted-foreground">
            <p id="cookie-consent-title" className="font-semibold text-foreground mb-1">
              Cookies and similar technologies
            </p>
            <p>
              We use strictly necessary storage to keep you signed in and
              remember your settings. With your permission we would also
              like to use Google Analytics (and error session replay) to
              see how the site is used, and to remember which campaign
              brought you here. These are off unless you turn them on, and
              you can change your mind at any time via "Cookie settings" in
              the footer.{' '}
              <Link to="/cookie-policy" className="underline text-foreground">
                Cookie Policy
              </Link>
              .
            </p>
          </div>
          {!expanded && (
            <div className="flex flex-wrap gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => decide('rejected')}>
                Reject non-essential
              </Button>
              <Button variant="outline" size="sm" onClick={() => setExpanded(true)}>
                Choose
              </Button>
              <Button size="sm" onClick={() => decide('accepted')}>
                Accept all
              </Button>
            </div>
          )}
        </div>

        {expanded && (
          <div className="mt-3 rounded-lg border bg-card px-4 py-1">
            <Toggle
              id="consent-necessary"
              checked
              disabled
              label="Strictly necessary (always on)"
              description="Sign-in session, your cookie choice, display preferences and the plan you picked before signing up. The site does not work without these."
            />
            <Toggle
              id="consent-analytics"
              checked={analytics}
              onChange={setAnalytics}
              label="Analytics"
              description="Google Analytics 4 cookies (_ga, _ga_*) to count visits and see which pages help, plus Sentry session replay (text masked) when an error happens."
            />
            <Toggle
              id="consent-marketing"
              checked={marketing}
              onChange={setMarketing}
              label="Marketing attribution"
              description="Remembers the campaign link that brought you here (utm_* parameters, referral code and ad click IDs) for 90 days, and links it to your account if you sign up."
            />
            <div className="flex flex-wrap justify-end gap-2 py-3 border-t">
              <Button variant="outline" size="sm" onClick={() => decide('rejected')}>
                Reject non-essential
              </Button>
              <Button size="sm" onClick={() => decide({ analytics, marketing })}>
                Save my choices
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CookieConsentBanner;
