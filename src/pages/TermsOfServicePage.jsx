// TermsOfServicePage: consumer terms for SnapGain (England and Wales
// law, with the Consumer Rights Act 2015 and the Consumer Contracts
// Regulations 2013 in mind). Pairs with PrivacyPolicyPage (data) and
// RefundPolicyPage (14-day cancellation and refunds).
//
// Rewritten 17 October 2026 (legal package C). Owner decisions:
//   - Trader: sole trader, trading as SnapGain. No company, no company
//     number. Not VAT-registered, so prices include no VAT.
//   - £7.99/month or £60/year (src/config/pricing.js; owner, 23/10/2026),
//     paid through Stripe. 7-day free trial,
//     no card, does NOT convert into a paid plan.
//   - Proportional refund within the 14-day cancellation period after an
//     express request to start immediately (CCR 2013 regs 34, 36).
//   - No "continued use = acceptance": material changes are notified in
//     advance by email with the right to cancel.
//   - The EU ODR platform closed on 20 July 2025, so there is no ODR
//     link.
// A UK solicitor should review the final wording before it is relied on.

import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { MONTHLY, YEARLY } from '@/config/pricing';

const LAST_UPDATED = '23 October 2026';

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
const A = ({ to, children }) => (
  <Link to={to} className="text-primary hover:underline">
    {children}
  </Link>
);
const Mail = () => (
  <a href="mailto:support@snapgain.uk" className="text-primary hover:underline">
    support@snapgain.uk
  </a>
);

