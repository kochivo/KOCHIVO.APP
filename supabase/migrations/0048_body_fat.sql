alter table public.check_ins
  add column body_fat_pct numeric(4,1) check (body_fat_pct between 3 and 60),
  add column photo_poses text[] not null default '{}',
  add constraint check_ins_photo_poses_valid check (
    (cardinality(photo_poses) = 0 or cardinality(photo_poses) = cardinality(photo_paths))
    and photo_poses <@ array['front', 'side', 'back']::text[]
    and array_position(photo_poses, null) is null
  );

-- Existing table grants, ownership policies and the review guard cover new columns.
