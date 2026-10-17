// PrivacyPolicyPage: privacy notice under UK GDPR and the Data
// Protection Act 2018, as amended by the Data (Use and Access) Act 2025.
//
// Structure follows the ICO "right to be informed" checklist (UK GDPR
// Arts 13/14): controller identity and contact, data collected, purposes
// and lawful bases, recipients, international transfers, retention,
// rights, complaints (to us first, then the ICO), automated decisions,
// children and changes.
//
// Rewritten 17 October 2026 (legal package C). Owner decisions:
//   - SnapGain is a trading name of a SOLE TRADER. Never name a company,
//     company number or "SnapGain Ltd" here.
//   - Not VAT-registered.
//   - TODO(owner): ICO data protection fee. Not registered yet. When the
//     registration number is issued, add a line to section 1 such as
//     "ICO registration number: ZBxxxxxxx". Do not show "pending".
//
// A UK solicitor should review the final wording before it is relied on.
//
// LAST_UPDATED is hard-coded on purpose: it must show the date the text
// actually changed.

import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';

const LAST_UPDATED = '17 October 2026';

const H2 = ({ id, children }) => (
  <h2 id={id} className="text-2xl font-bold mt-10 mb-3 scroll-mt-24">
    {children}
  </h2>
);
const P = ({ children, className = '' }) => (
  <p className={`text-muted-foreground mt-3 ${className}`}>{children}</p>
);
const UL = ({ children }) => (
  <ul className="list-disc pl-6 mt-2 space-y-2 text-muted-foreground">{children}</ul>
);
const Mail = ({ subject }) => (
  <a
    href={`mailto:support@snapgain.uk${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`}
    className="text-primary hover:underline"
  >
    support@snapgain.uk
  </a>
);

