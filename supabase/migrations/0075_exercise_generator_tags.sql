create table public.exercise_generator_tags (
  exercise_id uuid primary key references public.exercises(id) on delete cascade,
  pattern text not null check (pattern in ('squat','hinge','lunge','h_push','v_push','h_pull','v_pull',
    'chest_iso','shoulder_iso','biceps','triceps','legs_iso','calves','core')),
  kind text not null check (kind in ('compound','isolation')),
  equipment text not null check (equipment in ('gym','dumbbells','bodyweight')),
  stress text[] not null default '{}' check (stress <@ array['knee','shoulder','lower_back']::text[]
    and array_position(stress, null) is null),
  min_level text not null check (min_level in ('beginner','intermediate','advanced'))
);

-- A foreign key alone cannot enforce that the catalog row remains global.
create function security_private.check_generator_global() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.exercises where id = new.exercise_id and owner_id is null for share) then
    raise exception 'Generator exercises must be global' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger generator_global before insert or update on public.exercise_generator_tags
  for each row execute function security_private.check_generator_global();

create function security_private.keep_generator_global() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.owner_id is not null then
    -- Preserve existing catalog maintenance while keeping private exercises untagged.
    delete from public.exercise_generator_tags where exercise_id = new.id;
  end if;
  return new;
end;
$$;
create trigger keep_generator_global before update of owner_id on public.exercises
  for each row execute function security_private.keep_generator_global();

alter table public.exercise_generator_tags enable row level security;
revoke all on public.exercise_generator_tags from public, anon, authenticated;
grant select on public.exercise_generator_tags to authenticated;
create policy generator_read on public.exercise_generator_tags for select to authenticated using (true);
create policy active_caller on public.exercise_generator_tags as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));

