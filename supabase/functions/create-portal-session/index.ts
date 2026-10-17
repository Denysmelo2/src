import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Returns a Stripe Customer Portal URL for the calling user.
// They use this to update their card, change plans, or cancel.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    // Production by default: an unset, empty or non-https SITE_URL (e.g. a
    // leftover http://localhost:5173) must never send customers there.
    const envSite = Deno.env.get("SITE_URL") ?? "";
    const siteUrl = (/^https:\/\//.test(envSite) ? envSite : "https://snapgain.uk").replace(/\/+$/, "");
    if (!stripeKey) throw new Error("Stripe secret key is not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization") ?? "" },
        },
      }
    );
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: profile, error: profileErr } = await admin
      .from("user_profiles")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profileErr) throw profileErr;

    if (!profile?.stripe_customer_id) {
      return new Response(
        JSON.stringify({
          error:
            "We couldn't find a billing account for you yet. Choose a plan on the Pricing page to subscribe.",
          code: "no_customer",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${siteUrl}/settings`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-portal-session error", err);
    return new Response(
      JSON.stringify({
        error:
          "We couldn't open the billing portal right now. Please try again later or contact support.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
