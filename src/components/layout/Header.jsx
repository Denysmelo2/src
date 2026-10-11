import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  LogIn,
  UserPlus,
  LayoutDashboard,
  Settings,
  LogOut,
  Scale,
  User as UserIcon,
  Bookmark,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { NotificationBell } from '@/components/NotificationBell';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';

const AUTHED_NAV = [
  { to: '/home', key: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/compare', key: 'nav.compare', icon: Scale },
  { to: '/profile', key: 'nav.profile', icon: UserIcon },
  { to: '/settings', key: 'nav.settings', icon: Settings },
];

// Marketing nav (visitors only) — anchors to landing-page sections.
// When user is on /, clicking scrolls smoothly; when on any other page,
// it navigates to / with the hash so the browser handles the scroll.
// 2026-07-05: 'Travel' entry removed — <TravelAngle /> section was
// taken out of the LandingPage on 2026-05-14 per internal review, so
// its #travel anchor no longer exists in the DOM. Leaving the button
// in the nav made every click a silent no-op. If TravelAngle is ever
// re-enabled in src/pages/LandingPage.jsx, add the entry back here.
//
// 'Calculate' added same day — the #calculator section is the highest
// conversion asset on the landing (interactive, shows real £/Avios
// numbers for the visitor's own spend). Putting it between the
// "learn" step (How it works) and the "buy" step (Pricing) matches
// the natural funnel order.
const MARKETING_NAV = [
  { hash: 'how-it-works', label: 'How it works' },
  { hash: 'calculator', label: 'Calculate' },
  { hash: 'faq', label: 'FAQ' },
  { hash: 'pricing', label: 'Pricing' },
];

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length > 1) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name[0].toUpperCase();
}

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const displayName =
    user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  // Admin comes from `user_profiles.role`, surfaced by useSubscription.
  // It used to read `user.user_metadata.role` — the bag
  // `supabase.auth.updateUser({ data })` writes, so any user could set
  // `role: 'admin'` on themselves. See migration 0007.
  const { isAdmin } = useSubscription();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleMarketingNav = (hash) => {
    const el =
      typeof document !== 'undefined' ? document.getElementById(hash) : null;
    const onLanding = window.location.pathname === '/';

    if (onLanding && el) {
      // Same-page scroll. Skip navigate() because navigating to a hash
      // that already matches window.location.hash is a no-op and the
      // useEffect in ScrollToTopOnNav won't re-fire — clicking Travel
      // twice, or clicking it while the URL still has #travel from
      // earlier, would silently do nothing. Push the URL directly and
      // trigger scrollIntoView ourselves so every click always scrolls.
      window.history.pushState(null, '', `/#${hash}`);
      el.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // Not on landing OR anchor not yet in the DOM. Route through React
    // Router so ScrollToTopOnNav picks up the hash on mount and does
    // the deferred scroll.
    navigate(`/#${hash}`);
  };

  return (
    <header className="bg-background/80 backdrop-blur-sm border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        {/* Grid layout.
            - Mobile: [logo | nav | right] with nav taking the flexible
              middle so all 4 tab icons fit at 375px. Nav is icon-only
              on phones (labels reappear from md:), which lets the
              header replace the BottomTabBar entirely (Bárbara
              2026-07-05).
            - Desktop (md+): symmetric grid-cols-3 as before, so the
              text nav sits at the true visual centre. */}
        <div className="grid grid-cols-[auto_1fr_auto] md:grid-cols-3 items-center gap-2 md:gap-4">
          {/* Logo (left column, content aligned start) */}
          <Link to={user ? '/home' : '/'} className="justify-self-start">
            <img
              src="/snapgain-logo.png"
              alt="SnapGain"
              className="h-8 md:h-12 w-auto object-contain"
            />
          </Link>

          {/* Center nav — icon over label on mobile (tab-bar style),
              icon+label pill from md+ (2026-07-05 Bárbara: label
              always visible so users know what each icon means). */}
          <nav className="flex items-center justify-center gap-0.5 md:gap-1">
            {user
              ? AUTHED_NAV.map(({ to, key, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    aria-label={t(key)}
                    className={({ isActive }) =>
                      cn(
                        'transition-colors',
                        // Mobile: stacked icon+label. From md: horizontal
                        // pill with label. Text bumped 2026-07-05 for
                        // legibility (10→11 mobile, sm→base desktop).
                        'flex flex-col items-center gap-0.5 px-2 py-1 text-[11px] font-medium',
                        'md:flex-row md:gap-2 md:px-4 md:py-2 md:text-base md:rounded-full',
                        isActive
                          ? 'text-primary md:bg-primary md:text-primary-foreground md:shadow-sm'
                          : 'text-foreground/70 hover:text-primary md:hover:bg-primary/5'
                      )
                    }
                  >
                    <Icon className="w-5 h-5 md:w-5 md:h-5" />
                    <span>{t(key)}</span>
                  </NavLink>
                ))
              : MARKETING_NAV.map(({ hash, label }) => (
                  <button
                    key={hash}
                    type="button"
                    onClick={() => handleMarketingNav(hash)}
                    className="px-1 md:px-4 py-2 rounded-full text-[13px] md:text-base font-medium text-foreground/80 hover:text-primary hover:bg-primary/5 transition-colors whitespace-nowrap"
                  >
                    {label}
                  </button>
                ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0 justify-self-end">
            {user ? (
              <>
                <NotificationBell />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex items-center gap-2 hover:bg-muted/60 rounded-full pl-1 pr-3 py-1 transition-colors"
                      aria-label="Account menu"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-gradient-to-br from-accent to-light-green text-accent-foreground font-bold">
                          {getInitials(displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:inline text-sm font-medium max-w-[120px] truncate">
                        {displayName}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-52" align="end">
                    <DropdownMenuItem onClick={() => navigate('/saved-strategies')}>
                      <Bookmark className="mr-2 h-4 w-4" />
                      <span>{t('nav.savedStrategies')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/apps')}>
                      <Sparkles className="mr-2 h-4 w-4" />
                      <span>Partner Apps</span>
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate('/admin/hot-deals')}>
                          <Zap className="mr-2 h-4 w-4" />
                          <span>{t('nav.manageHotDeals')}</span>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>{t('nav.logOut')}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="hidden md:inline-flex text-muted-foreground"
                >
                  {t('nav.logout')}
                </Button>
              </>
            ) : (
              <>
                {/* Sign in — icon-only on mobile (label reappears at md+)
                    so the marketing nav has room to breathe. */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/auth/login')}
                  aria-label={t('nav.signIn')}
                  className="px-2 md:px-3"
                >
                  <LogIn className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">{t('nav.signIn')}</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => navigate('/auth/signup')}
                  aria-label={t('nav.signUp')}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-2 md:px-3"
                >
                  <UserPlus className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">{t('nav.signUp')}</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
