-- Food writes require both ownership and a captain profile. Keep active_caller intact.
drop policy foods_owner_write on public.foods;

create policy foods_owner_insert on public.foods for insert to authenticated
  with check (owner_id = (select auth.uid()) and exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'captain'
  ));
create policy foods_owner_update on public.foods for update to authenticated
  using (owner_id = (select auth.uid()) and exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'captain'
  ))
  with check (owner_id = (select auth.uid()) and exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'captain'
  ));
create policy foods_owner_delete on public.foods for delete to authenticated
  using (owner_id = (select auth.uid()) and exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'captain'
  ));
