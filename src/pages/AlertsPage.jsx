import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bell,
  ArrowLeft,
  CheckCheck,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAlerts } from '@/hooks/useAlerts';
import { StoreLogo } from '@/components/StoreLogo';
import { resolveOpenUrl } from '@/lib/affiliateLinks';
import { platformLabel } from '@/lib/platformNames';

function fmtTimeAgo(iso) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  const mins = Math.round(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

function AlertsPage() {
  const { deals, lastSeenAt, unreadCount, loading, markAllRead } = useAlerts({
    limit: 50,
  });
  const lastSeenMs = lastSeenAt ? new Date(lastSeenAt).getTime() : 0;

  // Mark as read when the user lands on the page (slight delay so the
  // unread badges still flash briefly)
  useEffect(() => {
    if (!loading && unreadCount > 0) {
      const t = setTimeout(() => markAllRead(), 1500);
      return () => clearTimeout(t);
    }
  }, [loading, unreadCount, markAllRead]);

  return (
    <>
      <Helmet>
        <title>Alerts — SnapGain</title>
      </Helmet>

      <div className="container mx-auto px-4 py-8 space-y-6">
        <Link
          to="/home"
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Home
        </Link>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-end justify-between gap-3 flex-wrap"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-2">
              <Bell className="w-8 h-8 text-primary" />
              Alerts
            </h1>
            <p className="text-muted-foreground mt-1">
              Featured opportunities. New ones surface here in real time.
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark all read
            </Button>
          )}
        </motion.section>

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Loading…
            </CardContent>
          </Card>
        ) : deals.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <Bell className="w-12 h-12 mx-auto text-muted-foreground" />
              <p className="text-lg font-medium">No alerts right now</p>
              <p className="text-sm text-muted-foreground">
                When the team publishes new featured deals, they&rsquo;ll show
                up here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {deals.map((deal) => {
              const createdMs = new Date(deal.created_at).getTime();
              const isUnread = createdMs > lastSeenMs;
              const href = resolveOpenUrl({
                rowUrl: deal.cta_url,
                platform: deal.platform,
                storeDomain: deal.store?.domain,
                fallback: deal.store?.slug ? `/store/${deal.store.slug}` : null,
              });
              const inner = (
                <Card
                  className={
                    isUnread
                      ? 'card-hover border-primary/40 bg-gradient-to-br from-light-pink/20 to-card'
                      : 'card-hover'
                  }
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {deal.store ? (
                          <StoreLogo store={deal.store} size="md" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                            <Zap className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isUnread && (
                              <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                                NEW
                              </span>
                            )}
                            {deal.badge && (
                              <span className="text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-light-pink text-secondary">
                                {deal.badge}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {fmtTimeAgo(deal.created_at)}
                            </span>
                          </div>
                          <CardTitle className="text-lg pt-1 leading-tight">
                            {deal.title}
                          </CardTitle>
                          {deal.platform && (
                            <CardDescription>via {platformLabel(deal.platform)}</CardDescription>
                          )}
                        </div>
                      </div>
                      {deal.rate_display && (
                        <div className="text-base font-bold gradient-text whitespace-nowrap">
                          {deal.rate_display}
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  {deal.description && (
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground">
                        {deal.description}
                      </p>
                    </CardContent>
                  )}
                </Card>
              );
              return href ? (
                <Link key={deal.id} to={href}>
                  {inner}
                </Link>
              ) : (
                <div key={deal.id}>{inner}</div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

export default AlertsPage;
