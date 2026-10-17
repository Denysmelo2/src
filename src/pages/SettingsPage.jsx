import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { motion } from 'framer-motion';
import {
  Bell,
  Shield,
  Megaphone,
  Palette,
  Eye,
  Type,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon,
  Monitor,
  Save,
  BookOpen,
  AlignLeft,
  RotateCcw,
  Wallet,
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useSubscription } from '@/hooks/useSubscription';
import { ManageBillingButton } from '@/components/ManageBillingButton';
import { AccountDataSection } from '@/components/settings/AccountDataSection';
import { loadUserPrefs, saveUserPrefs } from '@/lib/userPrefs';
import { notifyPrefsChanged } from '@/hooks/useUserPrefs';
import { applyDisplaySettings } from '@/lib/displaySettings';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';

/** Theme metadata that doesn't translate (icons, swatches). Labels
 *  and hints come from i18n via t() at render time. */
const STANDARD_THEMES = [
  { id: 'light', labelKey: 'settings.themeLight', Icon: Sun, swatch: '#ffffff' },
  { id: 'dark', labelKey: 'settings.themeDark', Icon: Moon, swatch: '#1c1c24' },
  { id: 'auto', labelKey: 'settings.themeAuto', Icon: Monitor, swatch: 'linear-gradient(90deg,#fff 50%,#1c1c24 50%)' },
];

const READING_THEMES = [
  { id: 'cream', labelKey: 'settings.themeCream', hintKey: 'settings.themeCreamHint', swatch: '#FFFDD0' },
  { id: 'yellow', labelKey: 'settings.themeYellow', hintKey: 'settings.themeYellowHint', swatch: '#FFFFE0' },
  { id: 'peach', labelKey: 'settings.themePeach', hintKey: 'settings.themePeachHint', swatch: '#FFE5CC' },
];

const CALM_THEMES = [
  { id: 'calm', labelKey: 'settings.themeCalmLabel', hintKey: 'settings.themeCalmHint', swatch: '#F5F5DC' },
];

const FONT_SIZE_OPTIONS = [
  { id: 'sm', labelKey: 'settings.fontSmall' },
  { id: 'md', labelKey: 'settings.fontMedium' },
  { id: 'lg', labelKey: 'settings.fontLarge' },
];

const FONT_FAMILY_OPTIONS = [
  { id: 'default', labelKey: 'settings.fontDefault', hintKey: 'settings.fontDefaultHint' },
  { id: 'accessible', labelKey: 'settings.fontAccessible', hintKey: 'settings.fontAccessibleHint' },
];

const LINE_SPACING_OPTIONS = [
  { id: 'normal', labelKey: 'settings.lineNormal' },
  { id: 'wide', labelKey: 'settings.lineWide', hintKey: 'settings.lineWideHint' },
];

