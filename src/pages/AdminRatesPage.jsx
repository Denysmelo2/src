/**
 * /admin/rates — hand-entry for the rate sources that have no feed.
 *
 * Four of the eleven sources cannot be refreshed automatically, and that
 * is a finding rather than a gap in the code. Probed 2026-10-09:
 * giftcards.quidco.com answers HTTP 403 from behind a Cloudflare
 * challenge; top-giftcards.topcashback.co.uk redirects to a member
 * login; and both companies' affiliate programmes are new-member CPL
 * deals through Awin that publish no rate data at all. EverUp and
 * Airtime likewise have nothing to read. So those four get typed in, and
 * this is where.
 *
 * The writes go through the `rate-entry` Edge Function, not straight to
 * PostgREST. `gift_card_offers` has no admin write policy, and the
 * policies on `cashback_offers` are keyed on `is_admin()`, which reads a
 * field the user can write about themselves — so adding a policy would
 * have widened a live hole. The function holds the service key and
 * decides from `user_profiles.role` instead. See
 * supabase/functions/rate-entry/index.ts and migration 0007.
 *
 * Every write stamps last_verified_at. That is the entire point: the
 * same figure typed today and left for five months should not look the
 * same to a user, and now it doesn't — the age shows on every route (see
 * lib/dataFreshness.js).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Search,
  ShieldAlert,
  RefreshCw,
  CheckCheck,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useSubscription } from '@/hooks/useSubscription';
import { DataAge } from '@/components/DataAge';
import { cn } from '@/lib/utils';

// Must match the SOURCES allowlist in the Edge Function. Kept in both
// places on purpose: the function is the one that enforces it, and it
// must not trust this list.
const SOURCES = [
  { key: 'everup', label: 'EverUp', unit: '% off', what: 'gift card discount' },
  { key: 'topcashback-giftcards', label: 'TopCashback gift cards', unit: '% off', what: 'gift card discount' },
  { key: 'quidco-giftcards', label: 'Quidco gift cards', unit: '% off', what: 'gift card discount' },
  { key: 'airtime', label: 'Airtime', unit: '% cashback', what: 'cashback rate' },
];

/** The column the value lives in, per source. */
function valueOf(row, sourceKey) {
  return sourceKey === 'airtime' ? row.rate : row.discount_pct;
}

