begin;

drop function public.review_points(uuid, boolean);

comment on column public.points_log.status is
  'pending means flagged by anti-cheat and not counted; cleared only by late sets. Historical counted and rejected decisions remain unchanged.';

commit;
