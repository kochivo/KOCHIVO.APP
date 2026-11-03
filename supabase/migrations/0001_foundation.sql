-- 0001 foundation: shared types and trigger helpers.
-- Convention for every migration: RLS on for every table, explicit grants to `authenticated`,
-- nothing granted to `anon`, functions pin `search_path = ''` and fully qualify names.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create type public.user_role as enum ('captain', 'player');
create type public.captain_plan as enum ('free', 'pro');
create type public.content_status as enum ('draft', 'active', 'archived');

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
