-- 0030 — three big stores with a wrong display name
--
-- Cowork found "Travelodge - UK" on the Travelodge page
-- (docs/DECISAO_VALOR_PONTOS_2026-10-18.md, section 3, item 5). The same
-- check found two more of the biggest stores named after a page title
-- rather than the brand:
--   * travelodge: "Travelodge - UK"    → "Travelodge"
--   * argos:      "Argos.co.uk"        → "Argos"
--   * currys:     "Currys Partmaster"  → "Currys" (currys.co.uk;
--                 Partmaster is Currys' spare-parts site)
-- A fourth row, currys-gift-card-cashback-and-discounts-on-cheddar, is
-- already named "Currys", active and has no live offers: an empty shell
-- that would show as a second Currys in search. It is merged into
-- currys the same way as task 1 (merged_into set, is_active = false), so
-- the scraper's name lookup follows the hop to the real store.
-- The scrapers never overwrite an existing store's name (lib/upsert.js
-- only adds categories, a logo or a domain), so this stays.
-- Rollback: put the old names back; clear merged_into and set is_active
-- = true on the Cheddar row.

begin;

update public.stores s
   set name = v.name
  from (values
    ('travelodge', 'Travelodge'),
    ('argos',      'Argos'),
    ('currys',     'Currys')
  ) as v(slug, name)
 where s.slug = v.slug;

update public.stores
   set merged_into = (select id from public.stores where slug = 'currys'),
       is_active = false
 where slug = 'currys-gift-card-cashback-and-discounts-on-cheddar'
   and merged_into is null;

do $$
begin
  if (select count(*) from public.stores
       where (slug, name) in (('travelodge', 'Travelodge'), ('argos', 'Argos'), ('currys', 'Currys'))) <> 3 then
    raise exception 'expected the three stores renamed';
  end if;
  if exists (select 1 from public.stores
              where slug = 'currys-gift-card-cashback-and-discounts-on-cheddar'
                and (is_active or merged_into is null)) then
    raise exception 'the empty Cheddar Currys row is not merged';
  end if;
end $$;

commit;