-- Curated dataset ids from supabase/seed/source/exercises-gif.json. Equipment is
-- the minimum tier: unweighted exercises can still require a bench or pull-up bar.
-- Keep the seed available for catalog imports that happen after schema deployment.
create function security_private.generator_seed()
returns table(dataset_id text, pattern text, kind text, equipment text, stress text, min_level text)
language sql immutable set search_path = '' as $$ values
  ('3132','squat','compound','bodyweight','knee','beginner'),
  ('1685','squat','compound','bodyweight','knee,shoulder','beginner'),
  ('1686','squat','compound','bodyweight','knee,shoulder,lower_back','beginner'),
  -- Bilateral supported bridges avoid the axial load of deadlifts; unilateral variants retain back stress.
  ('3013','hinge','compound','bodyweight','','beginner'),
  ('3523','hinge','compound','bodyweight','','beginner'),
  ('3561','hinge','compound','bodyweight','lower_back','beginner'),
  ('3645','hinge','compound','bodyweight','lower_back','beginner'),
  ('3470','lunge','compound','bodyweight','knee','beginner'),
  ('1460','lunge','compound','bodyweight','knee','beginner'),
  ('2368','lunge','compound','bodyweight','knee','beginner'),
  ('0662','h_push','compound','bodyweight','shoulder','beginner'),
  ('3211','h_push','compound','bodyweight','shoulder','beginner'),
  ('0493','h_push','compound','bodyweight','shoulder','beginner'),
  ('0659','h_push','compound','bodyweight','shoulder','beginner'),
  ('0658','h_push','compound','bodyweight','shoulder','beginner'),
  ('3785','h_push','compound','bodyweight','shoulder','beginner'),
  ('0499','h_pull','compound','bodyweight','shoulder','beginner'),
  ('2300','h_pull','compound','bodyweight','shoulder','beginner'),
  ('3166','h_pull','compound','bodyweight','shoulder','beginner'),
  ('1326','v_pull','compound','bodyweight','shoulder','intermediate'),
  ('0652','v_pull','compound','bodyweight','shoulder','intermediate'),
  ('0253','v_pull','compound','bodyweight','shoulder','intermediate'),
  ('1770','biceps','isolation','bodyweight','','beginner'),
  ('1769','biceps','isolation','bodyweight','','beginner'),
  ('0139','biceps','compound','bodyweight','shoulder','intermediate'),
  ('1771','triceps','isolation','bodyweight','shoulder','beginner'),
  ('0816','triceps','isolation','bodyweight','shoulder','beginner'),
  ('0137','triceps','isolation','bodyweight','shoulder','beginner'),
  ('0795','legs_iso','isolation','bodyweight','','beginner'),
  ('0710','legs_iso','isolation','bodyweight','','beginner'),
  ('3667','legs_iso','isolation','bodyweight','','beginner'),
  ('1373','calves','isolation','bodyweight','','beginner'),
  ('1490','calves','isolation','bodyweight','','beginner'),
  ('1397','calves','isolation','bodyweight','','beginner'),
  ('0276','core','isolation','bodyweight','','beginner'),
  ('3544','core','isolation','bodyweight','shoulder','beginner'),
  ('0274','core','isolation','bodyweight','lower_back','beginner'),
  ('0006','core','isolation','bodyweight','','beginner'),
  ('0872','core','isolation','bodyweight','lower_back','beginner'),
  ('0262','core','isolation','bodyweight','lower_back','beginner'),
  ('0003','core','isolation','bodyweight','lower_back','beginner'),
  ('0001','core','isolation','bodyweight','lower_back','beginner'),
  ('0267','core','isolation','bodyweight','lower_back','beginner'),
  ('3202','core','isolation','bodyweight','lower_back','beginner'),
  ('0871','core','isolation','bodyweight','lower_back','beginner'),
  ('1760','squat','compound','dumbbells','knee,lower_back','beginner'),
  ('0413','squat','compound','dumbbells','knee,lower_back','beginner'),
  ('0291','squat','compound','dumbbells','knee,lower_back','beginner'),
  ('0300','hinge','compound','dumbbells','lower_back','beginner'),
  ('1459','hinge','compound','dumbbells','lower_back','beginner'),
  ('0432','hinge','compound','dumbbells','lower_back','intermediate'),
  ('0336','lunge','compound','dumbbells','knee','beginner'),
  ('0381','lunge','compound','dumbbells','knee','beginner'),
  ('0410','lunge','compound','dumbbells','knee','beginner'),
  ('0289','h_push','compound','dumbbells','shoulder','beginner'),
  ('0314','h_push','compound','dumbbells','shoulder','beginner'),
  ('0352','h_push','compound','dumbbells','shoulder','beginner'),
  ('0405','v_push','compound','dumbbells','shoulder','beginner'),
  ('0404','v_push','compound','dumbbells','shoulder','beginner'),
  ('0426','v_push','compound','dumbbells','shoulder,lower_back','beginner'),
  ('0293','h_pull','compound','dumbbells','shoulder,lower_back','beginner'),
  ('0292','h_pull','compound','dumbbells','shoulder,lower_back','beginner'),
  ('0327','h_pull','compound','dumbbells','shoulder','beginner'),
  ('0308','chest_iso','isolation','dumbbells','shoulder','beginner'),
  ('0319','chest_iso','isolation','dumbbells','shoulder','beginner'),
  ('0302','chest_iso','isolation','dumbbells','shoulder','beginner'),
  ('0334','shoulder_iso','isolation','dumbbells','shoulder','beginner'),
  ('0396','shoulder_iso','isolation','dumbbells','shoulder','beginner'),
  ('0310','shoulder_iso','isolation','dumbbells','shoulder','beginner'),
  ('0294','biceps','isolation','dumbbells','','beginner'),
  ('0313','biceps','isolation','dumbbells','','beginner'),
  ('0297','biceps','isolation','dumbbells','','beginner'),
  ('0333','triceps','isolation','dumbbells','shoulder','beginner'),
  ('0351','triceps','isolation','dumbbells','shoulder','beginner'),
  ('0430','triceps','isolation','dumbbells','shoulder','beginner'),
  ('0339','legs_iso','isolation','dumbbells','','beginner'),
  ('0409','calves','isolation','dumbbells','','beginner'),
  ('0417','calves','isolation','dumbbells','','beginner'),
  ('1379','calves','isolation','dumbbells','','beginner'),
  ('0407','core','isolation','dumbbells','lower_back','beginner'),
  ('0777','core','isolation','dumbbells','lower_back,shoulder','intermediate'),
  ('3548','core','compound','dumbbells','shoulder,lower_back','intermediate'),
  ('0043','squat','compound','gym','knee,lower_back','beginner'),
  ('0743','squat','compound','gym','knee,lower_back','beginner'),
  ('0770','squat','compound','gym','knee,lower_back','beginner'),
  ('0032','hinge','compound','gym','lower_back','intermediate'),
  ('0085','hinge','compound','gym','lower_back','intermediate'),
  ('0811','hinge','compound','gym','lower_back','beginner'),
  ('0054','lunge','compound','gym','knee,lower_back','intermediate'),
  ('0078','lunge','compound','gym','knee,lower_back','intermediate'),
  ('0768','lunge','compound','gym','knee,lower_back','beginner'),
  ('0025','h_push','compound','gym','shoulder','beginner'),
  ('0047','h_push','compound','gym','shoulder','beginner'),
  ('0577','h_push','compound','gym','shoulder','beginner'),
  ('0603','v_push','compound','gym','shoulder','beginner'),
  ('0219','v_push','compound','gym','shoulder','beginner'),
  ('0765','v_push','compound','gym','shoulder','beginner'),
  ('0180','h_pull','compound','gym','shoulder','beginner'),
  ('0861','h_pull','compound','gym','shoulder','beginner'),
  ('1350','h_pull','compound','gym','shoulder','beginner'),
  ('0198','v_pull','compound','gym','shoulder','beginner'),
  ('0150','v_pull','compound','gym','shoulder','beginner'),
  ('0245','v_pull','compound','gym','shoulder','beginner'),
  ('0596','chest_iso','isolation','gym','shoulder','beginner'),
  ('0188','chest_iso','isolation','gym','shoulder','beginner'),
  ('0227','chest_iso','isolation','gym','shoulder','beginner'),
  ('0178','shoulder_iso','isolation','gym','shoulder','beginner'),
  ('0584','shoulder_iso','isolation','gym','shoulder','beginner'),
  ('0215','shoulder_iso','isolation','gym','shoulder','beginner'),
  ('0031','biceps','isolation','gym','','beginner'),
  ('0868','biceps','isolation','gym','','beginner'),
  ('0575','biceps','isolation','gym','','beginner'),
  ('0201','triceps','isolation','gym','shoulder','beginner'),
  ('0200','triceps','isolation','gym','shoulder','beginner'),
  ('0241','triceps','isolation','gym','shoulder','beginner'),
  ('0586','legs_iso','isolation','gym','','beginner'),
  ('0599','legs_iso','isolation','gym','','beginner'),
  ('0582','legs_iso','isolation','gym','knee','beginner'),
  ('0594','calves','isolation','gym','','beginner'),
  ('0605','calves','isolation','gym','','beginner'),
  ('1375','calves','isolation','gym','','beginner'),
  ('0175','core','isolation','gym','lower_back','beginner'),
  ('0212','core','isolation','gym','lower_back','beginner'),
  ('1452','core','isolation','gym','lower_back','beginner'),
  ('0696','legs_iso','isolation','bodyweight','knee','intermediate'),
  ('0284','calves','isolation','bodyweight','','beginner')