const Table = ({ head, rows }) => (
  <div className="overflow-x-auto mt-3">
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b border-border">
          {head.map((h) => (
            <th key={h} className="text-left py-2 pr-3 font-semibold align-bottom">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="text-muted-foreground">
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-border/40 align-top">
            {r.map((c, j) => (
              <td key={j} className="py-2 pr-3">
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const TRANSFER =
  'UK International Data Transfer Agreement/Addendum or the UK Extension to the EU–US Data Privacy Framework, as applicable';

function PrivacyPolicyPage() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy — SnapGain</title>
        <meta
          name="description"
          content="How SnapGain collects, uses and protects your personal data under UK GDPR and the Data Protection Act 2018, and how to use your rights."
        />
      </Helmet>

      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-10">
          Last updated: {LAST_UPDATED}
        </p>

        <div className="max-w-none">
          <section>
            <H2 id="who-we-are">1. Who we are</H2>
            <P>
              SnapGain is a trading name of{' '}
              <strong>Denys Ferreira Goncalves de Melo</strong>, a sole trader
              based in England. He is the <strong>data controller</strong> for
              the personal data described in this policy, which means he decides
              how and why it is used. In this policy &ldquo;SnapGain&rdquo;,
              &ldquo;we&rdquo;, &ldquo;us&rdquo; and &ldquo;our&rdquo; mean him.
            </P>
            <UL>
              <li>Address: 3 Union Way, Ambrose House, London NW10 6FH, United Kingdom</li>
              <li>
                Email (including data protection requests): <Mail subject="Data protection" />
              </li>
            </UL>
            {/* TODO(owner): add "ICO registration number: ..." here once the
                data protection fee is paid and the number is issued. */}
            <P>
              SnapGain is a small business, so we have not appointed a data
              protection officer. Your requests go straight to the person
              responsible.
            </P>
          </section>

          <section>
            <H2 id="data">2. The personal data we collect</H2>
            <UL>
              <li>
                <strong>Account data:</strong> your email address, your name,
                your password (stored only in hashed form by our authentication
                provider) and, <em>only if you choose to give it</em>, a UK
                phone number.
              </li>
              <li>
                <strong>Google sign-in data:</strong> if you sign in with Google,
                Google shares your name, email address, profile picture and a
                Google account identifier with us. We don&rsquo;t receive your
                Google password.
              </li>
              <li>
                <strong>Subscription data:</strong> your plan, subscription
                status, trial end date, billing period, and the customer and
                subscription identifiers Stripe gives us. We never see or store
                your full card details; Stripe handles them.
              </li>
              <li>
                <strong>Content and preferences you give us:</strong> favourite
                stores, saved strategies, your wallet (the cards, banks and
                programmes you tell us you use), alerts, display and
                accessibility settings, and email preferences.
              </li>
              <li>
                <strong>Messages:</strong> anything you send us by email,
                including complaints and requests.
              </li>
              <li>
                <strong>Technical data:</strong> IP address, browser and device
                type, pages requested, timestamps and error logs, recorded
                automatically by our hosting, database and error-monitoring
                providers.
              </li>
              <li>
                <strong>Error reports:</strong> when something breaks, Sentry
                records the error, the page address, browser details and your
                account ID (not your email). If you allowed analytics cookies,
                it can also record a short, text-masked replay of the screen
                around the error.
              </li>
              <li>
                <strong>Analytics (only if you allow it):</strong> Google
                Analytics 4 usage data such as pages viewed, approximate
                location (country/city) and device information, linked to a
                random cookie identifier.
              </li>
              <li>
                <strong>Campaign attribution (only if you allow it):</strong>{' '}
                the campaign parameters in the link that brought you to SnapGain
                (utm_source, utm_medium, utm_campaign, utm_content, utm_term), a
                referral code, ad click identifiers (gclid, fbclid), the landing
                page and the referring site. If you then sign up, this is linked
                to your account.
              </li>
            </UL>
            <P>
              See our <Link to="/cookie-policy" className="text-primary hover:underline">Cookie Policy</Link>{' '}
              for the cookies and browser storage we use. We don&rsquo;t collect
              special category data (such as health data), and we don&rsquo;t
              ask for your bank login details.
            </P>
          </section>

          <section>
            <H2 id="purposes">3. Why we use your data and our lawful bases</H2>
            <P>
              UK GDPR requires a lawful basis for each use of personal data.
              These are ours:
            </P>
            <Table
              head={['What we do', 'Data used', 'Lawful basis']}
              rows={[
                [
                  'Create and run your account, sign you in (including with Google), and provide the comparison, wallet, strategy and alert features',
                  'Account, Google sign-in, content and preferences, technical',
                  'Contract (Art. 6(1)(b))',
                ],
                [
                  'Take payment, manage your subscription, refunds and cancellations',
                  'Account, subscription',
                  'Contract; legal obligation (Art. 6(1)(c)) for tax and accounting records',
                ],
                [
                  'Send service emails: sign-up confirmation, password reset, receipts, important changes to the service or these policies',
                  'Account',
                  'Contract; legitimate interests (Art. 6(1)(f)) in keeping you informed',
                ],
                [
                  'Send the optional daily boost email',
                  'Account, favourite stores',
                  'Consent (Art. 6(1)(a)): off until you switch it on in Settings',
                ],
                [
                  'Keep the service secure, prevent fraud, duplicate or abusive sign-ups (including using an optional phone number), and fix errors with Sentry',
                  'Account, technical, error reports',
                  'Legitimate interests in running a secure, working service',
                ],
                [
                  'Measure how the site is used with Google Analytics, and record error session replays',
                  'Analytics, error replays',
                  'Consent (Art. 6(1)(a)) via the cookie banner',
                ],
                [
                  'Understand which campaigns bring people to SnapGain',
                  'Campaign attribution',
                  'Consent (Art. 6(1)(a)) via the cookie banner',
                ],
                [
                  'Answer your questions, complaints and data protection requests',
                  'Messages, account',
                  'Legal obligation; legitimate interests',
                ],
                [
                  'Keep records and deal with legal claims',
                  'Account, subscription, messages',
                  'Legal obligation; legitimate interests',
                ],
              ]}
            />
            <P>
              Where we rely on legitimate interests, we have weighed them
              against your rights and you can object (see section 7). Where we
              rely on consent, you can withdraw it at any time: use
              &ldquo;Cookie settings&rdquo; in the footer for analytics and
              attribution, and Settings (or the link in each email) for the boost
              email. Withdrawing consent doesn&rsquo;t affect what happened
              before.
            </P>
            <P>
              We don&rsquo;t sell your personal data, we don&rsquo;t use it for
              third-party advertising, and we don&rsquo;t make decisions about
              you based solely on automated processing that have legal or
              similarly significant effects. The rankings SnapGain shows are
              calculated automatically, but they are suggestions you are free to
              ignore.
            </P>
          </section>

          <section>
            <H2 id="recipients">4. Who we share it with</H2>
            <P>
              We use the service providers below. Most act as our{' '}
              <strong>processors</strong>: they handle data only on our
              instructions and under a data processing agreement. Where a
              provider is an <strong>independent controller</strong>, its own
              privacy policy also applies.
            </P>
            {/* Locations: Supabase project ffowgyjdbgkphsflxybk is in
                eu-west-2 (London), confirmed via the Supabase dashboard/API on
                2026-10-17; re-confirm if the project moves. TODO(owner):
                confirm the Sentry region (DSN host ingest.sentry.io = US,
                ingest.de.sentry.io = EU) and the Resend sending region, and
                update the table if either is EU. */}
            <Table
              head={['Provider', 'What for', 'Role', 'Where / transfer safeguard']}
              rows={[
                [
                  'Supabase, Inc.',
                  'Database, authentication and server functions',
                  'Processor',
                  `Data stored in the UK (London). Supabase is a US company and may access data for support and operations under the ${TRANSFER}.`,
                ],
                [
                  'Vercel Inc.',
                  'Website hosting and content delivery',
                  'Processor',
                  `USA and global edge network, under the ${TRANSFER}.`,
                ],
                [
                  'Stripe (Stripe group companies, including Stripe, Inc.)',
                  'Payments and subscription billing',
                  'Independent controller for payment data (and processor for some billing tasks)',
                  `UK/EU and USA, under the ${TRANSFER}.`,
                ],
                [
                  'Resend (Plus Five Five, Inc.)',
                  'Sending account emails and the optional boost email',
                  'Processor',
                  `USA, under the ${TRANSFER}.`,
                ],
                [
                  'Sentry (Functional Software, Inc.)',
                  'Error monitoring; error session replay only with your consent',
                  'Processor',
                  `USA, under the ${TRANSFER}.`,
                ],
                [
                  'Google (Google Ireland Limited / Google LLC)',
                  'Google Analytics 4 (only with your consent)',
                  'Processor for analytics',
                  `EU and USA, under the ${TRANSFER}.`,
                ],
                [
                  'Google (Google LLC)',
                  'Sign in with Google, if you choose it',
                  'Independent controller for your Google account',
                  `USA, under the ${TRANSFER}.`,
                ],
                [
                  'hCaptcha (Intuition Machines, Inc.)',
                  'Bot protection on forms where we switch it on',
                  'Processor (and controller for its own security purposes)',
                  `USA, under the ${TRANSFER}.`,
                ],
              ]}
            />
            <P>
              <strong>Partner platforms.</strong> When you click a link to a
              cashback, gift-card, loyalty or bank partner, you leave SnapGain.
              That partner (and any affiliate network) is an independent
              controller and may set its own cookies. We don&rsquo;t pass them
              your account details, and we don&rsquo;t see what you buy; at most
              we receive commission reports that don&rsquo;t identify you.
            </P>
            <P>
              We may also share data if the law requires it (for example with
              HMRC or the police with a valid request), to protect our legal
              rights, or with a buyer if the business is ever transferred, in
              which case we will tell you first.
            </P>
          </section>

          <section>
            <H2 id="transfers">5. International transfers</H2>
            <P>
              Some providers above are based in, or access data from, the USA or
              other countries outside the UK. When personal data leaves the UK
              we rely on UK adequacy regulations where they exist (including
              the UK Extension to the EU&ndash;US Data Privacy Framework for
              certified US companies) or on the UK International Data Transfer
              Agreement or Addendum, as applicable. You can ask us for more
              detail about the safeguard used for a particular provider.
            </P>
          </section>

          <section>
            <H2 id="retention">6. How long we keep it</H2>
            {/* TODO(owner): confirm the Google Analytics data retention
                setting (Admin → Data retention) is 14 months, and the Sentry
                plan retention (up to 90 days). */}
            <Table
              head={['Data', 'How long']}
              rows={[
                [
                  'Account data, content and preferences',
                  'While your account is open. When you delete your account (in Settings, or by asking us), we delete it within 30 days, except records we must keep (below).',
                ],
                [
                  'Database backups',
                  'Backups roll over and are overwritten within 30 days, so deleted data disappears from backups within that time.',
                ],
                [
                  'Payment, invoice and tax records',
                  '6 years after the end of the tax year they relate to, to meet HMRC record-keeping rules and deal with claims.',
                ],
                [
                  'Server, hosting and email delivery logs',
                  'Short-term, normally no more than 30 days.',
                ],
                ['Sentry error reports and replays', 'Up to 90 days.'],
                ['Google Analytics data (if you consented)', 'Up to 14 months, then deleted by Google.'],
                [
                  'Campaign attribution (if you consented)',
                  'Up to 90 days in your browser. If you sign up, it is kept with your account record while your account is open.',
                ],
                [
                  'Emails, complaints and data protection requests',
                  'Up to 3 years after the matter is closed, unless we need it longer for a legal claim.',
                ],
              ]}
            />
          </section>

          <section>
            <H2 id="rights">7. Your rights</H2>
            <P>Under UK data protection law you have the right to:</P>
            <UL>
              <li><strong>Access</strong> a copy of the personal data we hold about you</li>
              <li><strong>Rectification</strong> of data that is wrong or incomplete</li>
              <li><strong>Erasure</strong> of your data, unless we have to keep it (for example tax records)</li>
              <li><strong>Restriction</strong> of how we use your data while a concern is looked into</li>
              <li>
                <strong>Data portability</strong>: receive the data you gave us
                in a machine-readable format, or have it sent to someone else
              </li>
              <li>
                <strong>Object</strong> to processing based on legitimate
                interests, and to any direct marketing at any time
              </li>
              <li><strong>Withdraw consent</strong> at any time where we rely on consent</li>
              <li>
                Not be subject to decisions based solely on automated processing
                with legal or similarly significant effects (we don&rsquo;t make
                any)
              </li>
            </UL>
            <P>
              <strong>Self-service:</strong> you can update your details,
              download a copy of your data and delete your account in{' '}
              <strong>Settings</strong> when signed in. Deleting your account
              doesn&rsquo;t cancel a Stripe subscription by itself; cancel it
              first in Settings &rarr; Manage subscription.
            </P>
            <P>
              For anything else, email <Mail subject="Data request" /> with
              &ldquo;Data request&rdquo; in the subject line. We may ask you to
              confirm your identity. We will respond without undue delay and
              within <strong>one month</strong> of receiving your request (or of
              receiving what we need to confirm your identity). If a request is
              complex, or you send several, we can extend this by up to two
              further months; if so we will tell you within the first month and
              explain why. We will make reasonable and proportionate searches
              for your data. There is normally no fee.
            </P>
          </section>

          <section>
            <H2 id="complaints">8. Complaints</H2>
            <P>
              <strong>Complain to us first.</strong> If you are unhappy with how
              we have used your personal data, email <Mail subject="Data protection complaint" />{' '}
              with the subject &ldquo;Data protection complaint&rdquo;, or use
              the{' '}
              <Link to="/contact" className="text-primary hover:underline">
                contact page
              </Link>
              . We will acknowledge your complaint within 30 days, look into it
              without undue delay, and tell you the outcome.
            </P>
            <P>
              <strong>The ICO.</strong> You also have the right to complain to
              the UK regulator, the Information Commissioner&rsquo;s Office
              (ICO). The ICO usually expects you to raise the issue with us
              first.
            </P>
            <UL>
              <li>
                Website:{' '}
                <a
                  href="https://ico.org.uk/make-a-complaint"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  ico.org.uk/make-a-complaint
                </a>
              </li>
              <li>Helpline: 0303 123 1113</li>
            </UL>
          </section>

          <section>
            <H2 id="children">9. Children</H2>
            <P>
              SnapGain is not for anyone under 18, and you must be 18 or over to
              create an account. We don&rsquo;t knowingly collect data from
              children. If you think a child has given us personal data, contact
              us and we will delete it.
            </P>
          </section>

          <section>
            <H2 id="security">10. Security</H2>
            <P>
              We use encryption in transit (TLS), access controls including
              row-level security in our database, hashed passwords and
              admin access limited to the owner. No system is completely secure. If
              a personal data breach is likely to put your rights at risk we
              will report it to the ICO within 72 hours of becoming aware of it,
              and tell you without undue delay if the risk to you is high.
            </P>
          </section>

          <section>
            <H2 id="emails">11. Emails from us</H2>
            <P>
              We send service emails you need to use your account (sign-up
              confirmation, password reset, receipts, important notices about
              your subscription or these policies). The daily boost email is
              optional: it is off until you switch it on in Settings, and every
              boost email includes a link to switch it off. We don&rsquo;t send
              other marketing emails at the moment; if we start, we will only do
              so with your consent or, where the law allows for existing
              customers, with a clear way to opt out at sign-up and in every
              email.
            </P>
          </section>

          <section>
            <H2 id="changes">12. Changes to this policy</H2>
            <P>
              We will update this policy when our services, providers or the law
              change, and change the &ldquo;Last updated&rdquo; date above. If a
              change materially affects how we use your data, we will tell you
              by email or in the app before it takes effect.
            </P>
          </section>
        </div>
      </div>
    </>
  );
}

export default PrivacyPolicyPage;
