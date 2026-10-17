import React, { useState } from 'react';
import { Download, Trash2, Loader2, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const CONFIRM_WORD = 'DELETE';

/** Read the JSON body of a non-2xx functions.invoke() error, if any. */
async function errorBody(error) {
  try {
    if (error?.context && typeof error.context.json === 'function') {
      return await error.context.json();
    }
  } catch {
    // body was not JSON
  }
  return null;
}

/**
 * "Your data" — download a copy of everything SnapGain holds about the
 * signed-in user, or delete the account. Both go through the
 * `delete-account` Edge Function, which acts only on the caller.
 */
export function AccountDataSection() {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState('');

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: { action: 'export' },
      });
      if (error) {
        const body = await errorBody(error);
        throw new Error(body?.error || error.message);
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `snapgain-my-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast({
        title: "Couldn't download your data",
        description: err?.message || 'Try again later.',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const closeDialog = (next) => {
    if (deleting) return;
    setOpen(next);
    if (!next) {
      setTyped('');
      setBlockedMessage('');
    }
  };

  const handleDelete = async () => {
    if (deleting || typed !== CONFIRM_WORD) return;
    setDeleting(true);
    setBlockedMessage('');
    try {
      const { error } = await supabase.functions.invoke('delete-account', {
        body: { action: 'delete', confirm: CONFIRM_WORD },
      });
      if (error) {
        // Stripe refused (502), billing could not be verified (409) or
        // the delete itself failed: keep the dialog open and say why.
        const body = await errorBody(error);
        const message = body?.message || body?.error;
        if (message) {
          setBlockedMessage(message);
          setDeleting(false);
          return;
        }
        throw new Error(error.message);
      }
      // The account is gone server-side; only clear the local session.
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      window.location.assign('/');
    } catch (err) {
      toast({
        title: "Couldn't delete your account",
        description: err?.message || 'Try again later.',
        variant: 'destructive',
      });
      setDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-primary" />
          Your data
        </CardTitle>
        <CardDescription>
          Download a copy of what SnapGain holds about you, or delete your
          account for good.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Download my data</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              A JSON file with your profile, wallet, favourites, saved
              strategies and settings.
            </p>
          </div>
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Download my data
          </Button>
        </div>

        <div className="flex items-start justify-between gap-3 flex-wrap border-t pt-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Delete my account</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Permanently removes your account and everything linked to it.
              This cannot be undone. Any subscription ends immediately.
            </p>
          </div>
          <Button variant="destructive" onClick={() => setOpen(true)}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete my account
          </Button>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your SnapGain account?</DialogTitle>
            <DialogDescription>
              Your profile, wallet, favourites, saved strategies, searches and
              settings will be deleted straight away. You can download a copy
              of your data first.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm space-y-1.5">
            <p>
              <span className="font-semibold">If you have a subscription, deleting your
              account ends it immediately.</span> There is no automatic refund for
              unused time.
            </p>
            <p className="text-muted-foreground">
              Subscribed in the last 14 days? Email{' '}
              <a href="mailto:support@snapgain.uk" className="text-primary hover:underline">
                support@snapgain.uk
              </a>{' '}
              for a proportional refund <span className="font-semibold">before</span>{' '}
              deleting your account.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="delete-confirm" className="text-sm">
              Type <span className="font-mono font-semibold">{CONFIRM_WORD}</span> to confirm
            </Label>
            <Input
              id="delete-confirm"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              disabled={deleting}
            />
            {blockedMessage && (
              <p className="text-sm text-destructive" role="alert">
                {blockedMessage}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => closeDialog(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || typed !== CONFIRM_WORD}
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete my account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default AccountDataSection;
