import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Target, Eye, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const VALUES = [
  {
    Icon: Target,
    title: 'Clarity',
    body: 'One recommendation, not a dozen options. We do the maths so you can decide in seconds.',
  },
  {
    Icon: Eye,
    title: 'Transparency',
    body: 'You see exactly which platforms, rates and rules drive every comparison.',
  },
  {
    Icon: Heart,
    title: 'Inclusivity',
    body: 'Built for everyone, with multiple languages and accessibility themes.',
  },
];

function AboutPage() {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>About — SnapGain</title>
      </Helmet>

      {/* ─── Mission hero ──────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-light-pink/40 via-background to-light-green/30">
        <div className="container mx-auto px-4 py-20 md:py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4 max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              Our mission
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Smarter Savings for{' '}
              <span className="gradient-text">Everyone</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              We believe everyone deserves to get the most out of their money.
              SnapGain was born from a simple idea: make it easy to see the
              best way to pay for anything, anytime.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── Values ────────────────────────────────────────────── */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {VALUES.map(({ Icon, title, body }) => (
            <Card key={title} className="card-hover h-full">
              <CardContent className="p-6 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center shadow-sm">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── Story ─────────────────────────────────────────────── */}
      <section className="container mx-auto px-4 pb-20">
        <Card className="max-w-4xl mx-auto">
          <CardContent className="p-8 md:p-10 space-y-5">
            <h2 className="text-2xl md:text-3xl font-bold">
              The SnapGain Story
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              In a world filled with countless loyalty programs, cashback
              offers, and credit card points, it&rsquo;s become incredibly
              complex to know if you&rsquo;re truly getting the best deal.
              Are you better off getting 5% cashback, or earning 10 airline
              miles per pound? Should you buy a discounted gift card first? These
              questions used to require spreadsheets, multiple browser tabs,
              and a lot of guesswork.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              We decided to change that.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              <strong className="text-foreground">
                SnapGain is your personal rewards strategist.
              </strong>{' '}
              Our platform does the heavy lifting for you: it calculates, for
              each store, the routes available across the UK platforms we
              cover and ranks them by estimated value to you. We bring
              together offers from cashback sites, airline rewards
              programmes, bank rewards and gift-card platforms into one
              simple, actionable recommendation.
            </p>

            <h2 className="text-2xl md:text-3xl font-bold pt-3">
              Our Commitment
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Our goal is to help you make faster, smarter decisions about
              where you shop and how you pay. We work to keep our data
              accurate and show the date each rate was last checked, but
              platforms change their offers often, so always check the
              platform before you buy. SnapGain is information, not
              financial advice.
            </p>

            <h2 className="text-2xl md:text-3xl font-bold pt-3">
              Who runs SnapGain and how it is funded
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              SnapGain is a trading name of Denys Ferreira Goncalves de Melo,
              a sole trader based in London. It is funded by subscriptions
              and by commissions: some links on SnapGain are affiliate links,
              so a platform pays us if you sign up or buy through them. That
              doesn&rsquo;t change the price you pay, and when you compare a
              store the routes are ordered by estimated value to you, not by
              commission. Questions? Email{' '}
              <a href="mailto:support@snapgain.uk" className="text-primary hover:underline">
                support@snapgain.uk
              </a>
              .
            </p>

            <div className="text-center pt-4">
              <Button size="lg" onClick={() => navigate('/auth/signup')}>
                Join SnapGain Today
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}

export default AboutPage;