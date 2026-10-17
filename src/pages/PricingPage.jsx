import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, Sparkles, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { SubscribeButton } from '@/components/SubscribeButton';
import { ManageBillingButton } from '@/components/ManageBillingButton';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';

// A Stripe subscription that still exists and bills. Mirrors the server's
// check in create-checkout-session (which answers 409 already_subscribed).
const LIVE_STATUSES = ['active', 'trialing', 'past_due', 'unpaid'];

const PlanCard = ({ title, price, period, description, features, bestValue, plan, currentPlan, isActive, hasSubscription, accepted, onConsentMissing }) => {
  const isCurrent = isActive && currentPlan === plan;
  return (
    <div
      className={`rounded-xl p-8 border-2 ${
        bestValue ? 'border-primary shadow-2xl' : 'border-border'
      } relative card-hover bg-card`}
    >
      {bestValue && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
          Best value
        </div>
      )}
      <h3 className="text-2xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6">{description}</p>
      <div className="mb-6">
        <span className="text-4xl font-bold">{price}</span>
        {period && (
          <span className="text-base text-muted-foreground ml-1">{period}</span>
        )}
      </div>

      <ul className="space-y-3 text-left mb-8">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start">
            <Check className="w-5 h-5 mr-3 text-green-500 mt-0.5 shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <Button disabled className="w-full text-lg h-12">
          <Check className="w-5 h-5 mr-2" />
          Current plan
        </Button>
      ) : hasSubscription ? (
        // Already subscribed: plan changes happen in the Stripe portal so
        // the existing subscription is updated, not duplicated.
        <ManageBillingButton
          className={`w-full text-lg h-12 ${
            bestValue
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground'
          }`}
        >
          Switch to this plan
        </ManageBillingButton>
      ) : (
        <SubscribeButton
          plan={plan}
          accepted={accepted}
          onConsentMissing={onConsentMissing}
          className={`w-full text-lg h-12 ${
            bestValue
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground'
          }`}
        >
          Start subscription
        </SubscribeButton>
      )}
    </div>
  );
};

