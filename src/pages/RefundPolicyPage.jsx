// RefundPolicyPage: cancellation and refunds for the SnapGain
// subscription, under the Consumer Contracts (Information, Cancellation
// and Additional Charges) Regulations 2013 ("CCR").
//
// Rewritten 17 October 2026 (legal package C). Owner decision:
// PROPORTIONAL refunds.
//   - 14-day cancellation period from the day the contract is made
//     (CCR reg 30).
//   - The customer expressly asks at checkout for the service to start
//     during that period (CCR reg 36(2); the checkbox is added by the
//     checkout package). If they cancel within 14 days they pay for the
//     service supplied up to the time they told us (reg 36(4), amount
//     calculated per reg 36(6)) and get the rest back within 14 days, by
//     the original payment method, with no fee (reg 34).
//   - After 14 days: cancel any time, keep access to the end of the paid
//     period, no partial refunds except where the law requires.
//   - Monthly and annual plans follow the same rules.
//   - Model cancellation form from CCR Schedule 3 (Part B) is included.
//   - 14-day refunds are processed manually on request to
//     support@snapgain.uk. The only confirmation email is Stripe's
//     receipt (no SnapGain confirmation email is sent by the code as of
//     2026-10-17); do not promise one here unless the code sends it.
// A UK solicitor should review the final wording before it is relied on.

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

