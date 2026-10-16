// PrivacyPolicyPage — UK GDPR / EU GDPR compliant disclosure.
//
// Structure follows ICO's recommended Privacy Notice layout (UK ICO
// "Right to be informed" guidance, Art. 13/14). Lists data controller,
// data collected, purposes, lawful bases, retention, third-party
// processors, rights, complaints to ICO, international transfers, and
// children's data.
//
// Last reviewed date is hard-coded (NOT new Date()) — Privacy Policies
// MUST show the actual last update so users can see what they agreed to.

import React from 'react';
import { Helmet } from 'react-helmet';

const LAST_UPDATED = '29 June 2026';

function PrivacyPolicyPage() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy — SnapGain</title>
        <meta
          name="description"
          content="How SnapGain (a trading name of Voce Lindx Ltd) collects, uses, and protects your personal data under UK GDPR and EU GDPR."
        />
      </Helmet>

      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-10">
          Last updated: {LAST_UPDATED}
        </p>

        <div className="prose prose-lg max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-bold mt-8 mb-3">1. Who we are</h2>
            <p className="text-muted-foreground">
              SnapGain is a trading name of <strong>Voce Lindx Ltd</strong>, a
              company registered in England and Wales under company number{' '}
              <strong>14321565</strong>, with its registered office at 3 Union
              Way, Flat 85 Ambrose House, London, England, NW10 6FH.
            </p>
            <p className="text-muted-foreground mt-3">
              Voce Lindx Ltd is the <strong>data controller</strong> for the
              personal data described in this notice. For any privacy-related
              question, request, or complaint you can email us at{' '}
              <a
                href="mailto:support@snapgain.uk"
                className="text-primary hover:underline"
              >
                support@snapgain.uk
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-3">2. What data we collect</h2>
            <p className="text-muted-foreground">
              We collect only what we need to run SnapGain and improve it.
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-muted-foreground">
              <li>
                <strong>Account data:</strong> email address, password (stored
                hashed by Supabase Auth), display name, phone (optional).
              </li>
              <li>
                <strong>Subscription data:</strong> Stripe customer ID,
                subscription status, trial end date, current billing period. We
                do <em>not</em> store your card details — Stripe holds them.
              </li>
              <li>
                <strong>Usage data:</strong> stores you favourite, strategies
                you save, simulator inputs, search history. Used to tailor
                recommendations and improve the product.
              </li>
              <li>
                <strong>Technical data:</strong> IP address, browser type,
                device type, pages visited, referrer URL, timestamps. Logged
                automatically by our infrastructure providers.
              </li>
              <li>
                <strong>Marketing attribution:</strong> UTM parameters and
                referrer captured at first visit (90-day window) so we can see
                which channels bring people to SnapGain.
              </li>
              <li>
                <strong>Error reports:</strong> stack traces and the URL where
                an error happened (no personal content), captured by Sentry to
                help us fix bugs.
              </li>
              <li>
                <strong>Cookies:</strong> see the{' '}
                <a href="/cookie-policy" className="text-primary hover:underline">
                  Cookie Policy
                </a>{' '}
                for the full list.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-3">3. Why we process it (lawful bases)</h2>
            <p className="text-muted-foreground">
              UK GDPR Article 6 requires us to identify a lawful basis for each
              processing activity:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-muted-foreground">
              <li>
                <strong>Performance of a contract</strong> (Art. 6(1)(b)): to
                provide the service you signed up for — account creation,
                login, subscription management, delivering features you paid
                for.
              </li>
              <li>
                <strong>Legitimate interests</strong> (Art. 6(1)(f)): product
                analytics, abuse prevention, fixing bugs, attribution. Balanced
                against your privacy by anonymising where possible and never
                selling data.
              </li>
              <li>
                <strong>Consent</strong> (Art. 6(1)(a)): non-essential cookies
                (analytics, attribution) and marketing emails. You can withdraw
                consent at any time in Settings or via the cookie banner.
              </li>
              <li>
                <strong>Legal obligation</strong> (Art. 6(1)(c)): tax records,
                accounting records, and responding to lawful regulator requests.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-3">4. Who processes your data on our behalf</h2>
            <p className="text-muted-foreground">
              We use vetted third parties to run the service. Each is a "data
              processor" under UK GDPR and has its own privacy commitments:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-muted-foreground">
              <li>
                <strong>Supabase</strong> (database + authentication + email
                delivery). Hosted in the EU (Ireland, eu-west-2).
              </li>
              <li>
                <strong>Vercel</strong> (web hosting + static assets + CDN).
              </li>
              <li>
                <strong>Stripe</strong> (payment processing + subscription
                billing). PCI-DSS certified; we never see your card numbers.
              </li>
              <li>
                <strong>Resend</strong> (transactional + digest emails). Stores
                send logs for deliverability monitoring.
              </li>
              <li>
                <strong>Sentry</strong> (error tracking). We disable PII capture
                by default — only your user ID is attached to error reports.
              </li>
              <li>
                <strong>Google Analytics 4</strong> (aggregate usage analytics).
                Loaded only after you accept analytics cookies. IP
                anonymisation enabled; no advertising cookies.
              </li>
              <li>
                <strong>hCaptcha</strong> (signup bot protection). EU-based
                alternative to reCAPTCHA, no Google tracking.
              </li>
              <li>
                <strong>Affiliate networks</strong> (Quidco, JamDoughnut,
                Awin-style partners) — when you click through to a partner site
                they place their own cookies. We don't see your purchases,
                only the fact that a click happened.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-3">5. How long we keep it (retention)</h2>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-muted-foreground">
              <li>
                <strong>Account data:</strong> kept while your account is open.
                Deleted within 30 days of account closure (unless we need it
                for legal/tax reasons — see below).
              </li>
              <li>
                <strong>Billing records:</strong> kept for 6 years after the
                last transaction, per HMRC requirements.
              </li>
              <li>
                <strong>Error reports (Sentry):</strong> 90 days, then
                permanently deleted.
              </li>
              <li>
                <strong>Analytics:</strong> 14 months (GA4 default).
              </li>
              <li>
                <strong>Email logs (Resend):</strong> 30 days.
              </li>
              <li>
                <strong>Marketing attribution:</strong> 90 days from first
                visit, then expired.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-3">6. Your rights (UK GDPR Articles 15–22)</h2>
            <p className="text-muted-foreground">You have the right to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-muted-foreground">
              <li><strong>Access</strong> the personal data we hold about you</li>
              <li><strong>Rectify</strong> inaccurate or incomplete data</li>
              <li><strong>Erase</strong> your data ("right to be forgotten") subject to legal-retention exceptions</li>
              <li><strong>Restrict</strong> our processing of your data</li>
              <li><strong>Object</strong> to processing based on legitimate interests</li>
              <li><strong>Data portability</strong> — receive your data in a machine-readable format</li>
              <li><strong>Withdraw consent</strong> at any time where consent is the lawful basis</li>
              <li><strong>Not be subject</strong> to solely automated decisions with legal effect (we don't do this)</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              To exercise any of these, email{' '}
              <a href="mailto:support@snapgain.uk" className="text-primary hover:underline">
                support@snapgain.uk
              </a>{' '}
              with "Data request" in the subject line. We respond within 30
              days (UK GDPR statutory timeframe), free of charge.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-3">7. Complaints to the regulator</h2>
            <p className="text-muted-foreground">
              If you believe we've mishandled your data and our response
              doesn't satisfy you, you can complain to the UK's data
              protection regulator, the Information Commissioner's Office (ICO):
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground">
              <li>Website: <a href="https://ico.org.uk/concerns" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ico.org.uk/concerns</a></li>
              <li>Helpline: 0303 123 1113</li>
              <li>Post: Information Commissioner's Office, Wycliffe House, Water Lane, Wilmslow, Cheshire, SK9 5AF</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              EU residents can complain to their local supervisory authority.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-3">8. International transfers</h2>
            <p className="text-muted-foreground">
              Most of our infrastructure runs in the EU (Supabase eu-west-2 in
              Ireland). Some processors (Stripe, Sentry, Google Analytics,
              Vercel) are US-headquartered and may process data outside the
              UK/EU. Where they do, the transfer relies on Standard
              Contractual Clauses (SCCs) or the EU–US Data Privacy Framework,
              both recognised by the UK and EU as providing adequate safeguards.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-3">9. Children</h2>
            <p className="text-muted-foreground">
              SnapGain is not directed at children. We do not knowingly
              collect personal data from anyone under 18. If you believe a
              child has provided us data, contact us and we'll delete it.
              Account holders must be 18 or older because the service involves
              financial decisions and payment processing.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-3">10. Security and data breaches</h2>
            <p className="text-muted-foreground">
              We use industry-standard security: TLS in transit, row-level
              security on the database, hashed passwords, JWT-based
              authentication, optional 2-factor authentication, and quarantine
              of leaked credentials via Have I Been Pwned. No system is 100%
              secure; if a breach affects your data we will notify the ICO
              within 72 hours (UK GDPR Art. 33) and you directly if the
              breach is likely to result in high risk to you (Art. 34).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-3">11. Marketing emails</h2>
            <p className="text-muted-foreground">
              We send transactional emails (signup confirmation, password
              reset, billing receipts) on the lawful basis of contract.
              Optional product emails like the daily boost digest are sent
              with your consent and can be turned off any time in Settings,
              or by clicking the unsubscribe link at the bottom of any
              email.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-3">12. Changes to this policy</h2>
            <p className="text-muted-foreground">
              We may update this policy when we add features, change
              processors, or in response to legal changes. The "Last
              updated" date above always reflects the current version.
              Material changes (e.g. new categories of data, new
              processors) will be flagged in-app before they take effect.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}

export default PrivacyPolicyPage;
