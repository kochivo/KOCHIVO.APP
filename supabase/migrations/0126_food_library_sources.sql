-- Nullable provenance/nutrients preserve captain writes and existing catalog rows.
alter table public.foods
  add column diet_tags text[] not null default '{}' check
    (diet_tags <@ array['meat','poultry','fish','dairy','egg','plant']::text[]),
  add column region text not null default 'intl' check (region in ('eg','gulf','lev','na','intl')),
  add column fiber_per_100g numeric(5,1) check (fiber_per_100g >= 0),
  add column sugar_per_100g numeric(5,1) check (sugar_per_100g >= 0),
  add column sodium_mg_per_100g numeric(7,1) check (sodium_mg_per_100g >= 0),
  add column source_kind text check (source_kind in ('usda','recipe','proxy')),
  add column source_ref jsonb,
  add column state text check (state in ('raw','cooked'));