function RefundPolicyPage() {
  return (
    <>
      <Helmet>
        <title>Refund Policy — SnapGain</title>
        <meta
          name="description"
          content="How to cancel your SnapGain subscription, your 14-day cancellation right and how refunds are calculated."
        />
      </Helmet>

      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">
          Cancellation and Refund Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-10">
          Last updated: {LAST_UPDATED}
        </p>

        <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground space-y-1.5">
          <p className="font-semibold text-foreground">In short</p>
          <UL>
            <li>The 7-day free trial costs nothing and ends by itself. There is nothing to cancel or refund.</li>
            <li>
              Cancel within 14 days of subscribing and email us: you get your
              money back, minus the part of the service you have already used
              (worked out by days).
            </li>
            <li>
              Cancel after that: no more payments are taken and you keep access
              until the end of the period you have paid for. Part-used periods
              aren&rsquo;t refunded, except where the law requires.
            </li>
            <li>Monthly and annual plans follow the same rules.</li>
          </UL>
        </div>

        <section>
          <H2 id="seller">1. Who you are dealing with</H2>
          <P>
            SnapGain is a trading name of Denys Ferreira Goncalves de Melo, a
            sole trader, 3 Union Way, Ambrose House, London NW10 6FH, United
            Kingdom. Email: <Mail />. This policy forms part of our{' '}
            <Link to="/terms-of-service" className="text-primary hover:underline">
              Terms of Service
            </Link>{' '}
            and does not affect your statutory rights.
          </P>
        </section>

        <section>
          <H2 id="trial">2. Free trial</H2>
          <P>
            The 7-day free trial needs no card and you are never charged for
            it. It ends automatically and does not turn into a paid plan. A paid
            subscription only starts if you choose a plan and pay.
          </P>
        </section>

        <section>
          <H2 id="cancel-anytime">3. Cancelling your subscription</H2>
          <P>
            You can cancel at any time, online, in{' '}
            <strong>Settings &rarr; Manage subscription</strong>, or by emailing{' '}
            <Mail subject="Cancel my subscription" />. Cancelling stops the
            automatic renewal: no further payments are taken, and you keep
            access to paid features until the end of the month or year you have
            already paid for.
          </P>
        </section>

        <section>
          <H2 id="14-days">4. Your 14-day right to cancel</H2>
          <P>
            Under the Consumer Contracts Regulations 2013 you have the right to
            cancel your subscription within <strong>14 days</strong> without
            giving any reason. The 14 days start the day after you subscribe
            (the day your payment is accepted). This applies to your first
            subscription and to any new subscription you take out after a
            previous one has ended; it does not restart when an existing
            subscription renews.
          </P>
          <P>
            <strong>Why the refund is proportional.</strong> At checkout you
            ask us to start your subscription immediately, during the
            cancellation period, so you can use SnapGain straight away. If you
            then cancel within the 14 days, you must pay for the service
            provided up to the time you tell us you are cancelling. We refund
            the rest. We work this out by days, in proportion to the full
            period you paid for:
          </P>
          <div className="mt-3 rounded-lg border p-4 text-sm text-muted-foreground space-y-2">
            <p>
              <strong className="text-foreground">Refund</strong> = price paid
              &times; (days left in the period &divide; days in the period)
            </p>
            <p>
              <strong className="text-foreground">Monthly example:</strong> you
              pay £14.99 for a 30-day month and cancel after 5 days. You pay for
              5 days and we refund £14.99 &times; 25/30 = <strong>£12.49</strong>.
            </p>
            <p>
              <strong className="text-foreground">Annual example:</strong> you
              pay £120 for a 365-day year and cancel after 10 days. You pay for
              10 days and we refund £120 &times; 355/365 ={' '}
              <strong>£116.71</strong>.
            </p>
          </div>
          <P>
            <strong>How to cancel within the 14 days.</strong> Tell us clearly
            that you want to cancel, for example by emailing{' '}
            <Mail subject="Cancellation within 14 days" /> with the subject
            &ldquo;Cancellation within 14 days&rdquo;, or by sending the model
            form below (you don&rsquo;t have to use it). It is enough to send
            your message before the 14 days are up. Refunds are processed by
            us on request, so please email us even if you have already
            cancelled in Settings &rarr; Manage subscription: cancelling there
            stops the renewal but does not by itself trigger a refund.
          </P>
          <P>
            <strong>When and how you get your money.</strong> We refund you
            without undue delay and within 14 days of the day you tell us, using
            the same payment method you used (unless you agree otherwise). We
            don&rsquo;t charge any fee for the refund. Your bank may take a few
            more working days to show it.
          </P>
        </section>

        <section>
          <H2 id="after-14-days">5. After the 14 days</H2>
          <P>
            You can still cancel at any time (section 3). Your subscription runs
            to the end of the period you have paid for and is not renewed. We
            don&rsquo;t give partial refunds for the rest of a month or year,
            except where the law requires it, for example if we have not
            provided the service with reasonable care and skill, the service is
            not as described, or we end your subscription when it isn&rsquo;t
            your fault. This applies to the annual plan in the same way as the
            monthly plan.
          </P>
        </section>

        <section>
          <H2 id="mistakes">6. Charged by mistake</H2>
          <P>
            If you were charged twice, charged after cancelling, or charged in
            error, email <Mail subject="Billing error" /> and we will refund the
            incorrect charge in full.
          </P>
        </section>

        <section>
          <H2 id="rewards">7. Cashback and rewards from other platforms</H2>
          <P>
            Cashback, points, miles and gift-card discounts are paid by the
            platforms you use, not by SnapGain. We can&rsquo;t refund or pay
            them, but we are happy to point you to the right platform if you
            have a problem.
          </P>
        </section>

        <section>
          <H2 id="confirmation">8. Confirmation of your subscription</H2>
          <P>
            When you pay, Stripe (our payment provider) emails you a receipt
            for your plan and price. Before you pay, the pricing page and the
            Stripe checkout page both state that your subscription starts
            immediately at your request, renews until you cancel, and that a
            cancellation within 14 days gets a refund minus the part of the
            service already used; these terms stay available on this page and
            in our Terms of Service. If you would like a copy of your
            subscription details by email, ask us at support@snapgain.uk.
          </P>
        </section>

        <section>
          <H2 id="model-form">9. Model cancellation form</H2>
          <P>
            Complete and return this form only if you wish to cancel within the
            14 days. You can copy it into an email to <Mail subject="Cancellation within 14 days" />.
          </P>
          <div className="mt-3 rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground space-y-2 font-mono whitespace-pre-line">
{`To: SnapGain (Denys Ferreira Goncalves de Melo), 3 Union Way, Ambrose House, London NW10 6FH, United Kingdom. Email: support@snapgain.uk

I hereby give notice that I cancel my contract for the supply of the following service: SnapGain subscription (monthly / annual*)

Ordered on: [date]

Name of consumer: [your name]

Email address used for the SnapGain account: [email]

Address of consumer: [your address]

Signature of consumer (only if this form is sent on paper): [signature]

Date: [date]

* Delete as appropriate.`}
          </div>
        </section>

        <section>
          <H2 id="questions">10. Questions</H2>
          <P>
            Email <Mail />. Please include the email address on your account and
            the date of the payment so we can find it quickly.
          </P>
        </section>
      </div>
    </>
  );
}

export default RefundPolicyPage;