function TermsOfServicePage() {
  return (
    <>
      <Helmet>
        <title>Terms of Service — SnapGain</title>
        <meta
          name="description"
          content="The terms for using SnapGain, the free trial and the SnapGain subscription, including how to cancel and your statutory rights."
        />
      </Helmet>

      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">
          Terms of Service
        </h1>
        <p className="text-sm text-muted-foreground mb-10">
          Last updated: {LAST_UPDATED}
        </p>

        <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground space-y-1.5">
          <p className="font-semibold text-foreground">The short version</p>
          <p>
            SnapGain compares rewards from the UK platforms listed on our site.
            It is information, not financial advice. The 7-day free trial needs
            no card and simply ends; it never turns into a paid plan on its own.
            A subscription costs {MONTHLY} a month or {YEARLY} a year, renews
            automatically until you cancel, and you can cancel online at any
            time in Settings &rarr; Manage subscription. Your statutory rights
            are not affected.
          </p>
        </div>

        <section>
          <H2 id="about">1. About us</H2>
          <P>
            SnapGain is a trading name of{' '}
            <strong>Denys Ferreira Goncalves de Melo</strong>, a sole trader
            based in England (&ldquo;we&rdquo;, &ldquo;us&rdquo;,
            &ldquo;our&rdquo;).
          </P>
          <UL>
            <li>Address: 3 Union Way, Ambrose House, London NW10 6FH, United Kingdom</li>
            <li>Email: <Mail /></li>
            <li>We are not registered for VAT, so no VAT is charged on our prices.</li>
          </UL>
        </section>

        <section>
          <H2 id="these-terms">2. These terms and your rights</H2>
          <P>
            These terms are the contract between you and us for using SnapGain
            and, if you subscribe, for your subscription. Please also read our{' '}
            <A to="/privacy-policy">Privacy Policy</A>,{' '}
            <A to="/cookie-policy">Cookie Policy</A> and{' '}
            <A to="/refund-policy">Refund Policy</A>, which explain how we use
            your data and how cancellation and refunds work.
          </P>
          <P>
            <strong>Your statutory rights are not affected.</strong> If you are
            a consumer, nothing in these terms takes away rights you have under
            UK consumer law, including the Consumer Rights Act 2015 and the
            Consumer Contracts (Information, Cancellation and Additional
            Charges) Regulations 2013. Citizens Advice can tell you more about
            them.
          </P>
          <P>
            We will contact you at the email address on your account. Please
            keep it up to date.
          </P>
        </section>

        <section>
          <H2 id="eligibility">3. Who can use SnapGain</H2>
          <P>
            You must be 18 or over and live in the UK. SnapGain is a consumer
            service for personal use; it is not designed for business use.
            Keep your login details private. You are responsible for activity
            on your account unless it happens because of something we did
            wrong.
          </P>
        </section>

        <section>
          <H2 id="service">4. What SnapGain is (and isn&rsquo;t)</H2>
          <UL>
            <li>
              <strong>Information and comparison, not advice.</strong> SnapGain
              shows cashback, gift-card, loyalty and points offers and suggests
              ways to combine them. We are not a financial adviser and are not
              authorised by the Financial Conduct Authority. Nothing on SnapGain
              is a recommendation to take out a credit card, bank account or
              any financial product. Decide whether a product suits you and
              read its own terms.
            </li>
            <li>
              <strong>Coverage.</strong> We compare the UK platforms listed on
              our site, not the whole market. Other platforms or offers may be
              better for you.
            </li>
            <li>
              <strong>Rates come from third parties and change.</strong> We
              collect rates from partner platforms and public sources and show
              the date each rate was last checked. Platforms can change or
              withdraw offers at any time, apply their own conditions, or
              decline to pay out. Always check the offer on the platform&rsquo;s
              own site before you buy.
            </li>
            <li>
              <strong>Estimates.</strong> Figures for savings, points, miles or
              flights are estimates based on the rates and assumptions shown.
              Your actual results depend on what you buy, the platforms&rsquo;
              terms and your own choices.
            </li>
            <li>
              <strong>We don&rsquo;t pay rewards.</strong> SnapGain is not a
              cashback site. Cashback, points and discounts are paid by the
              platform you use, under its terms.
            </li>
          </UL>
        </section>

        <section>
          <H2 id="affiliates">5. How we make money and how we rank results</H2>
          <P>
            SnapGain is funded by subscriptions and by commissions. Some links
            on SnapGain are affiliate or referral links: if you sign up or buy
            through one, the platform (or an affiliate network) pays us a
            commission or referral fee. It doesn&rsquo;t change the price you
            pay, and we mark pages that contain these links.
          </P>
          <P>
            When you compare a store, the routes are ordered by their{' '}
            <strong>estimated value to you</strong> for the amount you enter:
            cashback and discounts in pounds, plus points or miles converted at
            the value shown next to them. Whether we earn a commission, and how
            much, is not part of that calculation. Some other lists, such as
            featured stores and &ldquo;hot deals&rdquo;, are chosen by us
            editorially. Results also only include platforms we cover (see
            section 4).
          </P>
        </section>

        <section>
          <H2 id="trial">6. The free trial</H2>
          <UL>
            <li>
              When you create an account you get a free 7-day trial. You
              don&rsquo;t need to give card details.
            </li>
            <li>
              The trial includes the comparison tools and a selection of
              features; some features (for example saved strategies, wallet and
              alerts, and most of the strategy library) are only available on a
              paid plan. We show which features are locked.
            </li>
            <li>
              The trial ends automatically after 7 days.{' '}
              <strong>It does not turn into a paid subscription</strong> and you
              will not be charged. To keep using paid features you need to
              choose a plan and pay.
            </li>
            <li>One free trial per person. We may refuse a trial where we reasonably suspect abuse.</li>
          </UL>
        </section>

        <section>
          <H2 id="subscription">7. Subscriptions, price and renewal</H2>
          <UL>
            <li>
              <strong>Plans and price:</strong> {MONTHLY} per month (monthly plan)
              or {YEARLY} per year (annual plan). These are the total prices; no VAT
              or other charges are added.
            </li>
            <li>
              <strong>Payment:</strong> you pay in advance for each period by
              card or another method offered at checkout. Payments are processed
              by Stripe; we never see or store your full card details.
            </li>
            <li>
              <strong>When your subscription starts:</strong> when your payment
              is accepted. At checkout you ask us to start the service straight
              away, during your 14-day cancellation period (see section 8).
            </li>
            <li>
              <strong>Automatic renewal:</strong> your subscription renews
              automatically at the end of each month (monthly plan) or year
              (annual plan), and the price for the next period is taken from
              your payment method, until you cancel.
            </li>
            <li>
              <strong>Price changes:</strong> if we change the price, we will
              email you at least 30 days before the new price applies to you.
              It only applies from your next renewal after that notice, and you
              can cancel before then if you don&rsquo;t want to pay it.
            </li>
            <li>
              <strong>How to cancel:</strong> online at any time in{' '}
              <strong>Settings &rarr; Manage subscription</strong>, or by
              emailing <Mail />. You don&rsquo;t need to give a reason.
            </li>
            <li>
              <strong>What happens when you cancel:</strong> your subscription
              won&rsquo;t renew, you keep access to paid features until the end
              of the period you have already paid for, and then the paid features
              switch off (your account and saved data stay until you delete
              them). Outside the 14-day
              cancellation period we don&rsquo;t refund part-used periods,
              except where the law requires (for example if we haven&rsquo;t
              provided the service with reasonable care and skill).
            </li>
            <li>
              <strong>Failed payments:</strong> if a renewal payment fails,
              Stripe may retry it. If it still hasn&rsquo;t been paid after 14
              days we may end the paid features until it is.
            </li>
          </UL>
        </section>

        <section>
          <H2 id="cancellation-right">8. Your 14-day right to cancel</H2>
          <P>
            As a consumer you have a legal right to cancel your subscription
            within 14 days of the day you subscribe, without giving a reason.
            Because you ask at checkout for the service to start immediately, if
            you cancel within those 14 days we will refund what you paid{' '}
            <strong>minus an amount proportionate to the service provided</strong>{' '}
            up to the time you tell us you are cancelling. The refund is paid
            within 14 days of you telling us, to the original payment method.
          </P>
          <P>
            Full details, a worked example and a model cancellation form are in
            our <A to="/refund-policy">Refund Policy</A>. The same rules apply to
            the monthly and annual plans. The free trial is free, so there is
            nothing to refund.
          </P>
        </section>

        <section>
          <H2 id="acceptable-use">9. Acceptable use</H2>
          <P>You agree not to:</P>
          <UL>
            <li>copy, scrape or republish SnapGain&rsquo;s data, comparisons or strategy content, or use bots or automated tools against the service</li>
            <li>share, resell or sublicense your account</li>
            <li>try to get around paywalls, security or access controls, or reverse-engineer the service</li>
            <li>use SnapGain for anything unlawful, fraudulent or harmful, or to break a partner platform&rsquo;s rules</li>
          </UL>
        </section>

        <section>
          <H2 id="ip">10. Our content</H2>
          <P>
            SnapGain&rsquo;s name, logo, software, text, data compilations and
            strategy guides belong to us or our licensors. While you have an
            account we give you a personal, non-transferable licence to use them
            for your own non-commercial use.
          </P>
        </section>

        <section>
          <H2 id="responsibility">11. Our responsibility to you</H2>
          <UL>
            <li>
              We will provide SnapGain with reasonable care and skill. If we
              don&rsquo;t, contact us: we will try to fix it, and if we
              can&rsquo;t within a reasonable time, you may be entitled to some
              or all of your money back.
            </li>
            <li>
              We are responsible for loss or damage you suffer that is a
              foreseeable result of us breaking these terms or failing to use
              reasonable care and skill. We are not responsible for loss that was
              not foreseeable, or for business losses, because SnapGain is for
              personal use.
            </li>
            <li>
              We are not responsible for what partner platforms do, including
              whether they pay cashback or honour an offer, or for changes to
              their rates after we checked them. Your claim for an unpaid reward
              is against that platform.
            </li>
            <li>
              Where the law allows us to limit our liability, our total
              liability to you is limited to the amount you paid us in the 12
              months before the event that caused the claim.
            </li>
            <li>
              <strong>Nothing in these terms excludes or limits our liability</strong>{' '}
              for death or personal injury caused by our negligence, for fraud
              or fraudulent misrepresentation, for breach of your rights under
              the Consumer Rights Act 2015, or for anything else that cannot be
              excluded or limited by law.
            </li>
            <li>
              We aim to keep SnapGain available, but it may sometimes be
              unavailable for maintenance or reasons outside our control. If paid
              features are unavailable for an extended period, contact us and we
              will offer a fair refund or credit.
            </li>
          </UL>
        </section>

        <section>
          <H2 id="ending">12. Ending your account</H2>
          <P>
            You can delete your account at any time in Settings (cancel any
            subscription first in Settings &rarr; Manage subscription). We may
            suspend or close your account if you seriously or repeatedly break
            these terms, or if the law requires it. We will give you notice
            where reasonable, and if we close your account without it being your
            fault, or we stop running SnapGain, we will refund any subscription
            period you have paid for but not received. What happens to your data
            is explained in the <A to="/privacy-policy">Privacy Policy</A>.
          </P>
        </section>

        <section>
          <H2 id="changes">13. Changes to SnapGain and to these terms</H2>
          <P>
            We may update these terms or the service, for example to reflect
            changes in the law, new features or the platforms we cover. If a
            change is material or to your disadvantage, we will email you at
            least 30 days before it takes effect and explain it. If you
            don&rsquo;t agree, you can cancel before the change takes effect,
            and we will refund any period you have paid for but not used. Minor
            changes that don&rsquo;t disadvantage you (such as corrections or
            clarifications) may be made at any time; the &ldquo;Last
            updated&rdquo; date shows the current version.
          </P>
        </section>

        <section>
          <H2 id="complaints">14. Problems and complaints</H2>
          <P>
            If something goes wrong, email <Mail /> (subject
            &ldquo;Complaint&rdquo;) or use the{' '}
            <A to="/contact">contact page</A>. We aim to acknowledge complaints
            within 2 working days and to give you a full answer within 14
            days. If we
            can&rsquo;t resolve it, we will tell you in writing. You can get free
            advice from the Citizens Advice consumer helpline (0808 223 1133),
            and you can still go to court (see section 15).
          </P>
        </section>

        <section>
          <H2 id="law">15. Law and courts</H2>
          <P>
            These terms are governed by the law of England and Wales. You can
            bring legal proceedings in the courts of England and Wales. If you
            live in Scotland you can bring proceedings in Scotland or England
            and Wales, and if you live in Northern Ireland you can bring them in
            Northern Ireland or England and Wales.
          </P>
        </section>

        <section>
          <H2 id="general">16. General</H2>
          <UL>
            <li>If a court decides part of these terms is invalid, the rest still applies.</li>
            <li>If we don&rsquo;t enforce a right straight away, we can still enforce it later.</li>
            <li>
              We may transfer this contract to someone who takes over SnapGain;
              we will tell you, and your rights won&rsquo;t be reduced. You need
              our permission to transfer your account.
            </li>
            <li>Nobody else has rights under this contract.</li>
          </UL>
        </section>

        <section>
          <H2 id="contact">17. Contact</H2>
          <P>
            Email <Mail />, or write to SnapGain (Denys Ferreira Goncalves de
            Melo), 3 Union Way, Ambrose House, London NW10 6FH, United Kingdom.
          </P>
        </section>
      </div>
    </>
  );
}

export default TermsOfServicePage;
