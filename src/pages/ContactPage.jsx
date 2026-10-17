import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Mail, Copy, Check, Sparkles, MessageCircle, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from '@/lib/i18n';

const SUPPORT_EMAIL = 'support@snapgain.uk';

function ContactPage() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setCopied(true);
      toast({
        title: t('contact.emailToast'),
        description: t('contact.emailToastDesc', { email: SUPPORT_EMAIL }),
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: t('contact.couldntCopy'),
        description: t('contact.couldntCopyDesc'),
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>Contact — SnapGain</title>
      </Helmet>

      <div className="container mx-auto px-4 py-16 md:py-20 max-w-3xl">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-3 mb-10"
        >
          <div className="w-14 h-14 mx-auto bg-gradient-to-r from-primary to-secondary rounded-2xl flex items-center justify-center text-white shadow-md">
            <MessageCircle className="w-7 h-7" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {t('contact.title')}
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            {t('contact.subtitle')}
          </p>
        </motion.div>

        {/* Email card */}
        <Card className="card-hover">
          <CardContent className="p-6 md:p-8 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Mail className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('contact.emailUs')}
                </p>
                <p className="text-lg md:text-xl font-bold gradient-text break-all">
                  {SUPPORT_EMAIL}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button asChild size="lg" className="flex-1">
                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=SnapGain%20Support`}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {t('contact.openMail')}
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={copyEmail}
                className="flex-1"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    {t('contact.copied')}
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    {t('contact.copyAddress')}
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
              <Clock className="w-3.5 h-3.5" />
              {t('contact.replyTime')}
            </div>
          </CardContent>
        </Card>

        {/* What to include */}
        <Card className="mt-5">
          <CardContent className="p-6 space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {t('contact.whatToInclude')}
            </h2>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {['include1', 'include2', 'include3', 'include4'].map((k) => (
                <li key={k} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  {t(`contact.${k}`)}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Complaints route (2026-10-17, legal package C). English-only
            on purpose, like the legal pages. Response times here must
            match the Terms (section 14) and Privacy Policy (section 8). */}
        <Card className="mt-5" id="complaints">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              Complaints
            </h2>
            <p className="text-sm text-muted-foreground">
              We want to put things right. Tell us what went wrong, when, and
              what you would like us to do, and include the email address on
              your account.
            </p>

            <div className="rounded-lg border p-4 space-y-2">
              <p className="text-sm font-semibold">General complaints (service, billing, refunds)</p>
              <p className="text-sm text-muted-foreground">
                Email{' '}
                <a href={`mailto:${SUPPORT_EMAIL}?subject=Complaint`} className="text-primary hover:underline">
                  {SUPPORT_EMAIL}
                </a>{' '}
                with the subject &ldquo;Complaint&rdquo;. We aim to acknowledge it
                within 2 working days and to give you a full answer within 14
                days. If we can&rsquo;t resolve it, we will tell you in writing.
                Free consumer advice is available from the Citizens Advice
                consumer helpline on 0808 223 1133.
              </p>
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <p className="text-sm font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Data protection requests and complaints
              </p>
              <p className="text-sm text-muted-foreground">
                Email{' '}
                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=Data%20protection%20complaint`}
                  className="text-primary hover:underline"
                >
                  {SUPPORT_EMAIL}
                </a>{' '}
                with the subject &ldquo;Data protection complaint&rdquo; (or
                &ldquo;Data request&rdquo; to access, correct or delete your
                data). We acknowledge data protection complaints within 30 days
                and answer data requests within one month. You can also
                complain to the Information Commissioner&rsquo;s Office at{' '}
                <a
                  href="https://ico.org.uk/make-a-complaint"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  ico.org.uk/make-a-complaint
                </a>{' '}
                or 0303 123 1113. See our{' '}
                <Link to="/privacy-policy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>

            <p className="text-xs text-muted-foreground border-t pt-3">
              SnapGain is a trading name of Denys Ferreira Goncalves de Melo
              (sole trader), 3 Union Way, Ambrose House, London NW10 6FH,
              United Kingdom.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default ContactPage;