function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const sub = useSubscription();
  const { t } = useTranslation();

  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState(false);
  // DB-backed boost-email toggle. Separate from `prefs` (which is
  // localStorage-ish display settings) because this drives the
  // daily-boost-digest edge function and must persist server-side.
  // Default OFF (2026-10-17, legal package C): the digest is an optional
  // email, so it needs an opt-in (PECR reg 22). A user only gets it after
  // switching it on here, which writes boost_email_enabled = true.
  const [boostEmailEnabled, setBoostEmailEnabled] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Load saved preferences
  useEffect(() => {
    let alive = true;
    if (!user) return;
    loadUserPrefs(user.id).then((p) => {
      if (alive) setPrefs(p);
    });
    // DB-backed notification prefs. No row = not opted in = OFF. (The
    // table column still defaults to true; daily-boost-digest now only
    // sends to rows with boost_email_enabled = true. DB default change
    // is left to the migrations package.)
    supabase
      .from('user_notification_prefs')
      .select('boost_email_enabled')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        setBoostEmailEnabled(data?.boost_email_enabled === true);
      });
    return () => {
      alive = false;
    };
  }, [user]);

  // Handle ?notifications=off from email unsubscribe links — one-click
  // disable, then clear the query param so refresh doesn't re-apply.
  useEffect(() => {
    if (!user) return;
    if (searchParams.get('notifications') !== 'off') return;
    setBoostEmailEnabled(false);
    supabase
      .from('user_notification_prefs')
      .upsert(
        { user_id: user.id, boost_email_enabled: false },
        { onConflict: 'user_id' }
      )
      .then(() => {
        toast({ title: 'Boost emails turned off.' });
        const next = new URLSearchParams(searchParams);
        next.delete('notifications');
        setSearchParams(next, { replace: true });
      });
    // toast + setSearchParams identities are stable enough here that
    // we don't need them in deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, searchParams]);

  const setBoostEmail = async (value) => {
    if (!user) return;
    setBoostEmailEnabled(value);
    const { error } = await supabase
      .from('user_notification_prefs')
      .upsert(
        { user_id: user.id, boost_email_enabled: value },
        { onConflict: 'user_id' }
      );
    if (error) {
      // Rollback UI on failure.
      setBoostEmailEnabled(!value);
      toast({
        title: "Couldn't save preference",
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Apply display settings live as the user toggles them
  useEffect(() => {
    if (prefs) applyDisplaySettings(prefs);
  }, [prefs]);

  const updatePref = (patch) => setPrefs((p) => ({ ...p, ...patch }));

  const handleSave = async () => {
    if (!user || !prefs) return;
    setSaving(true);
    try {
      await saveUserPrefs(user.id, prefs);
      // Tell any open ComparePage/StoreDetailPage/StrategyPage that
      // depends on prefs (walletOnly, etc) to re-read them now.
      notifyPrefsChanged();
      toast({
        title: t('settings.saved'),
        description: t('settings.savedDesc'),
      });
    } finally {
      setSaving(false);
    }
  };

  if (!prefs) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t('settings.loading')}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Subscription badge ────────────────────────────────────────
  const subBadge = sub.isActive
    ? {
        label: `${t('settings.subscribed')} · ${sub.plan || 'monthly'}`,
        color: 'bg-primary/10 text-primary',
        icon: CheckCircle2,
      }
    : sub.inTrial
    ? {
        label: `${t('settings.trial')} · ${sub.trialDaysLeft} ${
          sub.trialDaysLeft === 1
            ? t('settings.daysLeft')
            : t('settings.daysLeftPlural')
        }`,
        color: 'bg-light-pink text-secondary',
        icon: Clock,
      }
    : {
        label: t('settings.freePlan'),
        color: 'bg-muted text-muted-foreground',
        icon: AlertCircle,
      };
  const SubIcon = subBadge.icon;

  return (
    <>
      <Helmet>
        <title>Settings — SnapGain</title>
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-3xl space-y-5">
        {/* ─── Title ────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center space-y-2"
        >
          <h1 className="text-2xl md:text-3xl font-bold">{t('settings.title')}</h1>
          <p className="text-muted-foreground text-sm">
            {t('settings.subtitle')}
          </p>
        </motion.div>

        {/* ─── Subscription ────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  {t('settings.subscription')}
                </CardTitle>
                <CardDescription className="mt-1">
                  {t('settings.subscriptionTagline')}
                </CardDescription>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${subBadge.color}`}
              >
                <SubIcon className="w-3.5 h-3.5" />
                {subBadge.label}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {sub.isActive && sub.periodEndsAt && (
              <p className="text-sm text-muted-foreground">
                {t('settings.renewsOn')}{' '}
                <span className="font-semibold">
                  {new Date(sub.periodEndsAt).toLocaleDateString()}
                </span>
                {sub.periodDaysLeft
                  ? ` (${sub.periodDaysLeft} ${t('settings.days')})`
                  : ''}
                .
              </p>
            )}
            {sub.inTrial && sub.trialEndsAt && (
              <p className="text-sm text-muted-foreground">
                {t('settings.trialEndsOnPrefix')}{' '}
                <span className="font-semibold">
                  {new Date(sub.trialEndsAt).toLocaleDateString()}
                </span>
                {t('settings.trialEndsOnSuffix')}
              </p>
            )}
            {!sub.isPremium && (
              <p className="text-sm text-muted-foreground">
                {t('settings.freeCopy')}
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              {!sub.isActive ? (
                <Button asChild>
                  <Link to="/pricing">
                    {sub.inTrial
                      ? t('settings.upgradeNow')
                      : t('settings.seePlans')}
                  </Link>
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link to="/pricing">{t('settings.changePlan')}</Link>
                </Button>
              )}
              {sub.isActive && (
                <ManageBillingButton variant="outline">
                  {t('settings.manageSubscription')}
                </ManageBillingButton>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ─── Comparison ─────────────────────────────────────────
            Lets the user opt into wallet-scoped Compare results.
            Default is OFF so a new user sees the full catalogue and
            isn't surprised by an empty page after enabling it. */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              Comparison
            </CardTitle>
            <CardDescription>
              Tune what shows up in Compare, Store details and the
              Best-strategy view.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ToggleRow
              id="wallet-only"
              label="Only show routes from my wallet"
              description="Hide cashback platforms and miles programs you haven't added on your Profile. If your wallet is empty we still show all routes so you can browse."
              checked={prefs.walletOnly}
              onChange={(v) => updatePref({ walletOnly: v })}
            />
          </CardContent>
        </Card>

        {/* ─── Boost digest email (DB-backed, drives the daily-boost-digest fn) ─ */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Boost email digest
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ToggleRow
              id="boost-email"
              label="Daily boost email (optional, off unless you switch it on)"
              description="At most one email a day when a store you've favourited gets a cashback boost or rate increase, sent around 9am UK time. Every email has a link to turn it off, or switch it off here at any time."
              checked={boostEmailEnabled}
              onChange={setBoostEmail}
            />
          </CardContent>
        </Card>

        {/* ─── Notifications (local-only display prefs) ────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              {t('settings.notifications')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ToggleRow
              id="notif-email"
              label={t('settings.emailNotifications')}
              checked={prefs.notifEmail}
              onChange={(v) => updatePref({ notifEmail: v })}
            />
            <ToggleRow
              id="notif-push"
              label={t('settings.pushNotifications')}
              checked={prefs.notifPush}
              onChange={(v) => updatePref({ notifPush: v })}
            />
            <ToggleRow
              id="notif-weekly"
              label={t('settings.weeklyReports')}
              checked={prefs.notifWeekly}
              onChange={(v) => updatePref({ notifWeekly: v })}
            />
            <ToggleRow
              id="notif-deals"
              label={t('settings.dealAlerts')}
              checked={prefs.notifDeals}
              onChange={(v) => updatePref({ notifDeals: v })}
            />
          </CardContent>
        </Card>

        {/* ─── Security ────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              {t('settings.security')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ToggleRow
              id="two-factor"
              label={t('settings.twoFactor')}
              description={t('settings.twoFactorDesc')}
              checked={prefs.twoFactorEnabled}
              onChange={(v) => updatePref({ twoFactorEnabled: v })}
            />
          </CardContent>
        </Card>

        {/* ─── Marketing Preferences ──────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary" />
              {t('settings.marketing')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ToggleRow
              id="marketing"
              label={t('settings.marketingEmails')}
              description={t('settings.marketingDesc')}
              checked={prefs.marketingEmails}
              onChange={(v) => updatePref({ marketingEmails: v })}
            />
          </CardContent>
        </Card>

        {/* ─── Display & Reading ───────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              {t('settings.displayReading')}
            </CardTitle>
            <CardDescription>{t('settings.displayReadingDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Standard themes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm font-medium">{t('settings.theme')}</Label>
                {/* Reset to default — only shows when current theme is
                    not the standard "light" (no need to reset what is
                    already the default). */}
                {prefs.theme !== 'light' && (
                  <button
                    type="button"
                    onClick={() => updatePref({ theme: 'light' })}
                    className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset to default
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {STANDARD_THEMES.map(({ id, labelKey, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => updatePref({ theme: id })}
                    className={cn(
                      'flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-colors text-sm font-medium',
                      prefs.theme === id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50 text-foreground'
                    )}
                    aria-pressed={prefs.theme === id}
                  >
                    <Icon className="w-5 h-5" />
                    {t(labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* Reading-friendly themes (dyslexia-supportive) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  {t('settings.readingThemes')}
                </Label>
                {/* Quick escape when a reading theme is currently active:
                    selecting "Use standard colours" reverts to the
                    default light theme without making the user scroll
                    back to the Standard Themes block above. */}
                {READING_THEMES.some((rt) => rt.id === prefs.theme) && (
                  <button
                    type="button"
                    onClick={() => updatePref({ theme: 'light' })}
                    className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Use standard colours
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('settings.readingThemesDesc')}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {READING_THEMES.map(({ id, labelKey, hintKey, swatch }) => (
                  <ThemeSwatchButton
                    key={id}
                    id={id}
                    label={t(labelKey)}
                    swatch={swatch}
                    hint={hintKey ? t(hintKey) : undefined}
                    active={prefs.theme === id}
                    onClick={() => updatePref({ theme: id })}
                  />
                ))}
              </div>
            </div>

            {/* Calm mode (autism-supportive) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm font-medium">{t('settings.calmMode')}</Label>
                {CALM_THEMES.some((ct) => ct.id === prefs.theme) && (
                  <button
                    type="button"
                    onClick={() => updatePref({ theme: 'light' })}
                    className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Use standard colours
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('settings.calmModeDesc')}
              </p>
              <div className="grid grid-cols-1 gap-2">
                {CALM_THEMES.map(({ id, labelKey, hintKey, swatch }) => (
                  <ThemeSwatchButton
                    key={id}
                    id={id}
                    label={t(labelKey)}
                    swatch={swatch}
                    hint={hintKey ? t(hintKey) : undefined}
                    active={prefs.theme === id}
                    onClick={() => updatePref({ theme: id })}
                  />
                ))}
              </div>
            </div>

            {/* Font size */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Type className="w-4 h-4" />
                {t('settings.fontSize')}
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {FONT_SIZE_OPTIONS.map(({ id, labelKey }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => updatePref({ fontSize: id })}
                    className={cn(
                      'py-2 rounded-xl border-2 transition-colors font-medium',
                      prefs.fontSize === id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50',
                      id === 'sm' && 'text-xs',
                      id === 'md' && 'text-sm',
                      id === 'lg' && 'text-base'
                    )}
                    aria-pressed={prefs.fontSize === id}
                  >
                    {t(labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* Font family */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('settings.fontFamily')}</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {FONT_FAMILY_OPTIONS.map(({ id, labelKey, hintKey }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => updatePref({ fontFamily: id })}
                    className={cn(
                      'text-left p-3 rounded-xl border-2 transition-colors',
                      prefs.fontFamily === id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    )}
                    aria-pressed={prefs.fontFamily === id}
                    style={
                      id === 'accessible'
                        ? { fontFamily: "'Lexend', sans-serif" }
                        : undefined
                    }
                  >
                    <div className="text-sm font-semibold">{t(labelKey)}</div>
                    {hintKey && (
                      <div className="text-xs text-muted-foreground">
                        {t(hintKey)}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Line spacing */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <AlignLeft className="w-4 h-4" />
                {t('settings.lineSpacing')}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {LINE_SPACING_OPTIONS.map(({ id, labelKey, hintKey }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => updatePref({ lineSpacing: id })}
                    className={cn(
                      'p-3 rounded-xl border-2 transition-colors text-left',
                      prefs.lineSpacing === id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    )}
                    aria-pressed={prefs.lineSpacing === id}
                  >
                    <div className="text-sm font-semibold">{t(labelKey)}</div>
                    {hintKey && (
                      <div className="text-xs text-muted-foreground">
                        {t(hintKey)}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Accessibility ──────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              {t('settings.accessibility')}
            </CardTitle>
            <CardDescription>{t('settings.accessibilityDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ToggleRow
              id="reduce-motion"
              label={t('settings.reduceAnimations')}
              description={t('settings.reduceAnimationsDesc')}
              checked={prefs.reduceMotion}
              onChange={(v) => updatePref({ reduceMotion: v })}
            />
            <ToggleRow
              id="high-contrast"
              label={t('settings.highContrast')}
              description={t('settings.highContrastDesc')}
              checked={prefs.highContrast}
              onChange={(v) => updatePref({ highContrast: v })}
            />
          </CardContent>
        </Card>

        {/* ─── Save Button (sticky-ish) ───────────────────────── */}
        <div className="sticky bottom-4 z-10 pt-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 text-base bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-lg"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? t('settings.saving') : t('settings.saveSettings')}
          </Button>
        </div>

        {/* ─── Your data (export / delete account) ───────────── */}
        <AccountDataSection />

        {/* ─── Need help? ────────────────────────────────────── */}
        <p className="text-center text-xs text-muted-foreground pt-2">
          {t('settings.needHelp')}{' '}
          <Link to="/contact" className="text-primary hover:underline font-medium">
            {t('settings.contactSupport')}
          </Link>
        </p>
      </div>
    </>
  );
}

function ThemeSwatchButton({ id, label, swatch, hint, active, onClick }) {
  const isGradient = swatch?.includes('gradient');
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 p-3 rounded-xl border-2 transition-colors text-left',
        active
          ? 'border-primary bg-primary/10'
          : 'border-border hover:border-primary/50'
      )}
      aria-pressed={active}
      aria-label={`${label}: ${hint || ''}`}
    >
      <span
        className="w-8 h-8 rounded-lg border shrink-0"
        style={
          isGradient
            ? { backgroundImage: swatch }
            : { backgroundColor: swatch }
        }
        aria-hidden="true"
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold truncate">{label}</span>
        {hint && (
          <span className="block text-xs text-muted-foreground truncate">
            {hint}
          </span>
        )}
      </span>
    </button>
  );
}

function ToggleRow({ id, label, description, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <div className="flex-1 min-w-0">
        <Label htmlFor={id} className="text-sm font-medium cursor-pointer">
          {label}
        </Label>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export default SettingsPage;
