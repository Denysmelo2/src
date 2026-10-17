// CookiePolicyPage: cookies and similar technologies (local storage,
// session storage) under PECR reg 6, as amended by the Data (Use and
// Access) Act 2025, and UK GDPR.
//
// Rewritten 17 October 2026 (legal package C). Keep the table in sync
// with the code:
//   - consent record:      lib/observability.js  CONSENT_KEY
//   - UTM attribution:     lib/utmTracking.js    STORAGE_KEY ('snapgain.utm')
//   - display preferences: lib/userPrefs.js      LS_KEY ('snapgain:prefs:<id>')
//   - pending checkout:    components/SubscribeButton.jsx ('pendingCheckout')
//   - Supabase session:    default auth-js key 'sb-<project ref>-auth-token'
//   - GA4 + Sentry Replay: lib/observability.js (consent-gated)
// Google Analytics stays behind consent: the DUAA 2025 exemption for
// statistics cookies is not relied on, because GA4 is a third party.

import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { openCookieSettings } from '@/lib/observability';

const LAST_UPDATED = '17 October 2026';

const H2 = ({ id, children }) => (
  <h2 id={id} className="text-2xl font-bold mt-10 mb-3 scroll-mt-24">
    {children}
  </h2>
);
const P = ({ children, className = '' }) => (
  <p className={`text-muted-foreground mt-3 ${className}`}>{children}</p>
);

const ROWS = [
  // [name, set by, type, purpose, duration, category]
  [
    'sb-ffowgyjdbgkphsflxybk-auth-token',
    'SnapGain (Supabase)',
    'Local storage',
    'Keeps you signed in.',
    'Until you sign out',
    'Strictly necessary',
  ],
  [
    'snapgain.cookieConsent',
    'SnapGain',
    'Local storage',
    'Remembers your cookie choices and when you made them.',
    'Until you change them or clear your browser',
    'Strictly necessary',
  ],
  [
    'snapgain:prefs:<account id>',
    'SnapGain',
    'Local storage',
    'Remembers display and accessibility settings (theme, font size, language).',
    'Until you clear your browser',
    'Strictly necessary',
  ],
  [
    'pendingCheckout',
    'SnapGain',
    'Local storage',
    'Remembers the plan you picked if you sign up before paying, so we can take you back to checkout.',
    'Removed when you are taken back to checkout, or when you clear your browser',
    'Strictly necessary',
  ],
  [
    'Stripe cookies (e.g. __stripe_mid, __stripe_sid)',
    'Stripe',
    'Cookies',
    'Fraud prevention and secure payment. Set on Stripe\u2019s own checkout and billing pages (checkout.stripe.com, billing.stripe.com), not on snapgain.uk.',
    'Up to 1 year',
    'Strictly necessary (payments)',
  ],
  [
    'hCaptcha cookies (e.g. hmt_id)',
    'hCaptcha',
    'Cookies',
    'Bot protection, only on forms where we switch hCaptcha on.',
    'Up to 1 year',
    'Strictly necessary (security)',
  ],
  [
    '_ga',
    'Google Analytics',
    'Cookie',
    'Distinguishes visitors so we can count visits and see which pages help.',
    '2 years',
    'Analytics (consent)',
  ],
  [
    '_ga_<ID>',
    'Google Analytics',
    'Cookie',
    'Keeps track of the current visit for Google Analytics 4.',
    '2 years',
    'Analytics (consent)',
  ],
  [
    'sentryReplaySession',
    'Sentry',
    'Session storage',
    'Lets Sentry record a short, text-masked replay of the screen when an error happens, so we can fix it.',
    'Until you close the tab',
    'Analytics (consent)',
  ],
  [
    'snapgain.utm',
    'SnapGain',
    'Local and session storage',
    'Remembers the campaign link that brought you here (utm_* parameters, referral code, gclid, fbclid, landing page, referring site). If you sign up, it is linked to your account.',
    '90 days, or until you withdraw consent',
    'Marketing attribution (consent)',
  ],
];

