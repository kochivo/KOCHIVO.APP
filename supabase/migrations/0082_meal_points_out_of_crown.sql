-- Meal checks remain lifetime awards until a trusted analysis receipt can qualify them for the crown.
create or replace function security_private.points_board(p_captain uuid,p_month date,p_extra public.points_log default null)
returns table(player_id uuid,monthly bigint,"position" bigint)
language sql stable security definer set search_path = '' as $$
  with ledger as (select * from public.points_log union all select (p_extra).* where (p_extra).id is not null)
  select c.player_id,coalesce(sum(l.points),0),row_number() over (
    order by coalesce(sum(l.points),0) desc,max(l.created_at) asc nulls last,c.player_id)
  from public.coach_clients c left join ledger l on l.player_id=c.player_id
    and l.captain_id=p_captain and l.status='counted' and l.kind<>'meal_check'
    and l.earned_on>=date_trunc('month',p_month)::date
    and l.earned_on<(date_trunc('month',p_month)+interval '1 month')::date
  where c.captain_id=p_captain and c.archived_at is null group by c.player_id;
$$;