function PricingPage() {
  const { user } = useAuth();
  const { profile, status, isPremium, inTrial, isActive, plan, trialDaysLeft, periodDaysLeft, periodEndsAt } = useSubscription();
  const [searchParams, setSearchParams] = useSearchParams();
  const autoFiredRef = useRef(false);
  const hasSubscription = !!profile?.stripe_subscription_id && LIVE_STATUSES.includes(status);

  // Express request to start now + proportional-refund acknowledgement
  // (Consumer Contracts Regulations 2013). Required before checkout.
  const [accepted, setAccepted] = useState(false);
  const [highlightConsent, setHighlightConsent] = useState(false);
  const consentRef = useRef(null);
  const showConsent = useCallback(() => {
    setHighlightConsent(true);
    consentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  // Banner state: "subscribe=required" comes from ProtectedRoute when a
  // non-premium user tries to access a gated route.
  const subscribeRequired = searchParams.get('subscribe') === 'required';

  // Return from signup: AuthCallbackPage redirects here with
  // ?action=checkout&plan=xxx after the OAuth round-trip. We no longer
  // open Stripe Checkout automatically: the consent box has to be ticked
  // on this page first, so point the user at it instead.
  useEffect(() => {
    if (autoFiredRef.current) return;
    if (!user) return;
    const action = searchParams.get('action');
    if (action !== 'checkout') return;
    autoFiredRef.current = true;

    const targetPlan = searchParams.get('plan') === 'yearly' ? 'Annual' : 'Monthly';

    // Clear the query string so a page reload doesn't re-fire.
    const next = new URLSearchParams(searchParams);
    next.delete('action');
    next.delete('plan');
    setSearchParams(next, { replace: true });

    toast({
      title: "You're signed in",
      description: `To subscribe, tick the confirmation box below, then press Start subscription on the ${targetPlan} plan.`,
    });
    showConsent();
  }, [user, searchParams, setSearchParams, showConsent]);

  const plans = {
    monthly: {
      title: 'Monthly',
      price: '£14.99',
      period: '/ month',
      plan: 'monthly',
      description: 'Per month, billed monthly. Cancel anytime.',
      features: [
        'Unlimited comparisons',
        'Real-time rate updates',
        'Personalised wallet routing',
        'Stack strategies (gift card + cashback + points)',
        '9 strategy guides (beginner to advanced)',
        'Smart alerts',
      ],
      bestValue: false,
    },
    yearly: {
      title: 'Annual',
      price: '£120',
      period: '/ year',
      plan: 'yearly',
      description: 'Per year, billed annually. Save £60 vs monthly.',
      features: [
        'Everything in Monthly',
        'Save £60 per year vs monthly',
        'Priority support',
        'Early access to new features',
        'BA Household Account setup wizard',
      ],
      bestValue: true,
    },
  };

  return (
    <>
      <Helmet>
        <title>Pricing — SnapGain</title>
      </Helmet>
      <div className="container mx-auto px-4 py-16">
        {/* Subscribe-required banner — shown when ProtectedRoute bounced
            a non-premium user here from a gated route. */}
        {subscribeRequired && !isPremium && (
          <Card className="mb-8 max-w-3xl mx-auto bg-amber-50 border-amber-300">
            <CardContent className="py-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-amber-900">
                  Pick a plan to unlock SnapGain
                </p>
                <p className="text-sm text-amber-800 mt-1">
                  SnapGain is a premium-only product. Choose Monthly or
                  Annual below to get the comparison engine, the 9
                  strategy guides, and the BA Household Account wizard.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center mb-10 space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Choose your <span className="gradient-text">perfect plan</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            One plan unlocks everything. Cancel anytime.
          </p>
        </div>

        {/* Live status banner */}
        {isPremium && (
          <Card className="mb-8 max-w-3xl mx-auto bg-gradient-to-br from-light-pink/30 to-light-green/30 border-primary/30">
            <CardContent className="py-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-semibold">
                    {isActive
                      ? `Subscribed (${plan || 'monthly'})`
                      : `Trial: ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isActive && periodEndsAt
                      ? `Renews ${new Date(periodEndsAt).toLocaleDateString()}${
                          periodDaysLeft ? ` · ${periodDaysLeft} days left` : ''
                        }`
                      : 'Free trial — no card needed yet.'}
                  </p>
                </div>
              </div>
              {isActive && (
                <Button asChild variant="outline" size="sm">
                  <Link to="/settings">
                    Manage <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <PlanCard
            {...plans.monthly}
            currentPlan={plan}
            isActive={isActive}
            hasSubscription={hasSubscription}
            accepted={accepted}
            onConsentMissing={showConsent}
          />
          <PlanCard
            {...plans.yearly}
            currentPlan={plan}
            isActive={isActive}
            hasSubscription={hasSubscription}
            accepted={accepted}
            onConsentMissing={showConsent}
          />
        </div>

        {!hasSubscription && (
          <div
            ref={consentRef}
            className={`max-w-4xl mx-auto mt-6 rounded-lg border p-4 flex items-start gap-3 transition-colors ${
              highlightConsent && !accepted
                ? 'border-primary ring-2 ring-primary/40 bg-primary/5'
                : 'border-border'
            }`}
          >
            <Checkbox
              id="subscription-consent"
              checked={accepted}
              onCheckedChange={(v) => {
                setAccepted(v === true);
                if (v === true) setHighlightConsent(false);
              }}
              className="mt-0.5"
            />
            <label htmlFor="subscription-consent" className="text-sm leading-relaxed cursor-pointer">
              I want my subscription to start now. I understand that if I
              cancel within 14 days I'll get a refund minus the part of the
              service I've already used (see the{' '}
              <Link to="/refund-policy" className="underline hover:text-primary">
                Refund Policy
              </Link>
              ). I agree to the{' '}
              <Link to="/terms-of-service" className="underline hover:text-primary">
                Terms of Service
              </Link>{' '}
              and have read the{' '}
              <Link to="/privacy-policy" className="underline hover:text-primary">
                Privacy Policy
              </Link>
              .
            </label>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center mt-8 max-w-2xl mx-auto">
          Payments are securely processed by Stripe. SnapGain never stores your
          card details. You can cancel anytime from the Settings page.
        </p>
      </div>
    </>
  );
}

export default PricingPage;
