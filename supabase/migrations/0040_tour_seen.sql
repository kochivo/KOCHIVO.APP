alter table public.profiles add column tour_seen_at timestamptz;

-- Column grant only: profiles_update_self (0002) and active_caller_update still limit which row can change.
grant update (tour_seen_at) on public.profiles to authenticated;
