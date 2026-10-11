# Handoff — state of SnapGain on 2026-10-10

Written so that a new working session (after the repos move to the
`Denysmelo2` GitHub account) can pick up without the previous chat.
This repo is public: nothing here is a secret, and no secret belongs here.

## Where everything lives

| Piece | Where |
|---|---|
| Web app (this repo) | GitHub `snapgain/src` → moving to `Denysmelo2/src` |
| Ebook shop | GitHub `snapgain/snapgain-shop` → moving to `Denysmelo2/snapgain-shop` |
| Daily rate robot | GitHub `Denysmelo2/snapgain-scraper` (GitHub Actions, private) |
| Hosting | Vercel team `denys-projects-58b82b39`: project `snapgainuk` (snapgain.uk), project `snapgain-shop` (snapgain.shop) |
| Database, auth, Edge Functions, cron | Supabase project `ffowgyjdbgkphsflxybk` |

## Open work, in order

1. **PR #115** (`claude/codigos-calculadoras-ex4sc5`) is a draft waiting for
   the owner's "pode publicar". It carries: data-age labels on every route,
   the admin privilege lockdown (migrations 0007–0009, already applied to
   production), `/admin/rates` + the `rate-entry` Edge Function, the
   white-screen fix (f2f4dcc) and the post-login `/pricing` redirect fix
   (febb11b). The PR body still lacks sections for f2f4dcc, febb11b, ca77500.
2. **Daily robot (`Denysmelo2/snapgain-scraper`, workflow `daily-scrape`)**.
   Owner approved items 1–4 of the proposal on 2026-10-10. Done in
   Denysmelo2/snapgain-scraper#31 and Denysmelo2/src#116 (both drafts,
   waiting for "pode publicar"):
   - **Exact 04:00 UTC**: pg_cron job `daily-scrape-dispatch` (jobid 7,
     migration 0010, applied) calls `workflow_dispatch` at 04:00. It is
     inert until the owner stores a fine-grained GitHub token (only
     "Actions: read and write" on snapgain-scraper) as Vault secret
     `github_dispatch_token`. Do that only after #31 is merged; the
     GitHub `schedule` stays as a fallback that skips itself when a
     dispatched run already started that day.
   - **EverUp fixed**: `everup.uk/gift-card-deals` redirects to
     `www.everup.com/brands` since ~2026-07-06. The scraper now reads the
     RSC payload over plain HTTP (`cashback_perc`). Test run from the
     branch on 2026-10-10 wrote 327 offers; 18 old ones were retired.
   - **Shorter run** (was ~90 min: Picodi ~42, Quidco ~24, Avios ~10,
     TC ~7): Picodi revisits known merchants Mon–Sat, full pass Sunday;
     rakuten, tc-giftcards and quidco-giftcards are out of the default
     list (still runnable by hand). Each scraper emits a `::notice` /
     `::error` annotation with its duration.
   - **Offers older than 30 days hidden** on the site (`hiddenBeforeIso`
     in `src/lib/dataFreshness.js`); rows are kept, `/admin/rates` still
     shows them.
   - **Member scrape at 21:00 UK** (owner's call, 2026-10-11): topcashback,
     tc-giftcards and quidco-giftcards left the 04:00 list and run in
     `scrape-member.yml` through the real Chrome on Bárbara's Mac
     (Tailscale + CDP), logged in by hand with accounts created only for
     SnapGain. pg_cron `member-scrape-dispatch` (jobid 8, migration 0011)
     fires at 21:00 Europe/London with the same Vault token. In
     real-Chrome mode the scrapers never move cookies or type passwords;
     if the Mac does not answer, the run fails and scrapes nothing.
   Do not build anti-bot evasion.
   Job logs are not readable through this environment's GitHub proxy;
   check-run annotations are. `source-probe` (v6) is how pages that this
   environment cannot reach get inspected; call it from SQL with
   `net.http_post` and read `net._http_response`.
3. **EverUp and Airtime**: no public data. The owner is emailing both
   companies for a feed. Until then their rates are kept by hand in
   `/admin/rates`.
4. **Key rotation**: the legacy `service_role` JWT must be rotated/disabled.
   The scraper and the vault already use the new `sb_secret_…` key. Before
   disabling the legacy key, check whether any Edge Function still reads
   `SUPABASE_SERVICE_ROLE_KEY` with the legacy value. Right after any rotation,
   update vault secret `service_role_key`, or the 05:00 UTC
   `jamdoughnut-sync-daily` cron fails.
5. **`nx-network-sync`**: do not run or schedule it until store matching is
   fixed (68 store pairs differ only by a trailing " UK").
6. Delete the `source-probe` Edge Function once the robot work no longer
   needs it.

## Rules the owner has set

- Never put a key, token or password in chat, code or docs. Never ask the
  owner to paste one.
- Do not copy another comparison site's data (e.g. Scrimpr) without a licence.
- Do not name partner platforms in public marketing copy.
- Confirm before anything outward or hard to undo (publishing, transfers,
  deleting, rotating keys).
- Admin is `user_profiles.role = 'admin'`, set server-side only. Never read
  admin from `user_metadata`.

## Working with the owner

Write to him in Portuguese. For any step only he can do, give it one action at
a time: where to click, what he should see, and what to do if he sees
something else. Batch questions into one message; he pays per round trip.
