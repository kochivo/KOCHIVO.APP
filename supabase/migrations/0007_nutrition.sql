-- 0007 nutrition: food catalog, plans (template or assigned copy), smart swaps, meal logs.

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles (id) on delete cascade, -- null = global catalog
  name_ar text not null,
  name_en text,
  kcal_per_100g numeric(6, 1) not null check (kcal_per_100g >= 0),
  protein_per_100g numeric(5, 1) not null check (protein_per_100g >= 0),
  carbs_per_100g numeric(5, 1) not null check (carbs_per_100g >= 0),
  fat_per_100g numeric(5, 1) not null check (fat_per_100g >= 0),
  photo_path text,
  source text,
  created_at timestamptz not null default now()
);

create table public.nutrition_plans (
  id uuid primary key default gen_random_uuid(),
  captain_id uuid not null references public.profiles (id) on delete cascade,
  player_id uuid references public.profiles (id) on delete cascade,
  is_template boolean not null default false,
  source_template_id uuid references public.nutrition_plans (id) on delete set null,
  title text not null check (char_length(title) between 1 and 80),
  target_kcal smallint check (target_kcal between 800 and 8000),
  target_protein smallint,
  target_carbs smallint,
  target_fat smallint,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nutrition_plans_template_xor_player check (is_template = (player_id is null))
);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.nutrition_plans (id) on delete cascade,
  position smallint not null,
  name text not null check (char_length(name) between 1 and 40),
  unique (plan_id, position) deferrable initially deferred
);

create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals (id) on delete cascade,
  food_id uuid not null references public.foods (id),
  grams numeric(6, 1) not null check (grams > 0),
  position smallint not null
);

-- Allowed swaps; grams pre-computed at design time to match calories (lib/macros.ts equivalentGrams).
create table public.meal_item_alternatives (
  id uuid primary key default gen_random_uuid(),
  meal_item_id uuid not null references public.meal_items (id) on delete cascade,
  food_id uuid not null references public.foods (id),
  grams numeric(6, 1) not null check (grams > 0)
);

create table public.meal_logs (
  id uuid primary key, -- stableId(meal_id, log_date) on the device
  player_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  meal_id uuid references public.meals (id) on delete set null,
  log_date date not null,
  swaps jsonb not null default '{}',
  completed_at timestamptz,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);

create index meal_logs_player_date on public.meal_logs (player_id, log_date desc);

create trigger nutrition_plans_touch before update on public.nutrition_plans
  for each row execute function public.touch_updated_at();

create function public.can_edit_plan(p_plan uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.nutrition_plans where id = p_plan and captain_id = (select auth.uid()));
$$;

create function public.can_read_plan(p_plan uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.nutrition_plans p
    where p.id = p_plan
      and (p.captain_id = (select auth.uid())
           or (p.player_id = (select auth.uid()) and p.status = 'active' and public.player_can_read()))
  );
$$;

create function public.plan_of_meal(p_meal uuid)
returns uuid language sql stable security definer set search_path = ''
as $$ select plan_id from public.meals where id = p_meal; $$;

create function public.plan_of_item(p_item uuid)
returns uuid language sql stable security definer set search_path = ''
as $$ select m.plan_id from public.meal_items i join public.meals m on m.id = i.meal_id where i.id = p_item; $$;

alter table public.foods enable row level security;
alter table public.nutrition_plans enable row level security;
alter table public.meals enable row level security;
alter table public.meal_items enable row level security;
alter table public.meal_item_alternatives enable row level security;
alter table public.meal_logs enable row level security;
grant select, insert, update, delete on public.foods, public.nutrition_plans, public.meals,
  public.meal_items, public.meal_item_alternatives to authenticated;
grant select, insert, update on public.meal_logs to authenticated;

create policy foods_select on public.foods for select to authenticated
  using (owner_id is null or owner_id = (select auth.uid()) or owner_id = public.my_captain_id());
create policy foods_owner_write on public.foods for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy nutrition_plans_captain on public.nutrition_plans for all to authenticated
  using (captain_id = (select auth.uid()))
  with check (captain_id = (select auth.uid()) and (player_id is null or public.is_captain_of(player_id)));
create policy nutrition_plans_player_select on public.nutrition_plans for select to authenticated
  using (player_id = (select auth.uid()) and status = 'active' and public.player_can_read());

create policy meals_select on public.meals for select to authenticated using (public.can_read_plan(plan_id));
create policy meals_write on public.meals for all to authenticated
  using (public.can_edit_plan(plan_id)) with check (public.can_edit_plan(plan_id));

create policy meal_items_select on public.meal_items for select to authenticated
  using (public.can_read_plan(public.plan_of_meal(meal_id)));
create policy meal_items_write on public.meal_items for all to authenticated
  using (public.can_edit_plan(public.plan_of_meal(meal_id))) with check (public.can_edit_plan(public.plan_of_meal(meal_id)));

create policy meal_alts_select on public.meal_item_alternatives for select to authenticated
  using (public.can_read_plan(public.plan_of_item(meal_item_id)));
create policy meal_alts_write on public.meal_item_alternatives for all to authenticated
  using (public.can_edit_plan(public.plan_of_item(meal_item_id))) with check (public.can_edit_plan(public.plan_of_item(meal_item_id)));

create policy meal_logs_player_select on public.meal_logs for select to authenticated using (player_id = (select auth.uid()));
create policy meal_logs_player_insert on public.meal_logs for insert to authenticated
  with check (player_id = (select auth.uid()) and public.player_can_write());
create policy meal_logs_player_update on public.meal_logs for update to authenticated
  using (player_id = (select auth.uid())) with check (player_id = (select auth.uid()) and public.player_can_write());
create policy meal_logs_captain_select on public.meal_logs for select to authenticated using (public.is_captain_of(player_id));

create function public.sync_meal_logs(p_rows jsonb)
returns void language sql security invoker set search_path = ''
as $$
  insert into public.meal_logs (id, meal_id, log_date, swaps, completed_at, client_updated_at, deleted_at)
  select r.id, r.meal_id, r.log_date, coalesce(r.swaps, '{}'), r.completed_at, r.client_updated_at, r.deleted_at
  from jsonb_to_recordset(p_rows) as r(
    id uuid, meal_id uuid, log_date date, swaps jsonb, completed_at timestamptz,
    client_updated_at timestamptz, deleted_at timestamptz)
  on conflict (id) do update set
    swaps = excluded.swaps,
    completed_at = excluded.completed_at,
    client_updated_at = excluded.client_updated_at,
    deleted_at = excluded.deleted_at,
    server_updated_at = now()
  where public.meal_logs.client_updated_at < excluded.client_updated_at;
$$;

grant execute on function public.sync_meal_logs(jsonb) to authenticated;