function AdminRatesPage() {
  const { isAdmin, loading: subLoading } = useSubscription();

  const [sourceKey, setSourceKey] = useState(SOURCES[0].key);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  // id -> the string the operator typed. Kept as a string so a
  // half-typed "7." doesn't get coerced to 7 under their fingers.
  const [edits, setEdits] = useState({});

  const source = SOURCES.find((s) => s.key === sourceKey) ?? SOURCES[0];

  const call = useCallback(async (body) => {
    const { data, error } = await supabase.functions.invoke('rate-entry', { body });
    if (error) throw new Error(error.message || 'request failed');
    if (data && data.ok === false) throw new Error(data.error || 'rejected');
    return data;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setEdits({});
    try {
      const data = await call({ action: 'list', source: sourceKey });
      setRows(Array.isArray(data?.rows) ? data.rows : []);
    } catch (err) {
      setRows([]);
      toast({
        title: 'Could not load',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [call, sourceKey]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? rows.filter((r) => (r.stores?.name || '').toLowerCase().includes(q))
      : rows;
    // Oldest first — the whole reason for this screen is the stale ones.
    return [...list].sort((a, b) => {
      const av = a.last_verified_at ? Date.parse(a.last_verified_at) : 0;
      const bv = b.last_verified_at ? Date.parse(b.last_verified_at) : 0;
      return av - bv;
    });
  }, [rows, query]);

  // Only rows whose typed value is a real change. A row touched and then
  // typed back to its original value is NOT a change, and must not be
  // saved — saving it would re-date it, which would claim a verification
  // that did not happen.
  const dirty = useMemo(() => {
    const out = [];
    for (const r of rows) {
      const typed = edits[r.id];
      if (typed === undefined) continue;
      const value = Number(typed);
      if (!Number.isFinite(value)) continue;
      if (value === Number(valueOf(r, sourceKey))) continue;
      out.push({ id: r.id, value });
    }
    return out;
  }, [rows, edits, sourceKey]);

  const invalid = useMemo(
    () =>
      Object.entries(edits).filter(([, v]) => {
        if (v === '' || v === undefined) return false;
        const n = Number(v);
        return !Number.isFinite(n) || n < 0 || n > 100;
      }),
    [edits]
  );

  const save = async () => {
    if (dirty.length === 0 || invalid.length > 0) return;
    setBusy(true);
    try {
      const res = await call({ action: 'save', source: sourceKey, edits: dirty });
      toast({
        title: `${res.updated} rate${res.updated === 1 ? '' : 's'} saved`,
        description: 'Verification date set to now.',
      });
      await load();
    } catch (err) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const reconfirm = async () => {
    const n = rows.filter((r) => r.is_active).length;
    const ok = window.confirm(
      `Re-date all ${n} active ${source.label} offers to right now, without changing any ` +
        `number.\n\nOnly do this if you have JUST looked at ${source.label} and the rates ` +
        `are genuinely unchanged. It tells every user these figures were checked today.`
    );
    if (!ok) return;
    setBusy(true);
    try {
      const res = await call({ action: 'reconfirm', source: sourceKey, confirm: true });
      toast({
        title: `${res.reconfirmed} offers re-dated`,
        description: 'Rates unchanged; verification date set to now.',
      });
      await load();
    } catch (err) {
      toast({ title: 'Reconfirm failed', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async (row) => {
    const ok = window.confirm(
      `Hide "${row.stores?.name || row.store_id}" from ${source.label}?\n\n` +
        `The row is kept, with its real verification date — it just stops being offered.`
    );
    if (!ok) return;
    setBusy(true);
    try {
      await call({ action: 'deactivate', source: sourceKey, ids: [row.id] });
      toast({ title: 'Offer hidden' });
      await load();
    } catch (err) {
      toast({ title: 'Could not hide', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  // ── Gates ──────────────────────────────────────────────────────────
  if (subLoading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-20 text-center space-y-3 max-w-md">
        <ShieldAlert className="w-12 h-12 text-secondary mx-auto" />
        <h1 className="text-2xl font-bold">Admin only</h1>
        <p className="text-sm text-muted-foreground">
          Admin is granted server-side only &mdash; run{' '}
          <code className="text-xs px-1 bg-muted rounded">
            update public.user_profiles set role = 'admin' where user_id = &hellip;
          </code>{' '}
          in the SQL editor.
        </p>
        <Button asChild variant="outline">
          <Link to="/home">Back</Link>
        </Button>
      </div>
    );
  }

  const oldest = filtered[0]?.last_verified_at ?? null;

  return (
    <>
      <Helmet>
        <title>Rate entry · SnapGain admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-5">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/menu">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Menu
            </Link>
          </Button>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Rate entry</h1>
          <p className="text-sm text-muted-foreground">
            The four sources with no feed to read. Saving a rate sets its
            verification date to now, which is what users see on every route.
          </p>
        </div>

        {/* ── Source picker ── */}
        <div className="flex flex-wrap gap-2">
          {SOURCES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                setSourceKey(s.key);
                setQuery('');
              }}
              className={cn(
                'text-xs font-semibold px-3 py-2 rounded-xl border-2 transition-colors',
                s.key === sourceKey
                  ? 'border-primary bg-light-pink/40 text-foreground'
                  : 'border-primary/20 hover:border-primary/40 text-muted-foreground'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <Card className="border-2 border-primary/15">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {source.label}
              {oldest && <DataAge verifiedAt={oldest} />}
            </CardTitle>
            <CardDescription>
              {loading
                ? 'Loading…'
                : `${rows.length} offers · editing the ${source.what} (${source.unit})`}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find a store"
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="sm" onClick={load} disabled={loading || busy}>
                <RefreshCw className={cn('w-4 h-4 mr-1.5', loading && 'animate-spin')} />
                Reload
              </Button>
              <Button variant="outline" size="sm" onClick={reconfirm} disabled={loading || busy}>
                <CheckCheck className="w-4 h-4 mr-1.5" />
                Checked, nothing changed
              </Button>
              <Button
                size="sm"
                onClick={save}
                disabled={dirty.length === 0 || invalid.length > 0 || busy}
              >
                <Save className="w-4 h-4 mr-1.5" />
                Save {dirty.length > 0 ? `(${dirty.length})` : ''}
              </Button>
            </div>

            {invalid.length > 0 && (
              <p className="text-xs text-red-700 font-medium">
                {invalid.length} value{invalid.length === 1 ? '' : 's'} outside 0–100.
                Fix {invalid.length === 1 ? 'it' : 'them'} before saving.
              </p>
            )}

            {!loading && filtered.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">
                {rows.length === 0 ? 'No offers on this source.' : 'No store matches that.'}
              </p>
            )}

            <div className="divide-y">
              {filtered.slice(0, 150).map((row) => {
                const current = Number(valueOf(row, sourceKey));
                const typed = edits[row.id];
                const shown = typed === undefined ? String(current ?? '') : typed;
                const n = Number(shown);
                const bad = shown !== '' && (!Number.isFinite(n) || n < 0 || n > 100);
                const changed =
                  typed !== undefined && Number.isFinite(n) && n !== current;
                return (
                  <div
                    key={row.id}
                    className={cn(
                      'py-2.5 flex items-center gap-3',
                      !row.is_active && 'opacity-50'
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {row.stores?.name || row.store_id}
                        {!row.is_active && (
                          <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                            hidden
                          </span>
                        )}
                      </div>
                      <DataAge verifiedAt={row.last_verified_at} />
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      <Input
                        value={shown}
                        inputMode="decimal"
                        onChange={(e) =>
                          setEdits((prev) => ({ ...prev, [row.id]: e.target.value }))
                        }
                        className={cn(
                          'w-20 h-9 text-right',
                          bad && 'border-red-500',
                          changed && !bad && 'border-primary'
                        )}
                        aria-label={`${row.stores?.name || 'store'} ${source.what}`}
                      />
                      <span className="text-xs text-muted-foreground w-16">
                        {source.unit}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deactivate(row)}
                        disabled={busy || !row.is_active}
                        title="Hide this offer"
                      >
                        <EyeOff className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {filtered.length > 150 && (
              <p className="text-xs text-muted-foreground text-center">
                Showing the 150 stalest of {filtered.length}. Search to narrow it.
              </p>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Oldest first, because that is what needs doing. The age badges use the
          same thresholds as the ops views: over 8 days is amber, over 30 days
          is red, and users see exactly the same label on every route.
        </p>
      </div>
    </>
  );
}

export default AdminRatesPage;
