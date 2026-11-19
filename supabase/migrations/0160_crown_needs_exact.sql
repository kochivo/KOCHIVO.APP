begin;

create or replace function public.my_points() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_total int;
  v_mine record;
  v_captain uuid;
  v_today date;
  v_holder uuid;
  v_needs int;
begin
  perform public.require_active_caller();
  if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='player') then
    raise exception 'player required' using errcode='42501'; end if;
  select lifetime into v_total from public.player_points where player_id=auth.uid();
  v_captain:=public.my_captain_id();
  v_today:=public.user_today(v_captain);
  with board as materialized (select * from security_private.points_board(v_captain,v_today)),
  holder as (select player_id,monthly from board where done>=4 and adherence>0 order by position limit 1)
  select b.*,h.player_id as holder_id,h.monthly as top into v_mine
    from board b left join holder h on true where b.player_id=auth.uid();
  v_holder:=v_mine.holder_id;

  if v_holder=auth.uid() then
    v_needs:=0;
  elsif v_mine.player_id is null then
    v_needs:=4;
  elsif exists(select 1 from public.programs where captain_id=v_captain and player_id=auth.uid()
    and status='active' and not is_template) then
    -- The board caps rounded adherence at 100 and adds bonuses separately.
    select min(extra) into v_needs
    from generate_series(greatest(1,4-v_mine.done),v_mine.planned-v_mine.done) g(extra)
    where v_holder is null or
      least(100,round(100.0*(v_mine.done+extra)/v_mine.planned))
        + v_mine.monthly-v_mine.adherence > v_mine.top;
  end if;

  return jsonb_build_object('lifetime',coalesce(v_total,0),'tier',security_private.points_tier(coalesce(v_total,0)),
    'monthly',coalesce(v_mine.monthly,0),'month_position',v_mine.position,
    'adherence',coalesce(v_mine.adherence,0),'done',coalesce(v_mine.done,0),'planned',coalesce(v_mine.planned,8),
    'crown_needs_workouts',v_needs,'crown_gap',
    case when v_holder=auth.uid() then 0
      else greatest(1,coalesce(v_mine.top,0)+1-coalesce(v_mine.monthly,0)) end,
    'logs',coalesce((select jsonb_agg(to_jsonb(l) order by l.created_at desc,l.id desc) from
      (select * from public.points_log where player_id=auth.uid() order by created_at desc,id desc limit 10) l),'[]'::jsonb));
end $$;

commit;
