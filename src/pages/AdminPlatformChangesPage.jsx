import React, { useEffect, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ShieldAlert,
  PlayCircle,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/lib/customSupabaseClient';

// AdminPlatformChangesPage
// Review queue for auto-detected changes in platforms_explained.
// Powered by edge function `platforms-meta-sync` (weekly cron).
// Approve → applies UPDATE to platforms_explained.typical_rate_label
// Reject  → marks rejected with optional note
// Rule 8.5: NEVER auto-applies values without explicit human approval.

function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-amber-100 text-amber-900 border-amber-200',
    approved: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    rejected: 'bg-rose-100 text-rose-900 border-rose-200',
    superseded: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  };
  return (
    <span
      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${styles[status] || styles.pending}`}
    >
      {status}
    </span>
  );
}

function ChangeRow({ row, onApprove, onReject }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const apply = async (kind) => {
    setBusy(true);
    try {
      if (kind === 'approve') {
        await onApprove(row, note);
      } else {
        await onReject(row, note);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <CardTitle className="text-lg">
              {row.platform_slug}{' '}
              <span className="text-xs text-muted-foreground">
                · {row.field_name}
              </span>
            </CardTitle>
            <CardDescription>
              Fetched{' '}
              {new Date(row.fetched_at).toLocaleString('en-GB', {
                dateStyle: 'short',
                timeStyle: 'short',
              })}{' '}
              · diff score{' '}
              <span className="font-mono">
                {Number(row.diff_score ?? 0).toFixed(2)}
              </span>
            </CardDescription>
          </div>
          <StatusBadge status={row.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">
              Current (DB)
            </div>
            <div className="text-sm font-mono break-words">
              {row.current_value || (
                <span className="text-zinc-400 italic">empty</span>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="text-xs uppercase tracking-wider text-amber-700 mb-1">
              Detected from site
            </div>
            <div className="text-sm font-mono break-words">
              {row.detected_value || (
                <span className="text-zinc-400 italic">empty</span>
              )}
            </div>
          </div>
        </div>

        {row.raw_extract && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Raw extract ({row.raw_extract.split('\n').length} snippets)
            </summary>
            <pre className="mt-2 p-2 bg-zinc-900 text-zinc-100 rounded text-[11px] whitespace-pre-wrap break-words max-h-48 overflow-auto">
              {row.raw_extract}
            </pre>
          </details>
        )}

        <a
          href={row.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs inline-flex items-center gap-1 text-primary hover:underline"
        >
          {row.source_url} <ExternalLink className="w-3 h-3" />
        </a>

        {row.status === 'pending' && (
          <div className="pt-2 space-y-2">
            <input
              type="text"
              placeholder="Optional reviewer note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:border-primary"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => apply('approve')}
                disabled={busy}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Approve & apply
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => apply('reject')}
                disabled={busy}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </div>
          </div>
        )}

        {row.reviewer_note && (
          <div className="text-xs text-muted-foreground italic">
            Note: {row.reviewer_note}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminPlatformChangesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [triggering, setTriggering] = useState(false);

  // Admin comes from `user_profiles.role`, surfaced by useSubscription.
  // It used to read `user.user_metadata.role` — the bag
  // `supabase.auth.updateUser({ data })` writes, so any user could set
  // `role: 'admin'` on themselves. See migration 0007.
  const { isAdmin } = useSubscription();

  const fetchRows = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('platforms_meta_changes')
      .select('*')
      .order('fetched_at', { ascending: false })
      .limit(50);
    if (filter !== 'all') query = query.eq('status', filter);
    const { data, error } = await query;
    if (error) {
      toast({ title: 'Failed to load', description: error.message, variant: 'destructive' });
    } else {
      setRows(data || []);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    if (isAdmin) fetchRows();
  }, [isAdmin, fetchRows]);

  const handleApprove = async (row, note) => {
    // 1. Update target table
    const { error: updErr } = await supabase
      .from('platforms_explained')
      .update({
        [row.field_name]: row.detected_value,
        source: `admin-approved-${new Date().toISOString().slice(0, 10)}`,
        updated_at: new Date().toISOString(),
      })
      .eq('slug', row.platform_slug);

    if (updErr) {
      toast({ title: 'Update failed', description: updErr.message, variant: 'destructive' });
      return;
    }

    // 2. Mark queue row approved
    const { error: qErr } = await supabase
      .from('platforms_meta_changes')
      .update({
        status: 'approved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        reviewer_note: note || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);

    if (qErr) {
      toast({ title: 'Queue update failed', description: qErr.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Approved', description: `${row.platform_slug} → applied to live` });
    fetchRows();
  };

  const handleReject = async (row, note) => {
    const { error } = await supabase
      .from('platforms_meta_changes')
      .update({
        status: 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        reviewer_note: note || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);

    if (error) {
      toast({ title: 'Reject failed', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Rejected', description: row.platform_slug });
    fetchRows();
  };

  const triggerSyncNow = async () => {
    setTriggering(true);
    try {
      const { data, error } = await supabase.functions.invoke('platforms-meta-sync', {
        method: 'POST',
      });
      if (error) throw error;
      toast({
        title: 'Sync complete',
        description: `${data.platforms_checked} checked · ${data.enqueued} enqueued`,
      });
      fetchRows();
    } catch (e) {
      toast({ title: 'Sync failed', description: e.message, variant: 'destructive' });
    } finally {
      setTriggering(false);
    }
  };

  if (!user) return null;

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
          in the SQL editor. Setting it on the auth user&rsquo;s user_metadata
          no longer works, because that field is writable by the account
          holder.
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
        <title>Platform changes review — SnapGain admin</title>
      </Helmet>

      <div className="container mx-auto px-4 py-8 space-y-6 max-w-4xl">
        <Link
          to="/home"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Platform changes review</h1>
          <p className="text-muted-foreground text-sm">
            Auto-detected rate changes from <code className="text-xs">platforms-meta-sync</code>{' '}
            edge function. Approve to apply to live <code className="text-xs">platforms_explained</code>{' '}
            table. Cron runs every Sunday 03:00 UTC.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {['pending', 'approved', 'rejected', 'superseded', 'all'].map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f}
            </Button>
          ))}
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRows}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={triggerSyncNow}
            disabled={triggering}
            className="bg-primary"
          >
            <PlayCircle className={`w-4 h-4 mr-1 ${triggering ? 'animate-pulse' : ''}`} />
            {triggering ? 'Running…' : 'Run sync now'}
          </Button>
        </div>

        {loading && (
          <div className="text-center py-12 text-muted-foreground">Loading…</div>
        )}

        {!loading && rows.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No <strong>{filter}</strong> changes. Click <em>Run sync now</em> to check the
              13 platforms against their official sites.
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {rows.map((row) => (
            <ChangeRow
              key={row.id}
              row={row}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      </div>
    </>
  );
}