$$;
revoke all on function security_private.generator_seed() from public, anon, authenticated;

insert into public.exercise_generator_tags (exercise_id, pattern, kind, equipment, stress, min_level)
select e.id, s.pattern, s.kind, s.equipment, string_to_array(s.stress, ','), s.min_level
from security_private.generator_seed() s
join public.exercises e on e.dataset_id = s.dataset_id and e.owner_id is null
on conflict (exercise_id) do nothing;

-- Catalog import needs to populate this read-only table without granting writes
-- to application roles. Only curated global dataset ids can reach this branch.
create function security_private.seed_imported_generator_tag() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.owner_id is null then
    insert into public.exercise_generator_tags (exercise_id, pattern, kind, equipment, stress, min_level)
    select new.id, s.pattern, s.kind, s.equipment, string_to_array(s.stress, ','), s.min_level
      from security_private.generator_seed() s where s.dataset_id = new.dataset_id
      on conflict (exercise_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function security_private.seed_imported_generator_tag() from public, anon, authenticated;
revoke all on function security_private.check_generator_global(), security_private.keep_generator_global()
  from public, anon, authenticated;
create trigger seed_imported_generator_tag after insert or update of dataset_id, owner_id on public.exercises
  for each row execute function security_private.seed_imported_generator_tag();
