alter table public.profiles
  add column arabic_style text null
  constraint profiles_arabic_style_check check (arabic_style in ('egyptian', 'standard'));

comment on column public.profiles.arabic_style is 'NULL selects the Arabic style automatically from timezone and device preferences.';
grant update (arabic_style) on public.profiles to authenticated;
