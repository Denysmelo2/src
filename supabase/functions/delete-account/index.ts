import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// delete-account — UK GDPR: the right of access (export) and the right
// to erasure (delete), for the calling user only.
//
// Deploy with verify_jwt = true. POST, Authorization: Bearer <user JWT>
//
//   { action: "export" }                  → 200, JSON of the user's rows
//   { action: "delete", confirm: "DELETE" } → 200 { deleted: true }
//                                           → 409 while a Stripe
//                                             subscription is live
//
// WHO. The user is whoever the bearer token resolves to through
// auth.getUser(token). There is no user id in the body to trust. A
// service-role key is not a user and is refused by getUser().
//
// DELETE. Refuses while user_profiles.subscription_status says Stripe
// may still bill (active, trialing, past_due, unpaid): the user cancels
// first through Manage subscription, so we never delete an account that
// Stripe keeps charging. Otherwise it removes the rows that have no
// foreign key to auth.users (users, user_subscriptions, email_signups by
// email), then calls auth.admin.deleteUser(), which cascades to every
// table keyed on auth.users (user_profiles, saved_strategies, user_cards,
// user_favourites, user_miles_programs, user_cashback_platforms,
// user_notification_prefs, user_preferences, recent_searches,
// signup_attributions, user_sessions, user_simulations, user_accounts,
// boost_digest_log). Migration 0022 must be applied first or deleting
// anyone who has reviewed a platform change fails on that foreign key.
//
// EXPORT. Reads with the service role but always filtered to the
// caller's own id (or own email for the two email-keyed tables).
// Internal identifiers (Stripe ids, row ids of user_profiles) are left
// out of the profile.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LIVE_SUBSCRIPTION = new Set(["active", "trialing", "past_due", "unpaid"]);

const PROFILE_COLUMNS =
  "user_id, email, phone, role, plan, subscription_status, trial_end, current_period_end, onboarding_done, last_alerts_seen_at, created_at, updated_at";

/** Tables keyed on user_id, exported whole for the caller's rows. */
const USER_TABLES = [
  "saved_strategies",
  "user_cards",
  "user_favourites",
  "user_miles_programs",
  "user_cashback_platforms",
  "user_notification_prefs",
  "user_preferences",
  "recent_searches",
  "signup_attributions",
  "user_sessions",
  "user_simulations",
  "boost_digest_log",
];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    console.error("delete-account: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing");
    return json({ error: "Server misconfigured" }, 500);
  }

  const token = (req.headers.get("Authorization") ?? "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  if (!token) return json({ error: "Not authenticated" }, 401);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (userErr || !user) return json({ error: "Not authenticated" }, 401);

  let body: { action?: string; confirm?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body must be JSON" }, 400);
  }

  // Exact match on the address as stored and lower-cased. Not ilike:
  // "_" is common in addresses and is a LIKE wildcard.
  const email = (user.email ?? "").trim();
  const emailVariants = [...new Set([email, email.toLowerCase()])];

  try {
    if (body.action === "export") {
      const out: Record<string, unknown> = {
        exported_at: new Date().toISOString(),
        account: {
          id: user.id,
          email: user.email ?? null,
          phone: user.phone || null,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at ?? null,
          providers: user.app_metadata?.providers ?? [user.app_metadata?.provider].filter(Boolean),
          user_metadata: user.user_metadata ?? {},
        },
      };
      const errors: Record<string, string> = {};

      const profile = await admin
        .from("user_profiles")
        .select(PROFILE_COLUMNS)
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile.error) errors.user_profiles = profile.error.message;
      out.user_profiles = profile.data ?? null;

      for (const table of USER_TABLES) {
        const res = await admin.from(table).select("*").eq("user_id", user.id);
        if (res.error) errors[table] = res.error.message;
        out[table] = res.data ?? [];
      }

      const users = await admin.from("users").select("*").eq("id", user.id);
      if (users.error) errors.users = users.error.message;
      out.users = users.data ?? [];

      const accounts = await admin.from("user_accounts").select("*").eq("id", user.id);
      if (accounts.error) errors.user_accounts = accounts.error.message;
      out.user_accounts = accounts.data ?? [];

      if (email) {
        const signups = await admin
          .from("email_signups")
          .select("email, source, utm_source, utm_medium, utm_campaign, utm_content, ref, created_at")
          .in("email", emailVariants);
        if (signups.error) errors.email_signups = signups.error.message;
        out.email_signups = signups.data ?? [];
      }

      if (Object.keys(errors).length) out._errors = errors;
      return json(out);
    }

    if (body.action === "delete") {
      if (body.confirm !== "DELETE") {
        return json({ error: 'Type DELETE to confirm.' }, 400);
      }

      const { data: profile, error: profileErr } = await admin
        .from("user_profiles")
        .select("subscription_status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profileErr) throw profileErr;

      const status = (profile?.subscription_status ?? "").toLowerCase();
      if (LIVE_SUBSCRIPTION.has(status)) {
        return json(
          {
            error: "subscription_active",
            message:
              "You still have a subscription. Cancel it under Manage subscription first. " +
              "Once it has ended you can delete your account here, or contact support if you need it sooner.",
            subscription_status: status,
          },
          409,
        );
      }

      // Rows with no foreign key to auth.users, so the cascade misses them.
      const cleanup = [
        admin.from("users").delete().eq("id", user.id),
        admin.from("email_signups").delete().eq("linked_user_id", user.id),
      ];
      if (email) {
        cleanup.push(admin.from("user_subscriptions").delete().in("email", emailVariants));
        cleanup.push(admin.from("email_signups").delete().in("email", emailVariants));
      }
      for (const res of await Promise.all(cleanup)) {
        if (res.error) throw res.error;
      }

      const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
      if (delErr) throw delErr;

      console.log("delete-account: deleted", user.id);
      return json({ deleted: true });
    }

    return json({ error: 'action must be "export" or "delete"' }, 400);
  } catch (err) {
    console.error("delete-account error", user.id, err);
    return json(
      { error: "Something went wrong and your account was not deleted. Please try again or contact support." },
      500,
    );
  }
});
