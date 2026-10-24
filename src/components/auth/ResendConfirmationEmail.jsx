import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function ResendConfirmationEmail({ defaultEmail = "" }) {
  const [email, setEmail] = useState(defaultEmail);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [open, setOpen] = useState(false); // ← controla o popup

  useEffect(() => setEmail(defaultEmail), [defaultEmail]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!email || busy || cooldown) return;

    setBusy(true);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo: `${import.meta.env.VITE_SITE_URL || window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;

      // abre o popup de sucesso
      setOpen(true);

      // inicia cooldown (aprox. 60s)
      setCooldown(60);
      const timer = setInterval(() => {
        setCooldown((s) => {
          if (s <= 1) clearInterval(timer);
          return Math.max(0, s - 1);
        });
      }, 1000);
    } catch (err) {
      // opcional: mostrar erro simples (sem popup)
      console.error(err);
      alert(err?.message || "Something went wrong. Please try again shortly.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
        {/* Label invisível para acessibilidade */}
        <label htmlFor="resend-email" className="sr-only">Email address</label>

        {/* INPUT — borda fina e discreta */}
        <input
          id="resend-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address used to sign up"
          required
          disabled={busy}
          className="
            h-9 w-full sm:w-[260px] rounded-md border border-gray-300
            bg-white px-3 text-sm
            placeholder:text-gray-400
            focus:outline-none focus:ring-2 focus:ring-[#4285F4] focus:border-[#4285F4]
            disabled:opacity-60
          "
        />

        {/* BUTTON — branco com borda em degradê; fica #4285F4 sólido ao clicar */}
        <button
          type="submit"
          disabled={busy || cooldown > 0}
          className="
            group relative inline-flex items-center justify-center
            rounded-md text-sm font-medium
            transition-colors focus:outline-none
            disabled:cursor-not-allowed disabled:opacity-60
          "
        >
          {/* “borda” em gradiente */}
          <span
            aria-hidden="true"
            className="
              absolute inset-0 rounded-md p-[1px]
              bg-gradient-to-r from-[#E935B8]/80 to-[#FFFFFF]
              opacity-90 group-hover:opacity-100
              transition-opacity
            "
          />
          {/* interior branco; fica sólido ao pressionar */}
          <span
            className="
              relative rounded-[6px] bg-white px-3 py-2
              group-active:bg-[#E935B8] group-active:text-white
              group-hover:bg--gradient-to-r from-[#E935B8]/80 to-[#FFFFFF]
              transition-colors
            "
          >
            {cooldown ? `Try again in ${cooldown}s` : busy ? "Sending…" : "Re-send confirmation"}
          </span>
        </button>
      </form>

      {/* POPUP de sucesso */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmation email re-sent</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Please check your inbox (and your junk folder).
          </p>
          <div className="mt-4 flex justify-end">
            <Button
              onClick={() => setOpen(false)}
              className="relative"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
