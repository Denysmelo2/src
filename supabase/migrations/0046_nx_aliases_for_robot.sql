-- 0046: the NX robot reads ops.nx_aliases (handover 21/11/2026, task 3).
--
-- The NX robot (snapgain-scraper, scrapers/nx.js) matches each NX name to
-- a SnapGain store. Where the names differ, ops.nx_aliases says which
-- store an NX name is. Until now the robot had its own copy of the 3 rows
-- of 23/10 in the code, so a row the Cowork added never reached it. The
-- ops schema is not exposed to the API, so the robot reads the table
-- through this function, for the service role only (same as
-- public.source_freshness in 0040).
--
-- Order: apply this migration, then merge the snapgain-scraper PR. If the
-- robot runs before it is applied, it says so in the run and uses its 3
-- built-in rows, as before.

create or replace function public.nx_aliases()
returns table (nx_name text, store_slug text)
language sql
stable
security definer
set search_path = ''
as $$
  select a.nx_name, a.store_slug
    from ops.nx_aliases a;
$$;

revoke execute on function public.nx_aliases() from public, anon, authenticated;
grant execute on function public.nx_aliases() to service_role;

-- NX names from the 21/11 list that are an existing SnapGain store under
-- another name. Checked by hand against the store names (Claude Code,
-- 21/11); the Cowork reviews them before applying and adds the rest. A
-- store that already has an alias keeps it (store_slug is the key).
-- No store is created here.
insert into ops.nx_aliases (store_slug, nx_name)
select v.store_slug, v.nx_name
  from (values
    ('advanced-mp3-players', 'Advanced MP3 Player'),
    ('bluecrest-wellness', 'Bluecrest'),
    ('chapelle-jewellery', 'Chapelle'),
    ('chargrilled', 'Chargrilled t-shirts'),
    ('clothing-management', 'Clothing Management Consultants Limited'),
    ('earths-secret', 'Earths Secrets'),
    ('english-heritage-memberships', 'English Heritage Membership'),
    ('evri', 'Evri – The new Hermes'),
    ('fanatical', 'Fanatical Global'),
    ('hello-of-mayfair', 'Hello of Mayfair Furniture'),
    ('iscooter', 'iscooterglobal'),
    ('laithwaites-wine', 'Laithwaites'),
    ('lavish-alice', 'Lavish Alice Retail Ltd'),
    ('monopoly-lifesized', 'Monopoly Lifesized - London'),
    ('morrisons', 'Morrisons Grocery'),
    ('oliver-sweeney', 'Oliver Sweeney Trading Limited'),
    ('regus', 'Regus Global'),
    ('skinners', 'Skinners.cc'),
    ('slaters-menswear', 'Slaters'),
    ('townhouse-blanket-co', 'Townhouse Blankets'),
    ('walk-london', 'Walk London Shoes'),
    ('waterdrop', 'Waterdropfilter'),
    ('zello', 'Zello Sleep'),
    ('predator4x4', '4x4 Predator'),
    ('aeg-appliances', 'AEG Home Appliances'),
    ('amulet', 'Get Amulet'),
    ('dyu', 'DYU Ebike'),
    ('uk-meet-and-greet-airport-parking', 'Ukmeetandgreet.com'),
    ('zooki', 'YourZooki'),
    ('joy-the-store', 'JOY')
  ) as v (store_slug, nx_name)
  -- only stores that exist and that the site shows
  join public.stores s on s.slug = v.store_slug and s.merged_into is null and s.excluded_at is null
on conflict (store_slug) do nothing;
