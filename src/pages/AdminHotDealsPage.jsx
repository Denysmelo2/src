import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
  Save,
  X,
  Zap,
  ShieldAlert,
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
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useAdminHotDeals, useStores } from '@/hooks/useCatalog';

const SELECT_CLS =
  'w-full h-11 px-3 rounded-xl border-2 border-primary/30 bg-background text-sm focus:outline-none focus:border-primary';

const BLANK = {
  title: '',
  description: '',
  store_id: '',
  platform: '',
  badge: '',
  rate_display: '',
  cta_url: '',
  rank: 100,
  valid_from: '',
  valid_to: '',
  is_active: true,
};

function toIsoOrNull(str) {
  if (!str) return null;
  // Treat empty strings as null; otherwise pass through as ISO
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function fromIso(iso) {
  if (!iso) return '';
  // Convert ISO to <input type="datetime-local"> value (YYYY-MM-DDTHH:mm)
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function DealForm({ initial, stores, onCancel, onSubmit, submitLabel }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || busy) return;
    setBusy(true);
    try {
      await onSubmit({
        title: form.title.trim(),
        description: form.description?.trim() || null,
        store_id: form.store_id || null,
        platform: form.platform?.trim() || null,
        badge: form.badge?.trim() || null,
        rate_display: form.rate_display?.trim() || null,
        cta_url: form.cta_url?.trim() || null,
        rank: Number(form.rank) || 100,
        valid_from: toIsoOrNull(form.valid_from),
        valid_to: toIsoOrNull(form.valid_to),
        is_active: !!form.is_active,
      });
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err.message || 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border rounded-xl p-4 bg-muted/30">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1 md:col-span-2">
          <Label htmlFor="d-title">Title *</Label>
          <Input
            id="d-title"
            value={form.title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="e.g. 15% cashback at Nike today"
            required
          />
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label htmlFor="d-desc">Description</Label>
          <Input
            id="d-desc"
            value={form.description}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="Short context for the user"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="d-store">Store (optional)</Label>
          <select
            id="d-store"
            value={form.store_id}
            onChange={(e) => update({ store_id: e.target.value })}
            className={SELECT_CLS}
          >
            <option value="">— none —</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="d-platform">Platform</Label>
          <Input
            id="d-platform"
            value={form.platform}
            onChange={(e) => update({ platform: e.target.value })}
            placeholder="TopCashback, JamDoughnut, Amex Offers…"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="d-badge">Badge</Label>
          <Input
            id="d-badge"
            value={form.badge}
            onChange={(e) => update({ badge: e.target.value })}
            placeholder="BOOSTED · NEW · LIMITED"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="d-rate">Rate display</Label>
          <Input
            id="d-rate"
            value={form.rate_display}
            onChange={(e) => update({ rate_display: e.target.value })}
            placeholder="15% cashback / 6 Avios per £1"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="d-cta">CTA URL</Label>
          <Input
            id="d-cta"
            value={form.cta_url}
            onChange={(e) => update({ cta_url: e.target.value })}
            placeholder="/store/nike or https://…"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="d-rank">Rank (lower shows first)</Label>
          <Input
            id="d-rank"
            type="number"
            value={form.rank}
            onChange={(e) => update({ rank: e.target.value })}
            placeholder="100"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="d-from">Valid from</Label>
          <Input
            id="d-from"
            type="datetime-local"
            value={form.valid_from}
            onChange={(e) => update({ valid_from: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="d-to">Valid to</Label>
          <Input
            id="d-to"
            type="datetime-local"
            value={form.valid_to}
            onChange={(e) => update({ valid_to: e.target.value })}
          />
        </div>
        <label className="flex items-center gap-2 mt-2 md:col-span-2">
          <input
            type="checkbox"
            checked={!!form.is_active}
            onChange={(e) => update({ is_active: e.target.checked })}
          />
          <span className="text-sm">Active</span>
        </label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy || !form.title.trim()}>
          <Save className="w-4 h-4 mr-2" />
          {busy ? 'Saving…' : submitLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          <X className="w-4 h-4 mr-1" />
          Cancel
        </Button>
      </div>
    </form>
  );
}

function DealRow({ deal, stores, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <DealForm
        stores={stores}
        initial={{
          title: deal.title || '',
          description: deal.description || '',
          store_id: deal.store_id || '',
          platform: deal.platform || '',
          badge: deal.badge || '',
          rate_display: deal.rate_display || '',
          cta_url: deal.cta_url || '',
          rank: deal.rank ?? 100,
          valid_from: fromIso(deal.valid_from),
          valid_to: fromIso(deal.valid_to),
          is_active: !!deal.is_active,
        }}
        onCancel={() => setEditing(false)}
        onSubmit={async (patch) => {
          await onUpdate(deal.id, patch);
          setEditing(false);
        }}
        submitLabel="Save changes"
      />
    );
  }

  return (
    <div className="border rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-3 bg-background">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {deal.badge && (
            <span className="text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-light-pink text-secondary">
              {deal.badge}
            </span>
          )}
          {!deal.is_active && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              hidden
            </span>
          )}
          <span className="text-xs text-muted-foreground">rank {deal.rank}</span>
        </div>
        <div className="font-semibold truncate">{deal.title}</div>
        <div className="text-xs text-muted-foreground">
          {deal.store?.name || '(no store)'} · {deal.platform || '—'}
          {deal.rate_display ? ` · ${deal.rate_display}` : ''}
        </div>
        {(deal.valid_from || deal.valid_to) && (
          <div className="text-xs text-muted-foreground">
            {deal.valid_from ? `from ${new Date(deal.valid_from).toLocaleString()}` : 'always'}
            {' — '}
            {deal.valid_to ? `until ${new Date(deal.valid_to).toLocaleString()}` : 'no end'}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
          <Pencil className="w-3.5 h-3.5 mr-1.5" />
          Edit
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-destructive hover:text-destructive"
          onClick={() => onDelete(deal.id)}
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
          Delete
        </Button>
      </div>
    </div>
  );
}

function AdminHotDealsPage() {
  const { user } = useAuth();
  const { stores } = useStores();
  const { deals, loading, create, update, remove } = useAdminHotDeals();
  const [adding, setAdding] = useState(false);

  // Admin comes from `user_profiles.role`, surfaced by useSubscription.
  // It used to read `user.user_metadata.role` — the bag
  // `supabase.auth.updateUser({ data })` writes, so any user could set
  // `role: 'admin'` on themselves. See migration 0007.
  const { isAdmin } = useSubscription();

  const sortedDeals = useMemo(
    () => [...deals].sort((a, b) => a.rank - b.rank),
    [deals]
  );

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-20 text-center space-y-3 max-w-md">
        <ShieldAlert className="w-12 h-12 text-secondary mx-auto" />
        <h1 className="text-2xl font-bold">Admin only</h1>
        <p className="text-sm text-muted-foreground">
          Your account doesn&rsquo;t have admin access. Admin is granted
          server-side only &mdash; run
          <code className="text-xs px-1 bg-muted rounded mx-1">
            update public.user_profiles set role = 'admin' where user_id = &hellip;
          </code>
          in the SQL editor. Setting it on the auth user&rsquo;s
          user_metadata no longer works, because that field is writable by
          the account holder.
        </p>
        <Button asChild variant="outline">
          <Link to="/home">Back to home</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Manage hot deals — SnapGain</title>
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
          className="flex items-end justify-between gap-4 flex-wrap"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-2">
              <Zap className="w-8 h-8 text-secondary" />
              Hot deals
            </h1>
            <p className="text-muted-foreground mt-1">
              Curated featured opportunities. Changes go live to all users
              instantly via Realtime.
            </p>
          </div>
          {!adding && (
            <Button onClick={() => setAdding(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New deal
            </Button>
          )}
        </motion.section>

        {adding && (
          <Card>
            <CardHeader>
              <CardTitle>New deal</CardTitle>
              <CardDescription>
                Lower rank shows first on the home page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DealForm
                stores={stores}
                initial={BLANK}
                onCancel={() => setAdding(false)}
                onSubmit={async (payload) => {
                  await create(payload);
                  setAdding(false);
                  toast({ title: 'Deal created' });
                }}
                submitLabel="Create deal"
              />
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {loading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading…
              </CardContent>
            </Card>
          ) : sortedDeals.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No hot deals yet — create the first one.
              </CardContent>
            </Card>
          ) : (
            sortedDeals.map((deal) => (
              <DealRow
                key={deal.id}
                deal={deal}
                stores={stores}
                onUpdate={async (id, patch) => {
                  await update(id, patch);
                  toast({ title: 'Saved' });
                }}
                onDelete={async (id) => {
                  if (!window.confirm('Delete this deal?')) return;
                  await remove(id);
                  toast({ title: 'Deleted' });
                }}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}

export default AdminHotDealsPage;
