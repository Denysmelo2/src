-- 0017 — switch off the curated strategy that routes through TopCashback
--
-- "Double-stack TopCashback + Quidco (~10%)" sent users to TopCashback,
-- which left the comparison on 16/10/2026 (0014). Switched off, not
-- deleted; set is_active back to true to restore.

update public.curated_strategies
   set is_active = false
 where id = 'd153812c-8fb0-41d0-ac6a-72de2207aa57';
