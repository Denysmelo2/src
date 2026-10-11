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
   Diagnosed 2026-10-10:
   - Cron is already `0 4 * * *`, but GitHub starts it 5–7 h late
     (runs begin 09:00–11:00 UTC). An exact 04:00 needs an external trigger
     (e.g. pg_cron → `workflow_dispatch` with a token kept in the vault).
   - Red every day since 2026-07-10 (last green: 2026-07-09). Failing every
     run: `topcashback`, `tc-giftcards`, `quidco-giftcards` — all need a
     logged-in session. Anonymously, the TC gift-card shop redirects to
     login and the Quidco one returns a Cloudflare challenge. Do not build
     anti-bot evasion.
   - Fresh daily: quidco (3,624), picodi, jamdoughnut, cheddar, Avios.
     TopCashback only ~330 of ~1,600 refresh. EverUp reports "ok" but has
     written nothing since 2026-07-06 (markup changed, harvest is 0).
     Rakuten has 0 active offers. TC and Quidco gift cards: last written
     2026-05-18.
   - Runs take ~90–110 min; on the Pro plan the private repo exhausts its
     Actions minutes at month end (2026-09-29/30 runs never started).
   - Job logs are not readable through this environment's GitHub proxy;
     check-run annotations are, so per-scraper errors/timings should be
     emitted as `::notice`/`::error` annotations.
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