function CookiePolicyPage() {
  return (
    <>
      <Helmet>
        <title>Cookie Policy — SnapGain</title>
        <meta
          name="description"
          content="The cookies and browser storage SnapGain uses, why, and how to change your choices."
        />
      </Helmet>

      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">
          Cookie Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-10">
          Last updated: {LAST_UPDATED}
        </p>

        <section>
          <H2 id="what">1. What this covers</H2>
          <P>
            Cookies are small files a website saves on your device. Websites can
            also save information in your browser&rsquo;s local storage or
            session storage. This policy covers all of these. It is part of our{' '}
            <Link to="/privacy-policy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            , which explains how we use personal data. SnapGain is a trading
            name of Denys Ferreira Goncalves de Melo, a sole trader
            (support@snapgain.uk).
          </P>
        </section>

        <section>
          <H2 id="categories">2. The types we use</H2>
          <P>
            <strong>Strictly necessary.</strong> Needed to provide the service
            you ask for: keeping you signed in, remembering your choices and
            settings, payments and security. The law doesn&rsquo;t require
            consent for these, and the site won&rsquo;t work properly without
            them.
          </P>
          <P>
            <strong>Analytics (only with your consent).</strong> Google Analytics
            4 helps us understand how people use SnapGain. We configure it
            without advertising features (no ad storage, no ad personalisation)
            and with IP anonymisation. With the same consent, Sentry can record a
            short replay of the screen, with all text masked, when an error
            happens. Sentry&rsquo;s basic error reports don&rsquo;t use cookies
            and run without consent so we can keep the service working; see the
            Privacy Policy.
          </P>
          <P>
            <strong>Marketing attribution (only with your consent).</strong> We
            remember which campaign link brought you to SnapGain so we know which
            content works. Nothing is saved until you agree.
          </P>
          <P>
            <strong>What we don&rsquo;t use.</strong> No advertising or
            retargeting cookies and no social-media tracking pixels on SnapGain.
          </P>
        </section>

        <section>
          <H2 id="list">3. The full list</H2>
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-3 font-semibold">Name</th>
                  <th className="text-left py-2 pr-3 font-semibold">Set by</th>
                  <th className="text-left py-2 pr-3 font-semibold">Type</th>
                  <th className="text-left py-2 pr-3 font-semibold">Purpose</th>
                  <th className="text-left py-2 pr-3 font-semibold">Duration</th>
                  <th className="text-left py-2 font-semibold">Category</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {ROWS.map(([name, by, type, purpose, duration, category]) => (
                  <tr key={name} className="border-b border-border/40 align-top">
                    <td className="py-2 pr-3"><code className="break-all">{name}</code></td>
                    <td className="py-2 pr-3">{by}</td>
                    <td className="py-2 pr-3">{type}</td>
                    <td className="py-2 pr-3">{purpose}</td>
                    <td className="py-2 pr-3">{duration}</td>
                    <td className="py-2">{category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <H2 id="partners">4. Partner sites</H2>
          <P>
            When you click a link to a cashback, gift-card, loyalty or bank
            partner, you go to their website or app. They (and any affiliate
            network that tracks the referral) may set their own cookies there,
            for example to credit SnapGain with a commission. Those cookies are
            set on their domains, not ours, and their own cookie policies apply.
          </P>
        </section>

        <section>
          <H2 id="choices">5. Changing your mind</H2>
          <P>
            You can change or withdraw your choices at any time with{' '}
            <strong>Cookie settings</strong> in the footer of every page, or
            here:
          </P>
          <div className="mt-3">
            <button
              type="button"
              onClick={openCookieSettings}
              className="inline-flex items-center rounded-md border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10"
            >
              Open cookie settings
            </button>
          </div>
          <P>
            If you withdraw analytics consent we stop Google Analytics and
            Sentry replay straight away and delete the Google Analytics cookies
            (_ga, _ga_*) from this site. If you withdraw marketing attribution
            consent we delete the stored campaign data from your browser. You
            can also block or delete cookies in your browser settings, but
            blocking strictly necessary storage will stop you signing in.
          </P>
        </section>

        <section>
          <H2 id="changes">6. Changes</H2>
          <P>
            If we add or change cookies we will update this page and the
            &ldquo;Last updated&rdquo; date. If we add a new optional category
            we will ask for your consent again.
          </P>
        </section>

        <section>
          <H2 id="contact">7. Contact</H2>
          <P>
            Questions? Email{' '}
            <a href="mailto:support@snapgain.uk" className="text-primary hover:underline">
              support@snapgain.uk
            </a>
            .
          </P>
        </section>
      </div>
    </>
  );
}

export default CookiePolicyPage;
