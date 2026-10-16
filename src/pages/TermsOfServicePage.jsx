// TermsOfServicePage — UK-law terms covering subscription, acceptable
// use, IP, liability, and termination. Pairs with PrivacyPolicyPage
// (data handling) and RefundPolicyPage (cancellation/refunds).
//
// Drafted for a B2C SaaS at £14.99/mo or £120/yr with a 7-day trial,
// affiliate-link revenue model, and EU/UK customer base.

import React from 'react';
import { Helmet } from 'react-helmet';

const LAST_UPDATED = '29 June 2026';

function TermsOfServicePage() {
  return (
    <>
      <Helmet>
        <title>Terms of Service — SnapGain</title>
        <meta
          name="description"
          content="The terms that govern your use of SnapGain (a trading name of Voce Lindx Ltd) and its Premium subscription."
        />
      </Helmet>

      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">
          Terms of Service
        </h1>
        <p className="text-sm text-muted-foreground mb-10">
          Last updated: {LAST_UPDATED}
        </p>

        <div className="prose prose-lg max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-bold mt-8 mb-3">1. Who you're contracting with</h2>
            <p className="text-muted-foreground">
              These Terms are an agreement between you and{' '}
              <strong>Voce Lindx Ltd</strong> (company number{' '}
              <strong>14321565</strong>, registered office at 3 Union Way,
              Flat 85 Ambrose House, London, England, NW10 6FH), which
              operates the SnapGain service under that trading name. In these
              Terms "we", "us", "SnapGain" and "Voce Lindx Ltd" all refer to
              the same entity.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-3">2. Acceptance and eligibility</h2>
            <p className="text-muted-foreground">
              By creating an account or using SnapGain you accept these Terms,
              our <a href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</a>, our{' '}
              <a href="/cookie-policy" className="text-primary hover:underline">Cookie Policy</a>, and our{' '}
              <a href="/refund-policy" className="text-primary hover:underline">Refund Policy</a>. If you do
              not agree, do not use the service.
            </p>
            <p className="text-muted-foreground mt-3">
              You must be at least 18 years old and capable of forming a
              binding contract under UK law. The service is offered to
              consumers in the UK and EU; we may decline accounts from other
              jurisdictions where local restrictions apply.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-3">3. What the service is</h2>
            <p className="text-muted-foreground">
              SnapGain ranks UK cashback platforms, gift-card discounts and
              airline-miles programmes against each other to suggest the most
              valuable way to route a given purchase. The recommendations are
              <strong> informational only</strong>: you decide whether to act
              on them. We do not transact on your behalf, do not hold your
              funds, and are not a regulated financial advisor.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-3">4. Subscription, trial, billing</h2>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-muted-foreground">
              <li>
                <strong>Plans:</strong> Premium subscription at £14.99 per
                month or £120 per year (prices may change with notice — see §11).
              </li>
              <li>
                <strong>Trial:</strong> a 7-day free trial starts when you
                sign up. No card is required to start; you'll be asked to
                add one before the trial ends if you want to keep Premium.
              </li>
              <li>
                <strong>Auto-renewal:</strong> paid subscriptions renew
                automatically at the end of each billing cycle (monthly or
                annual) using the payment method on file via Stripe.
              </li>
              <li>
                <strong>Cancellation:</strong> you can cancel at any time
                from Settings → Manage Billing, or by emailing{' '}
                <a href="mailto:support@snapgain.uk" className="text-primary hover:underline">support@snapgain.uk</a>.
                Cancellation takes effect at the end of the current billing
                period; you keep Premium access until then.
              </li>
              <li>
                <strong>Refunds:</strong> covered by the{' '}
                <a href="/refund-policy" className="text-primary hover:underline">Refund Policy</a>,
                including your statutory 14-day cooling-off right under the
                UK Consumer Contracts Regulations 2013.
              </li>
              <li>
                <strong>Payment processor:</strong> Stripe (Stripe Payments
                Europe, Ltd) handles all card data. We never see or store
                your card details.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-3">5. Acceptable use</h2>
            <p className="text-muted-foreground">You agree NOT to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground">
              <li>Scrape, copy, or republish SnapGain's catalogue, ranking logic, strategies, or comparisons</li>
              <li>Resell, sublicense, or share your account with anyone else</li>
              <li>Use bots, automation, or load-testing tools against the service</li>
              <li>Reverse-engineer the app or bypass paywalls / access controls</li>
              <li>Use the service to commit fraud, money laundering, or any illegal activity</li>
              <li>Upload malicious content, attempt to compromise security, or violate other users' privacy</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              We may suspend or terminate accounts that breach this clause
              with or without notice (see §10).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-3">6. Affiliate disclosure</h2>
            <p className="text-muted-foreground">
              SnapGain earns commissions from some of the partner platforms
              we recommend (e.g. Quidco, JamDoughnut, Avios shopping). When
              you click through and complete a qualifying action, the
              partner pays us a referral fee. This funds the service and
              does <strong>not</strong> affect:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground">
              <li>The price or terms you get on the partner's site</li>
              <li>The cashback / miles / discount value you earn</li>
              <li>The ranking we present — we surface the best deal for you, not the highest commission for us</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-3">7. Third-party platforms</h2>
            <p className="text-muted-foreground">
              SnapGain links to and displays data from third-party services
              (cashback sites, loyalty programmes, gift-card platforms,
              airline programmes). We are not affiliated with, endorsed by,
              or controlled by those services. Their terms govern your
              relationship with them once you click through. Rates, offers,
              and stock change frequently and we cannot guarantee any value
              you see in SnapGain will match the partner site at the moment
              you transact — always verify on the partner's page before
              committing.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-3">8. Intellectual property</h2>
            <p className="text-muted-foreground">
              SnapGain's name, logo, branding, code, copy, ranking logic,
              data structure, and curated strategies are owned by Voce Lindx
              Ltd or its licensors and protected by UK and international
              copyright, trademark, and database-rights law. You get a
              limited, non-exclusive, non-transferable licence to use the
              service for personal purposes during your subscription. Nothing
              in these Terms transfers ownership.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-3">9. Warranty disclaimer and liability</h2>
            <p className="text-muted-foreground">
              The service is provided "as is" and "as available". We don't
              warrant that rates shown will be earned, that partner
              platforms will honour offers, that the service will be
              uninterrupted, or that any specific financial outcome will
              result from following our recommendations.
            </p>
            <p className="text-muted-foreground mt-3">
              To the maximum extent permitted by law, our total aggregate
              liability to you for any claim relating to the service is
              limited to the amount you paid us in the 12 months before the
              claim arose. We are not liable for indirect or consequential
              losses (lost profits, lost opportunities, lost rewards,
              business interruption, etc.).
            </p>
            <p className="text-muted-foreground mt-3">
              Nothing in these Terms limits liability for death or personal
              injury caused by our negligence, fraud, or any other liability
              that cannot be excluded under UK law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-3">10. Termination</h2>
            <p className="text-muted-foreground">
              You can terminate by deleting your account in Settings or
              emailing support. We can suspend or terminate your access if:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground">
              <li>You breach these Terms (especially §5 Acceptable Use)</li>
              <li>Your payment fails and isn't resolved within 14 days</li>
              <li>We're required to do so by law or court order</li>
              <li>We discontinue the service (in which case we'll refund any unused prepaid time)</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              On termination, your right to use the service ends. We
              retain data only as described in the Privacy Policy
              (typically deleted within 30 days except where law requires
              longer).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-3">11. Changes to the service or Terms</h2>
            <p className="text-muted-foreground">
              We may update the service, features, prices, or these Terms.
              For material changes (e.g. price increases, removal of a
              feature you rely on) we'll notify you by email and/or in-app
              at least 30 days before they take effect. You can cancel
              before the change applies if you don't agree. Continued use
              after the effective date constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-3">12. Governing law and dispute resolution</h2>
            <p className="text-muted-foreground">
              These Terms are governed by the laws of England and Wales.
              Disputes are subject to the exclusive jurisdiction of the
              English courts, except that consumers may bring proceedings
              in the courts of the EU member state where they reside.
              EU residents can also use the Online Dispute Resolution
              platform at{' '}
              <a
                href="https://ec.europa.eu/consumers/odr/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                ec.europa.eu/consumers/odr
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-3">13. Other</h2>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground">
              <li><strong>Severability:</strong> if any clause is found unenforceable, the rest stay in effect.</li>
              <li><strong>Entire agreement:</strong> these Terms plus the linked policies are the whole agreement between us.</li>
              <li><strong>No waiver:</strong> if we don't enforce a right immediately, we don't lose it.</li>
              <li><strong>Force majeure:</strong> neither party is liable for failures caused by events outside reasonable control (outages, war, pandemic, regulatory shutdown, etc.).</li>
              <li><strong>Assignment:</strong> you can't transfer your account or rights without our consent; we can assign to a successor in a merger or acquisition.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-3">14. Contact</h2>
            <p className="text-muted-foreground">
              Questions about these Terms? Email{' '}
              <a href="mailto:support@snapgain.uk" className="text-primary hover:underline">
                support@snapgain.uk
              </a>{' '}
              or write to Voce Lindx Ltd at 3 Union Way, Flat 85 Ambrose
              House, London, England, NW10 6FH.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}

export default TermsOfServicePage;
